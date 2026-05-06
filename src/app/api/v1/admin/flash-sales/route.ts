import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { flashSaleSchema } from "@/lib/validation";

export const GET = withAdmin(async (_request) => {
  const flashSales = await prisma.flashSale.findMany({
    include: { products: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return jsonResponse(flashSales.map(serialize));
});

export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json();
    const parsed = flashSaleSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const flashSale = await prisma.flashSale.create({
      data: {
        title: data.title,
        startsAt: new Date(data.starts_at),
        endsAt: new Date(data.ends_at),
        isActive: data.is_active ?? true,
        products: data.products?.length
          ? {
              create: data.products.map((p) => ({
                productId: p.id,
                salePrice: p.sale_price,
              })),
            }
          : undefined,
      },
      include: { products: { include: { product: true } } },
    });

    revalidateAll("flash-sales");
    return jsonResponse(serialize(flashSale), 201);
  } catch (error) {
    return errorResponse("Failed to create flash sale", 500);
  }
});
