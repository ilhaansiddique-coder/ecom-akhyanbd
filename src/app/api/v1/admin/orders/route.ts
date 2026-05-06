import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";

export const GET = withStaff(async (request) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  // 100 per page — large enough that most merchants see their full daily
  // workload in one view but still bounded so a year-long fetch doesn't
  // pull thousands of rows in a single response.
  const perPage = 100;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("date_from"); // YYYY-MM-DD
  const dateTo = searchParams.get("date_to");     // YYYY-MM-DD

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status) {
    where.status = status;
  } else {
    // Default view hides trashed orders — they only show when the filter is
    // explicitly "trashed". Matches the client-side rule.
    where.status = { not: "trashed" };
  }
  if (search) {
    // Allow searching by id too — common admin workflow ("find #123").
    const asNumber = Number(search);
    where.OR = [
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
      ...(Number.isFinite(asNumber) && asNumber > 0 ? [{ id: asNumber }] : []),
    ];
  }
  // Date range — anchor to Bangladesh time (UTC+6, no DST). Mirror the
  // client-side BD-anchored math so a customer's day in BD always matches
  // the same day boundary admin sees, regardless of server tz.
  if (dateFrom || dateTo) {
    const toBdMidnightMs = (ymd: string) => {
      const [yy, mm, dd] = ymd.split("-").map(Number);
      return Date.UTC(yy, (mm || 1) - 1, dd || 1) - 6 * 3600 * 1000;
    };
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(toBdMidnightMs(dateFrom));
    if (dateTo) where.createdAt.lte = new Date(toBdMidnightMs(dateTo) + 86400000 - 1);
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: { include: { product: { select: { image: true } } } },
        user: { select: { id: true, fullName: true, email: true, phone: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.order.count({ where }),
  ]);

  // Attach variant image as fallback (no Prisma relation declared on OrderItem.variantId,
  // so we fetch them in one batched query and merge in memory).
  const variantIds = Array.from(
    new Set(
      orders.flatMap((o) => o.items.map((i) => i.variantId).filter((v): v is number => !!v))
    )
  );
  const variantMap = new Map<number, string>();
  if (variantIds.length > 0) {
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, image: true },
    });
    for (const v of variants) {
      if (v.image) variantMap.set(v.id, v.image);
    }
  }

  const ordersWithVariantImages = orders.map((o) => ({
    ...o,
    items: o.items.map((i) => ({
      ...i,
      variantImage: i.variantId ? variantMap.get(i.variantId) || null : null,
    })),
  }));

  return jsonResponse(paginatedResponse(ordersWithVariantImages, { page, perPage, total }));
});
