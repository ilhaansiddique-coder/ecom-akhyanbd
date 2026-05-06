import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { mobileFlashSaleCreateSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

type FlashSaleState = "live" | "scheduled" | "ended" | "inactive";

function computeState(isActive: boolean, startsAt: Date, endsAt: Date, now: Date): FlashSaleState {
  if (!isActive) return "inactive";
  if (now < startsAt) return "scheduled";
  if (now > endsAt) return "ended";
  return "live";
}

function toListDto(fs: {
  id: number;
  title: string;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  createdAt: Date | null;
  _count: { products: number };
}, now: Date) {
  return {
    id: fs.id,
    title: fs.title,
    startsAt: fs.startsAt.toISOString(),
    endsAt: fs.endsAt.toISOString(),
    isActive: fs.isActive,
    createdAt: fs.createdAt?.toISOString() ?? null,
    productCount: fs._count.products,
    state: computeState(fs.isActive, fs.startsAt, fs.endsAt, now),
  };
}

export const GET = withAdmin(async (_request) => {
  const now = new Date();

  const flashSales = await prisma.flashSale.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
      createdAt: true,
      _count: { select: { products: true } },
    },
  });

  return jsonResponse({ data: flashSales.map((fs) => toListDto(fs, now)) });
});

export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);

    const parsed = mobileFlashSaleCreateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    const productIds = data.productIds ?? [];

    // We need a salePrice for each FlashSaleProduct row; the mobile create
    // payload only carries productIds, so default salePrice to the product's
    // current price. The dedicated edit screen can refine it later.
    const products = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, price: true },
        })
      : [];
    const priceMap = new Map(products.map((p) => [p.id, p.price]));

    const created = await prisma.flashSale.create({
      data: {
        title: data.title,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        isActive: data.isActive ?? true,
        products: productIds.length
          ? {
              create: productIds.map((pid) => ({
                productId: pid,
                salePrice: priceMap.get(pid) ?? 0,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        createdAt: true,
        _count: { select: { products: true } },
      },
    });

    bumpVersion("flash-sales");
    return jsonResponse({ data: toListDto(created, new Date()) }, 201);
  } catch (error) {
    console.error("[m/flash-sales] create error:", error);
    return errorResponse("Failed to create flash sale", 500);
  }
});
