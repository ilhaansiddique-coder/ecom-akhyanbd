import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";

export const PUT = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const existing = await prisma.review.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Review not found");

  try {
    const body = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (body.is_approved !== undefined) updateData.isApproved = body.is_approved;
    if (body.rating !== undefined) updateData.rating = Number(body.rating);
    if (body.review !== undefined) updateData.review = body.review;
    if (body.customer_name !== undefined) updateData.customerName = body.customer_name;
    if (body.image !== undefined) updateData.image = body.image || null;

    const review = await prisma.review.update({
      where: { id: Number(id) },
      data: updateData,
      include: { product: true },
    });

    revalidateAll("reviews");
    bumpVersion("reviews");
    return jsonResponse(serialize(review));
  } catch (error) {
    return errorResponse("Failed to update review", 500);
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const existing = await prisma.review.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Review not found");

  await prisma.review.delete({ where: { id: Number(id) } });
  revalidateAll("reviews");
  bumpVersion("reviews");
  return jsonResponse({ message: "Review deleted" });
});
