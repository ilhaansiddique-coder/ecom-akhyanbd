import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import CouponsClient from "./CouponsClient";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const data = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    const items = data.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type as "fixed" | "percentage",
      value: Number(c.value),
      used_count: c.usedCount,
      max_uses: c.maxUses ?? undefined,
      starts_at: c.startsAt?.toISOString() ?? undefined,
      expires_at: c.expiresAt?.toISOString() ?? undefined,
      is_active: c.isActive,
      min_order_amount: c.minOrderAmount ? Number(c.minOrderAmount) : undefined,
    }));

    return <CouponsClient initialData={{ items }} />;
  } catch {
    return <CouponsClient initialData={{ items: [] }} />;
  }
}
