import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";

export const GET = withAdmin(async (request) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = 15;
  const isApproved = searchParams.get("is_approved");

  const where: Prisma.ReviewWhereInput = {};
  if (isApproved === "1" || isApproved === "true") where.isApproved = true;
  if (isApproved === "0" || isApproved === "false") where.isApproved = false;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.review.count({ where }),
  ]);

  return jsonResponse(paginatedResponse(reviews, { page, perPage, total }));
});
