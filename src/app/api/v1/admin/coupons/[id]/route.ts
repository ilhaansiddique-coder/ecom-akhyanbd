import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { couponSchema } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

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
    return jsonResponse(serialize(coupon));
  } catch (error) {
    return errorResponse("Failed to update coupon", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.coupon.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Coupon not found");

  await prisma.coupon.delete({ where: { id: Number(id) } });
  revalidateAll("coupons");
  return jsonResponse({ message: "Coupon deleted" });
}
