import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { mobileCouponCreateSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";

// Coupon JSON shape returned to the Flutter admin client.
function toCouponDto(c: {
  id: number;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date | null;
}) {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minOrderAmount: c.minOrderAmount,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    startsAt: c.startsAt?.toISOString() ?? null,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    isActive: c.isActive,
    createdAt: c.createdAt?.toISOString() ?? null,
  };
}

export const GET = withAdmin(async (request) => {
  const { searchParams } = request.nextUrl;
  const activeParam = searchParams.get("active");

  const where: Prisma.CouponWhereInput = {};
  if (activeParam === "true") where.isActive = true;
  else if (activeParam === "false") where.isActive = false;

  const coupons = await prisma.coupon.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return jsonResponse({ data: coupons.map(toCouponDto) });
});

export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);

    const parsed = mobileCouponCreateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount ?? 0,
        maxUses: data.maxUses ?? null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive ?? true,
      },
    });

    revalidateAll("coupons");
    bumpVersion("coupons");
    return jsonResponse({ data: toCouponDto(coupon) }, 201);
  } catch (error) {
    console.error("[m/coupons] create error:", error);
    return errorResponse("Failed to create coupon", 500);
  }
});
