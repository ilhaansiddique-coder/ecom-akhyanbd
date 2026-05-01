/**
 * GET /api/v1/admin/spam/customers
 *
 * Customer-centric aggregate for the spam page. One row per phone, with
 * counts/risk pulled from joins so admin can sort and triage at a glance.
 *
 * Query params:
 *   q          — fuzzy search (phone substring, name, email)
 *   sort       — risk | cancelled | orders | recent (default: risk)
 *   filter     — blocked | high_risk | none (default: none)
 *   page       — 1-indexed
 *
 * Returns:
 *   {
 *     items: [{
 *       phone, names[], emails[], totalOrders, cancelledOrders,
 *       firstOrderAt, lastOrderAt, ipCount, deviceCount, avgRisk,
 *       maxRisk, blocked, blockedReason
 *     }],
 *     total
 *   }
 *
 * NOTE: aggregation runs in JS after a single phone-grouped query rather
 * than via Prisma `groupBy` because we need related-table counts (IPs,
 * devices via OrderFingerprint) which groupBy can't express in one shot.
 * Cap = 1000 distinct phones per page-1 call to bound memory; pagination
 * slices in JS.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";

const PER_PAGE = 25;
const SCAN_CAP = 2000; // last 2000 orders → derive phones

export async function GET(request: NextRequest) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const sort = (sp.get("sort") || "risk") as "risk" | "cancelled" | "orders" | "recent";
  const filter = (sp.get("filter") || "none") as "blocked" | "high_risk" | "none";
  const page = Math.max(1, Number(sp.get("page")) || 1);

  // Pull a wide slice of recent orders. We aggregate per-phone after.
  const orderWhere: Record<string, unknown> = {};
  if (q) {
    orderWhere.OR = [
      { customerPhone: { contains: q } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
    ];
  }
  const orders = await prisma.order.findMany({
    where: orderWhere,
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      status: true,
      total: true,
      riskScore: true,
      createdAt: true,
      fingerprint: { select: { fpHash: true, ipAddress: true } },
    },
    orderBy: { createdAt: "desc" },
    take: SCAN_CAP,
  });

  // Phone-keyed aggregator
  type Agg = {
    phone: string;
    names: Set<string>;
    emails: Set<string>;
    ips: Set<string>;
    devices: Set<string>;
    totalOrders: number;
    cancelledOrders: number;
    fakeOrders: number;
    totalRevenue: number;
    riskSum: number;
    riskCount: number;
    maxRisk: number;
    firstOrderAt: Date;
    lastOrderAt: Date;
    orderIds: number[];
  };
  const map = new Map<string, Agg>();
  for (const o of orders) {
    const phone = o.customerPhone;
    if (!phone) continue;
    let agg = map.get(phone);
    if (!agg) {
      agg = {
        phone,
        names: new Set(),
        emails: new Set(),
        ips: new Set(),
        devices: new Set(),
        totalOrders: 0,
        cancelledOrders: 0,
        fakeOrders: 0,
        totalRevenue: 0,
        riskSum: 0,
        riskCount: 0,
        maxRisk: 0,
        firstOrderAt: o.createdAt ?? new Date(),
        lastOrderAt: o.createdAt ?? new Date(),
        orderIds: [],
      };
      map.set(phone, agg);
    }
    if (o.customerName) agg.names.add(o.customerName);
    if (o.customerEmail) agg.emails.add(o.customerEmail);
    if (o.fingerprint?.ipAddress) agg.ips.add(o.fingerprint.ipAddress);
    if (o.fingerprint?.fpHash) agg.devices.add(o.fingerprint.fpHash);
    agg.totalOrders++;
    if (o.status === "cancelled") agg.cancelledOrders++;
    if (o.status === "trashed") agg.fakeOrders++;
    agg.totalRevenue += Number(o.total) || 0;
    if (o.riskScore != null) {
      agg.riskSum += o.riskScore;
      agg.riskCount++;
      if (o.riskScore > agg.maxRisk) agg.maxRisk = o.riskScore;
    }
    if (o.createdAt && o.createdAt < agg.firstOrderAt) agg.firstOrderAt = o.createdAt;
    if (o.createdAt && o.createdAt > agg.lastOrderAt) agg.lastOrderAt = o.createdAt;
    agg.orderIds.push(o.id);
  }

  // Pull blocked-phone status for all phones we collected (single round trip).
  const phones = Array.from(map.keys());
  const blockedRows = phones.length
    ? await prisma.blockedPhone.findMany({ where: { phone: { in: phones } }, select: { phone: true, reason: true } })
    : [];
  const blockedMap = new Map(blockedRows.map((b) => [b.phone, b.reason || "blocked"]));

  // Build flat list, apply filter + sort
  let items = Array.from(map.values()).map((a) => ({
    phone: a.phone,
    names: Array.from(a.names),
    emails: Array.from(a.emails),
    totalOrders: a.totalOrders,
    cancelledOrders: a.cancelledOrders,
    fakeOrders: a.fakeOrders,
    totalRevenue: a.totalRevenue,
    avgRisk: a.riskCount > 0 ? Math.round(a.riskSum / a.riskCount) : 0,
    maxRisk: a.maxRisk,
    ipCount: a.ips.size,
    deviceCount: a.devices.size,
    firstOrderAt: a.firstOrderAt.toISOString(),
    lastOrderAt: a.lastOrderAt.toISOString(),
    blocked: blockedMap.has(a.phone),
    blockedReason: blockedMap.get(a.phone) || null,
    cancelRate: a.totalOrders > 0 ? Math.round((a.cancelledOrders / a.totalOrders) * 100) : 0,
  }));

  if (filter === "blocked") items = items.filter((x) => x.blocked);
  if (filter === "high_risk") items = items.filter((x) => x.avgRisk >= 30 || x.maxRisk >= 50 || x.cancelledOrders >= 2);

  items.sort((a, b) => {
    if (sort === "cancelled") return b.cancelledOrders - a.cancelledOrders || b.maxRisk - a.maxRisk;
    if (sort === "orders") return b.totalOrders - a.totalOrders;
    if (sort === "recent") return new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime();
    // risk (default): max risk first, then cancellations
    return b.maxRisk - a.maxRisk || b.cancelledOrders - a.cancelledOrders;
  });

  const total = items.length;
  const start = (page - 1) * PER_PAGE;
  const pageItems = items.slice(start, start + PER_PAGE);

  return jsonResponse({ items: pageItems, total, page, perPage: PER_PAGE });
}
