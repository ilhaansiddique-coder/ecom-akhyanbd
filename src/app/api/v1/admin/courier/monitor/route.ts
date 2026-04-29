import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-helpers";
import { jsonResponse, errorResponse } from "@/lib/api-response";

/** Parse YYYY-MM-DD (BD, UTC+6) → UTC Date at BD midnight */
function bdMidnightUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 6 * 60 * 60 * 1000);
}

// Canonical courier status sets — used for both groupBy aggregation and filtering.
// Stored values come from the raw Steadfast / Pathao API responses.
const DELIVERED  = new Set(["Delivered", "delivered", "Partial Delivered"]);
const RETURNED   = new Set([
  "Returned", "returned", "Partial Returned", "Partially Returned",
  "Cancelled", "cancelled", "Return In Progress", "Return Pending",
  "Partially Returned", "refused", "Refused",
]);
const IN_TRANSIT = new Set([
  "In Transit", "in_transit", "Pickup Completed",
  "Delivery In Progress", "on_the_way",
]);
// Everything else (null, "Pending", "At Warehouse", "In Review", etc.) → pending

export async function GET(request: NextRequest) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  try {
    const { searchParams } = request.nextUrl;
    const fromParam    = searchParams.get("from");
    const toParam      = searchParams.get("to");
    const courierParam = searchParams.get("courier") || "all";
    const statusParam  = searchParams.get("status")  || "all";
    const search       = (searchParams.get("q") || "").trim();
    const page         = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const LIMIT        = 100;
    const skip         = (page - 1) * LIMIT;

    // ── Build date filter (shared by both main query and stats query) ──────
    let dateFilter: { gte?: Date; lt?: Date } | undefined;
    if (fromParam || toParam) {
      dateFilter = {};
      if (fromParam) dateFilter.gte = bdMidnightUtc(fromParam);
      if (toParam) {
        const [y, m, d] = toParam.split("-").map(Number);
        dateFilter.lt = new Date(Date.UTC(y, m - 1, d + 1) - 6 * 60 * 60 * 1000);
      }
    }

    // ── Main query — AND clauses so search + status + date compose cleanly ─
    const and: object[] = [
      { courierSent: true },
      { consignmentId: { not: null } },
    ];

    if (dateFilter)            and.push({ courierSentAt: dateFilter });
    if (courierParam !== "all") and.push({ courierType: courierParam });

    // Status filter maps UI group → raw courier status strings
    if (statusParam === "delivered") {
      and.push({ courierStatus: { in: [...DELIVERED] } });
    } else if (statusParam === "in_transit") {
      and.push({ courierStatus: { in: [...IN_TRANSIT] } });
    } else if (statusParam === "returned") {
      and.push({ courierStatus: { in: [...RETURNED] } });
    } else if (statusParam === "pending") {
      // null + anything not in the other three sets
      and.push({
        OR: [
          { courierStatus: null },
          { NOT: { courierStatus: { in: [...DELIVERED, ...RETURNED, ...IN_TRANSIT] } } },
        ],
      });
    }

    if (search) {
      and.push({
        OR: [
          { customerName:    { contains: search, mode: "insensitive" } },
          { customerPhone:   { contains: search } },
          { consignmentId:   { contains: search } },
        ],
      });
    }

    const where = { AND: and };

    // ── Stats query — respects date + courier filter, ignores status/search ─
    // This way the cards always show the full breakdown even when drilling down.
    const statsAnd: object[] = [
      { courierSent: true },
      { consignmentId: { not: null } },
    ];
    if (dateFilter)            statsAnd.push({ courierSentAt: dateFilter });
    if (courierParam !== "all") statsAnd.push({ courierType: courierParam });
    const statsWhere = { AND: statsAnd };

    const [parcels, total, statusGroups] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: LIMIT,
        orderBy: { courierSentAt: "desc" },
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          customerAddress: true,
          city: true,
          total: true,
          status: true,
          courierType: true,
          consignmentId: true,
          courierStatus: true,
          courierScore: true,
          courierSentAt: true,
          createdAt: true,
          items: {
            select: { productName: true, quantity: true, variantLabel: true },
          },
        },
      }),
      prisma.order.count({ where }),
      prisma.order.groupBy({
        by: ["courierStatus"],
        _count: { id: true },
        where: statsWhere,
      }),
    ]);

    // ── Aggregate status counts ───────────────────────────────────────────
    let delivered = 0, returned = 0, inTransit = 0, pending = 0;
    for (const g of statusGroups) {
      const s = g.courierStatus;
      const n = g._count.id;
      if (s && DELIVERED.has(s))  delivered  += n;
      else if (s && RETURNED.has(s))   returned   += n;
      else if (s && IN_TRANSIT.has(s)) inTransit  += n;
      else                             pending    += n;
    }

    return jsonResponse({
      parcels: parcels.map((p) => ({
        id:              p.id,
        customerName:    p.customerName,
        customerPhone:   p.customerPhone,
        customerAddress: p.customerAddress,
        city:            p.city,
        total:           Number(p.total),
        status:          p.status,
        courierType:     p.courierType,
        consignmentId:   p.consignmentId,
        courierStatus:   p.courierStatus,
        courierScore:    p.courierScore,
        courierSentAt:   p.courierSentAt?.toISOString() ?? null,
        createdAt:       p.createdAt?.toISOString() ?? null,
        items: p.items.map((i) => ({
          productName:  i.productName,
          quantity:     i.quantity,
          variantLabel: i.variantLabel ?? null,
        })),
      })),
      total,
      page,
      limit: LIMIT,
      stats: { total: delivered + returned + inTransit + pending, delivered, returned, inTransit, pending },
    });
  } catch (error) {
    console.error("Courier monitor error:", error);
    return errorResponse("Failed to fetch courier data", 500);
  }
}
