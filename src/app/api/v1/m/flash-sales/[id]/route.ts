import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { mobileFlashSaleUpdateSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

type FlashSaleState = "live" | "scheduled" | "ended" | "inactive";

function computeState(isActive: boolean, startsAt: Date, endsAt: Date, now: Date): FlashSaleState {
  if (!isActive) return "inactive";
  if (now < startsAt) return "scheduled";
  if (now > endsAt) return "ended";
  return "live";
}

const detailSelect = {
  id: true,
  title: true,
  startsAt: true,
  endsAt: true,
  isActive: true,
  createdAt: true,
  products: {
    select: {
      salePrice: true,
      product: {
        select: {
          id: true,
          name: true,
          image: true,
          price: true,
          originalPrice: true,
        },
      },
    },
  },
} satisfies Prisma.FlashSaleSelect;

type FlashSaleDetail = Prisma.FlashSaleGetPayload<{ select: typeof detailSelect }>;

function toDetailDto(fs: FlashSaleDetail, now: Date) {
  return {
    id: fs.id,
    title: fs.title,
    startsAt: fs.startsAt.toISOString(),
    endsAt: fs.endsAt.toISOString(),
    isActive: fs.isActive,
    createdAt: fs.createdAt?.toISOString() ?? null,
    productCount: fs.products.length,
    state: computeState(fs.isActive, fs.startsAt, fs.endsAt, now),
    products: fs.products.map((row) => ({
      id: row.product.id,
      name: row.product.name,
      image: row.product.image,
      price: row.salePrice,
      originalPrice: row.product.originalPrice ?? row.product.price,
    })),
  };
}

export const GET = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const idNum = Number(id);
  if (!idNum) return notFound("Invalid id");

  const flashSale = await prisma.flashSale.findUnique({
    where: { id: idNum },
    select: detailSelect,
  });
  if (!flashSale) return notFound("Flash sale not found");

  return jsonResponse({ data: toDetailDto(flashSale, new Date()) });
});

export const PATCH = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const idNum = Number(id);
  if (!idNum) return notFound("Invalid id");

  const existing = await prisma.flashSale.findUnique({ where: { id: idNum } });
  if (!existing) return notFound("Flash sale not found");

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);

    const parsed = mobileFlashSaleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const input = parsed.data;

    const data: Prisma.FlashSaleUncheckedUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.startsAt !== undefined) data.startsAt = new Date(input.startsAt);
    if (input.endsAt !== undefined) data.endsAt = new Date(input.endsAt);
    if (input.isActive !== undefined) data.isActive = input.isActive;

    // If productIds is provided, replace the entire join set in a transaction.
    if (input.productIds !== undefined) {
      const productIds = input.productIds;
      const products = productIds.length
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, price: true },
          })
        : [];
      const priceMap = new Map(products.map((p) => [p.id, p.price]));

      await prisma.$transaction([
        prisma.flashSaleProduct.deleteMany({ where: { flashSaleId: idNum } }),
        ...(productIds.length
          ? [
              prisma.flashSaleProduct.createMany({
                data: productIds.map((pid) => ({
                  flashSaleId: idNum,
                  productId: pid,
                  salePrice: priceMap.get(pid) ?? 0,
                })),
              }),
            ]
          : []),
        prisma.flashSale.update({ where: { id: idNum }, data }),
      ]);
    } else if (Object.keys(data).length > 0) {
      await prisma.flashSale.update({ where: { id: idNum }, data });
    }

    const updated = await prisma.flashSale.findUnique({
      where: { id: idNum },
      select: detailSelect,
    });
    if (!updated) return notFound("Flash sale not found");

    bumpVersion("flash-sales");
    return jsonResponse({ data: toDetailDto(updated, new Date()) });
  } catch (error) {
    console.error("[m/flash-sales] update error:", error);
    return errorResponse("Failed to update flash sale", 500);
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const idNum = Number(id);
  if (!idNum) return notFound("Invalid id");

  const existing = await prisma.flashSale.findUnique({ where: { id: idNum } });
  if (!existing) return notFound("Flash sale not found");

  await prisma.flashSale.delete({ where: { id: idNum } });
  bumpVersion("flash-sales");
  return jsonResponse({ data: { id: idNum, deleted: true } });
});
