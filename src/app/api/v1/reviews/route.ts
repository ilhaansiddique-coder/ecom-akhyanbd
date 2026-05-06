import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { createReviewSchema } from "@/lib/validation";
import { jsonResponse, validationError, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] = [issue.message];
    return validationError(errors);
  }

  const { product_id, customer_name, rating, review: reviewText } = parsed.data;

  // Review.userId is orphan in the schema (no @relation) and currently
  // mismatched (Int? vs User.id String). Skip writing it until the schema
  // migration to String? lands; reviews still associate to the customer
  // via customerName + the session check above.
  const newReview = await prisma.review.create({
    data: {
      productId: product_id,
      customerName: customer_name,
      rating,
      review: reviewText,
      isApproved: false,
    },
  });

  return jsonResponse({
    message: "রিভিউ সাবমিট করা হয়েছে। অনুমোদনের পর এটি প্রদর্শিত হবে।",
    review: serialize(newReview),
  }, 201);
}
