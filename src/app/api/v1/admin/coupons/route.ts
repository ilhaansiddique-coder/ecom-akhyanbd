import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { couponSchema } from "@/lib/validation";

export async function GET(_request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return jsonResponse(coupons.map(serialize));
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const body = await request.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const coupon = await prisma.coupon.create({
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

    revalidateTag("coupons", "max");
    return jsonResponse(serialize(coupon), 201);
  } catch (error) {
    return errorResponse("Failed to create coupon", 500);
  }
}
