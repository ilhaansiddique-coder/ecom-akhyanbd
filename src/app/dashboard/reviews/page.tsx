import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReviewsClient from "./ReviewsClient";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const [data, total] = await Promise.all([
      prisma.review.findMany({
        include: { product: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.review.count(),
    ]);

    const items = data.map((r) => ({
      id: r.id,
      product_name: r.product?.name ?? undefined,
      product: r.product ? { name: r.product.name } : undefined,
      customer_name: r.customerName,
      rating: r.rating,
      review: r.review,
      image: r.image ?? undefined,
      is_approved: r.isApproved,
      created_at: r.createdAt?.toISOString() ?? "",
    }));

    return <ReviewsClient initialData={{ items, total }} />;
  } catch {
    return <ReviewsClient initialData={{ items: [], total: 0 }} />;
  }
}
