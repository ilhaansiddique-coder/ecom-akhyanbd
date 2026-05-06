import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";

// FlaggedOrder list for the mobile fraud screen.
// Risk threshold mirrors the dashboard "flagged" definition (riskScore >= 70).
// We pull each order's OrderFingerprint for ip + fpHash, then group-count
// orders sharing the same fpHash to surface "fpSeenCount" — how many other
// orders this device has placed.
export const GET = withAdmin(async (request) => {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 20));

  const where: Prisma.OrderWhereInput = { riskScore: { gte: 70 } };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        total: true,
        status: true,
        riskScore: true,
        fpHash: true,
        createdAt: true,
        fingerprint: {
          select: {
            ipAddress: true,
            riskFlags: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  // fpSeenCount: count orders sharing each fpHash, batched in one groupBy.
  const fpHashes = Array.from(
    new Set(orders.map((o) => o.fpHash).filter((h): h is string => !!h)),
  );
  const fpCounts = fpHashes.length
    ? await prisma.order.groupBy({
        by: ["fpHash"],
        where: { fpHash: { in: fpHashes } },
        _count: { fpHash: true },
      })
    : [];
  const fpCountMap = new Map<string, number>();
  for (const row of fpCounts) {
    if (row.fpHash) fpCountMap.set(row.fpHash, row._count.fpHash);
  }

  const data = orders.map((o) => {
    // riskFlags is stored as a comma-separated string on OrderFingerprint;
    // first token is the highest-priority reason. Falls back to a generic
    // marker so the mobile UI always has something to render.
    let reason = "high_risk_score";
    const rf = o.fingerprint?.riskFlags;
    if (rf && typeof rf === "string" && rf.trim()) {
      reason = rf.split(",")[0]?.trim() || reason;
    }

    return {
      id: o.id,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      total: o.total,
      status: o.status,
      riskScore: o.riskScore ?? 0,
      ip: o.fingerprint?.ipAddress ?? null,
      fpSeenCount: o.fpHash ? fpCountMap.get(o.fpHash) ?? null : null,
      reason,
      createdAt: o.createdAt?.toISOString() ?? null,
    };
  });

  return jsonResponse({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
});
