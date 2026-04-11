import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse } from "@/lib/api-response";

export async function GET() {
  const reviews = await prisma.review.findMany({
    where: { isApproved: true },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      product: { select: { name: true } },
    },
  });

  const result = reviews.map((r) => ({
    ...serialize(r),
    product_name: r.product?.name || "",
  }));

  return jsonResponse(result);
}
