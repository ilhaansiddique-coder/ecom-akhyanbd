import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";

export const GET = withStaff(async (request) => {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = 20;
  const status = sp.get("status") || undefined;
  const minScore = Number(sp.get("minScore")) || 0;
  const search = sp.get("search") || undefined;

  const where: Prisma.DeviceFingerprintWhereInput = {};
  if (status) where.status = status;
  if (minScore > 0) where.riskScore = { gte: minScore };
  if (search) {
    where.OR = [
      { fpHash: { contains: search } },
      { lastIp: { contains: search } },
      { platform: { contains: search } },
    ];
  }

  const [devices, total] = await Promise.all([
    prisma.deviceFingerprint.findMany({
      where,
      orderBy: { riskScore: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        _count: { select: { orderFingerprints: true } },
      },
    }),
    prisma.deviceFingerprint.count({ where }),
  ]);

  return jsonResponse({
    data: devices.map((d) => ({
      ...serialize(d),
      orderCount: d._count.orderFingerprints,
    })),
    meta: { page, per_page: perPage, total, last_page: Math.ceil(total / perPage) },
  });
});
