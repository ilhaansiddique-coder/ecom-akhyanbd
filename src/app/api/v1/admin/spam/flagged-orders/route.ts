import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";

export const GET = withStaff(async (request) => {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = 20;
  const minScore = Number(sp.get("minScore")) || 30;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { riskScore: { gte: minScore } },
      orderBy: { riskScore: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, customerName: true, customerPhone: true,
        customerAddress: true, city: true, total: true,
        status: true, paymentMethod: true, fpHash: true,
        riskScore: true, createdAt: true,
        fingerprint: {
          select: {
            riskFlags: true, fillDurationMs: true,
            mouseMovements: true, pasteDetected: true,
            honeypotTriggered: true, ipAddress: true,
            deviceFingerprint: {
              select: { id: true, fpHash: true, platform: true, screenResolution: true, status: true },
            },
          },
        },
      },
    }),
    prisma.order.count({ where: { riskScore: { gte: minScore } } }),
  ]);

  return jsonResponse({
    data: orders.map(serialize),
    meta: { page, per_page: perPage, total, last_page: Math.ceil(total / perPage) },
  });
});
