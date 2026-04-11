import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse } from "@/lib/api-response";

export async function GET() {
  const now = new Date();

  const flashSale = await prisma.flashSale.findFirst({
    where: {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    include: {
      products: {
        include: {
          product: {
            include: { category: true, brand: true },
          },
        },
      },
    },
  });

  if (!flashSale) return jsonResponse(null);

  const result = {
    ...serialize(flashSale),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    products: flashSale.products.map((fp: any) => ({
      ...serialize(fp.product),
      sale_price: Number(fp.salePrice),
    })),
  };

  return jsonResponse(result);
}
