import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { flashSaleSchema } from "@/lib/validation";

export async function GET(_request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const flashSales = await prisma.flashSale.findMany({
    include: { products: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return jsonResponse(flashSales.map(serialize));
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

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

    revalidateTag("flash-sales", "max");
    return jsonResponse(serialize(flashSale), 201);
  } catch (error) {
    return errorResponse("Failed to create flash sale", 500);
  }
}
