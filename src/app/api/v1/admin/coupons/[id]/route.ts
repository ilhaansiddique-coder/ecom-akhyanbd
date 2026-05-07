import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { couponSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

export const PUT = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const existing = await prisma.coupon.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Coupon not found");

  try {
    const body = await request.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const coupon = await prisma.coupon.update({
      where: { id: Number(id) },
      data: {
        code: data.code,
        type: data.type,
        value: data.value,
        minOrderAmount: data.min_order_amount ?? 0,
        maxUses: data.max_uses ?? null,
        startsAt: data.starts_at ? new Date(data.starts_at) : null,
        expiresAt: data.expires_at ? new Date(data.expires_at) : null,
        isActive: data.is_active ?? true,
      },
    });

    revalidateAll("coupons");
    bumpVersion("coupons", {
      kind: "coupon.updated",
      title: "Coupon updated",
      body: `Code ${coupon.code}`,
      severity: "info",
    });
    return jsonResponse(serialize(coupon));
  } catch (error) {
    return errorResponse("Failed to update coupon", 500);
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const existing = await prisma.coupon.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Coupon not found");

  await prisma.coupon.delete({ where: { id: Number(id) } });
  revalidateAll("coupons");
  bumpVersion("coupons", {
    kind: "coupon.deleted",
    title: "Coupon deleted",
    body: `Code ${existing.code}`,
    severity: "warn",
  });
  return jsonResponse({ message: "Coupon deleted" });
});
