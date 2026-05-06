import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = 15;
  const isApproved = searchParams.get("is_approved");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
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
}
