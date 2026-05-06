import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound, errorResponse, validationError } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";
import { adminReviewUpdateSchema } from "@/lib/validation";

export const PUT = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const existing = await prisma.review.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Review not found");

  try {
    const body = await request.json();
    const parsed = adminReviewUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    const updateData: Prisma.ReviewUncheckedUpdateInput = {};
    if (data.is_approved !== undefined) updateData.isApproved = data.is_approved;
    if (data.rating !== undefined) updateData.rating = Number(data.rating);
    if (data.review !== undefined) updateData.review = data.review;
    if (data.customer_name !== undefined) updateData.customerName = data.customer_name;
    if (data.image !== undefined) updateData.image = data.image || null;

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
