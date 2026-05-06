import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { mobileCouponUpdateSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

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

export const GET = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const idNum = Number(id);
  if (!idNum) return notFound("Invalid id");

  const coupon = await prisma.coupon.findUnique({ where: { id: idNum } });
  if (!coupon) return notFound("Coupon not found");

  return jsonResponse({ data: toCouponDto(coupon) });
});

export const PATCH = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const idNum = Number(id);
  if (!idNum) return notFound("Invalid id");

  const existing = await prisma.coupon.findUnique({ where: { id: idNum } });
  if (!existing) return notFound("Coupon not found");

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);

    const parsed = mobileCouponUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const input = parsed.data;

    const data: Prisma.CouponUncheckedUpdateInput = {};
    if (input.code !== undefined) data.code = input.code;
    if (input.type !== undefined) data.type = input.type;
    if (input.value !== undefined) data.value = input.value;
    if (input.minOrderAmount !== undefined) data.minOrderAmount = input.minOrderAmount;
    if (input.maxUses !== undefined) data.maxUses = input.maxUses;
    if (input.startsAt !== undefined) data.startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const coupon = await prisma.coupon.update({ where: { id: idNum }, data });

    bumpVersion("coupons");
    return jsonResponse({ data: toCouponDto(coupon) });
  } catch (error) {
    console.error("[m/coupons] update error:", error);
    return errorResponse("Failed to update coupon", 500);
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const idNum = Number(id);
  if (!idNum) return notFound("Invalid id");

  const existing = await prisma.coupon.findUnique({ where: { id: idNum } });
  if (!existing) return notFound("Coupon not found");

  await prisma.coupon.delete({ where: { id: idNum } });
  bumpVersion("coupons");
  return jsonResponse({ data: { id: idNum, deleted: true } });
});
