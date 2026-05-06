import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import FlashSalesClient from "./FlashSalesClient";

export const dynamic = "force-dynamic";

export default async function FlashSalesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const data = await prisma.flashSale.findMany({
      include: {
        products: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = data.map((s) => ({
      id: s.id,
      title: s.title,
      starts_at: s.startsAt.toISOString(),
      ends_at: s.endsAt.toISOString(),
      is_active: s.isActive,
      products_count: s.products.length,
    }));

    return <FlashSalesClient initialData={{ items }} />;
  } catch {
    return <FlashSalesClient initialData={{ items: [] }} />;
  }
}


