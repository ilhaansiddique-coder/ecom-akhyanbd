import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { applyCouponSchema } from "@/lib/validation";
import { jsonResponse, validationError, notFound } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = applyCouponSchema.safeParse(body);
  if (!parsed.success) return validationError({ code: ["কুপন কোড দিন।"] });

  const { code, subtotal } = parsed.data;

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return notFound("কুপন পাওয়া যায়নি।");

  // Validate coupon
  if (!coupon.isActive) return jsonResponse({ message: "কুপন নিষ্ক্রিয়।" }, 422);

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) return jsonResponse({ message: "কুপন এখনো শুরু হয়নি।" }, 422);
  if (coupon.expiresAt && now > coupon.expiresAt) return jsonResponse({ message: "কুপনের মেয়াদ শেষ।" }, 422);
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return jsonResponse({ message: "কুপন ব্যবহারের সীমা শেষ।" }, 422);

  if (subtotal < Number(coupon.minOrderAmount)) {
    return jsonResponse({ message: `সর্বনিম্ন অর্ডার ৳${coupon.minOrderAmount} হতে হবে।` }, 422);
  }

  // Calculate discount
  let discount = 0;
  if (coupon.type === "percentage") {
    discount = (subtotal * Number(coupon.value)) / 100;
  } else {
    discount = Number(coupon.value);
  }
  discount = Math.min(discount, subtotal);

  return jsonResponse({
    discount,
    coupon: serialize(coupon),
  });
}
