import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, validationError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const reviewId = parseInt(id, 10);

  if (isNaN(reviewId)) {
    return errorResponse("Invalid review ID", 400);
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return errorResponse("Review not found", 404);
  }

  // Verify user owns the review (userId matches)
  if (review.userId !== user.id) {
    return errorResponse("Unauthorized", 403);
  }

  const body = await request.json();
  const { rating, review: reviewText } = body;

  if (!rating || !reviewText) {
    return validationError({
      rating: rating ? [] : ["Rating is required"],
      review: reviewText ? [] : ["Review text is required"],
    });
  }

  if (rating < 1 || rating > 5) {
    return validationError({ rating: ["Rating must be between 1 and 5"] });
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      rating,
      review: reviewText,
    },
  });

  return jsonResponse({
    id: updated.id,
    product_id: updated.productId,
    rating: updated.rating,
    review: updated.review,
    image: updated.image,
    is_approved: updated.isApproved,
    created_at: updated.createdAt,
    updated_at: updated.updatedAt,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const reviewId = parseInt(id, 10);

  if (isNaN(reviewId)) {
    return errorResponse("Invalid review ID", 400);
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return errorResponse("Review not found", 404);
  }

  // Verify user owns the review
  if (review.userId !== user.id) {
    return errorResponse("Unauthorized", 403);
  }

  await prisma.review.delete({
    where: { id: reviewId },
  });

  return jsonResponse({ message: "Review deleted successfully" });
}
