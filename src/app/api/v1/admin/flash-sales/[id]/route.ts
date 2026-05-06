import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { flashSaleSchema } from "@/lib/validation";

export const PUT = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const existing = await prisma.flashSale.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Flash sale not found");

  try {
    const body = await request.json();
    const parsed = flashSaleSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    // Delete existing products and re-create
    await prisma.flashSaleProduct.deleteMany({ where: { flashSaleId: Number(id) } });

    const flashSale = await prisma.flashSale.update({
      where: { id: Number(id) },
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
    return jsonResponse(serialize(flashSale));
  } catch (error) {
    return errorResponse("Failed to update flash sale", 500);
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const existing = await prisma.flashSale.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Flash sale not found");

  await prisma.flashSale.delete({ where: { id: Number(id) } });
  revalidateAll("flash-sales");
  return jsonResponse({ message: "Flash sale deleted" });
});
