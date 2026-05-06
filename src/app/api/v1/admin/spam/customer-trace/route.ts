/**
 * GET /api/v1/admin/spam/customer-trace?phone=01XXXXXXXXX
 *
 * Full per-customer dossier for the spam page drawer. Returns:
 *   - Every order ever placed under this phone
 *   - Every IP seen across those orders (with first/last seen)
 *   - Every device fingerprint seen (with browser/screen if available)
 *   - Block status across all 3 dimensions (phone / each IP / each device)
 *   - Risk-flag breakdown
 *
 * Used by the spam page when admin clicks a customer row to drill in,
 * and as the data source for the "Block all" button.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { normalizePhone } from "@/lib/spamDetection";

export const GET = withStaff(async (request) => {
  const phoneRaw = request.nextUrl.searchParams.get("phone") || "";
  const phone = normalizePhone(phoneRaw);
  if (!phone) return errorResponse("phone required", 400);

  const orders = await prisma.order.findMany({
    where: { customerPhone: phone },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      customerAddress: true,
      city: true,
      total: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      riskScore: true,
      courierSent: true,
      consignmentId: true,
      courierStatus: true,
      createdAt: true,
      fingerprint: {
        select: {
          fpHash: true,
          ipAddress: true,
          riskFlags: true,
          fillDurationMs: true,
          mouseMovements: true,
          pasteDetected: true,
          honeypotTriggered: true,
        },
      },
    },
  });

  // Aggregate IPs + devices with first/last seen
  type IpAgg = { ip: string; firstSeen: Date; lastSeen: Date; orderCount: number };
  type DevAgg = {
    fpHash: string;
    firstSeen: Date;
    lastSeen: Date;
    orderCount: number;
    platform: string | null;
    userAgent: string | null;
    screen: string | null;
    seenCount: number;
    riskScore: number;
  };
  const ipMap = new Map<string, IpAgg>();
  const devSetIds = new Set<string>();
  for (const o of orders) {
    if (o.fingerprint?.ipAddress) {
      const ip = o.fingerprint.ipAddress;
      const existing = ipMap.get(ip);
      const ts = o.createdAt || new Date();
      if (existing) {
        existing.orderCount++;
        if (ts < existing.firstSeen) existing.firstSeen = ts;
        if (ts > existing.lastSeen) existing.lastSeen = ts;
      } else {
        ipMap.set(ip, { ip, firstSeen: ts, lastSeen: ts, orderCount: 1 });
      }
    }
    if (o.fingerprint?.fpHash) devSetIds.add(o.fingerprint.fpHash);
  }

  // Look up device details + block status in one shot.
  const devRows = devSetIds.size
    ? await prisma.deviceFingerprint.findMany({
        where: { fpHash: { in: Array.from(devSetIds) } },
        select: {
          fpHash: true,
          platform: true,
          userAgent: true,
          screenResolution: true,
          seenCount: true,
          riskScore: true,
          status: true,
          blockReason: true,
          createdAt: true,
          lastSeenAt: true,
        },
      })
    : [];
  const devMap = new Map(devRows.map((d) => [d.fpHash, d]));

  const devices: DevAgg[] = Array.from(devSetIds).map((fpHash) => {
    const d = devMap.get(fpHash);
    return {
      fpHash,
      firstSeen: d?.createdAt || new Date(),
      lastSeen: d?.lastSeenAt || new Date(),
      orderCount: orders.filter((o) => o.fingerprint?.fpHash === fpHash).length,
      platform: d?.platform || null,
      userAgent: d?.userAgent || null,
      screen: d?.screenResolution || null,
      seenCount: d?.seenCount || 0,
      riskScore: d?.riskScore || 0,
    };
  });

  // Block status lookups
  const ips = Array.from(ipMap.keys());
  const [phoneBlock, blockedIps, blockedDevices] = await Promise.all([
    prisma.blockedPhone.findUnique({ where: { phone }, select: { reason: true, createdAt: true } }),
    ips.length ? prisma.blockedIp.findMany({ where: { ipAddress: { in: ips } }, select: { ipAddress: true, reason: true } }) : Promise.resolve([]),
    devSetIds.size ? prisma.deviceFingerprint.findMany({ where: { fpHash: { in: Array.from(devSetIds) }, status: "blocked" }, select: { fpHash: true, blockReason: true } }) : Promise.resolve([]),
  ]);
  const blockedIpSet = new Map(blockedIps.map((b) => [b.ipAddress, b.reason || "blocked"]));
  const blockedDevSet = new Map(blockedDevices.map((b) => [b.fpHash, b.blockReason || "blocked"]));

  return jsonResponse({
    phone,
    summary: {
      totalOrders: orders.length,
      cancelledOrders: orders.filter((o) => o.status === "cancelled").length,
      fakeOrders: orders.filter((o) => o.status === "trashed").length,
      totalRevenue: orders.reduce((s, o) => s + (Number(o.total) || 0), 0),
      uniqueIps: ipMap.size,
      uniqueDevices: devSetIds.size,
      maxRisk: orders.reduce((m, o) => Math.max(m, o.riskScore || 0), 0),
      blocked: !!phoneBlock,
      blockedReason: phoneBlock?.reason || null,
    },
    orders: orders.map((o) => ({
      id: o.id,
      customer_name: o.customerName,
      customer_email: o.customerEmail,
      customer_phone: o.customerPhone,
      customer_address: o.customerAddress,
      city: o.city,
      total: Number(o.total),
      status: o.status,
      payment_method: o.paymentMethod,
      payment_status: o.paymentStatus,
      risk_score: o.riskScore,
      courier_sent: o.courierSent,
      consignment_id: o.consignmentId,
      courier_status: o.courierStatus,
      created_at: o.createdAt?.toISOString() ?? null,
      fingerprint: o.fingerprint
        ? {
            fp_hash: o.fingerprint.fpHash,
            ip_address: o.fingerprint.ipAddress,
            risk_flags: o.fingerprint.riskFlags,
            fill_duration_ms: o.fingerprint.fillDurationMs,
            mouse_movements: o.fingerprint.mouseMovements,
            paste_detected: o.fingerprint.pasteDetected,
            honeypot_triggered: o.fingerprint.honeypotTriggered,
          }
        : null,
    })),
    ips: Array.from(ipMap.values()).map((x) => ({
      ip: x.ip,
      first_seen: x.firstSeen.toISOString(),
      last_seen: x.lastSeen.toISOString(),
      order_count: x.orderCount,
      blocked: blockedIpSet.has(x.ip),
      blocked_reason: blockedIpSet.get(x.ip) || null,
    })),
    devices: devices.map((x) => ({
      fp_hash: x.fpHash,
      first_seen: x.firstSeen.toISOString(),
      last_seen: x.lastSeen.toISOString(),
      order_count: x.orderCount,
      platform: x.platform,
      user_agent: x.userAgent,
      screen: x.screen,
      seen_count: x.seenCount,
      risk_score: x.riskScore,
      blocked: blockedDevSet.has(x.fpHash),
      blocked_reason: blockedDevSet.get(x.fpHash) || null,
    })),
  });
});
