import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ShippingClient from "./ShippingClient";

export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const data = await prisma.shippingZone.findMany({
      orderBy: { id: "asc" },
    });

    const items = data.map((z) => ({
      id: z.id,
      name: z.name,
      cities: Array.isArray(z.cities) ? z.cities as string[] : [],
      rate: Number(z.rate),
      estimated_days: z.estimatedDays ?? "",
      is_active: z.isActive,
    }));

    return <ShippingClient initialData={{ items }} />;
  } catch {
    return <ShippingClient initialData={{ items: [] }} />;
  }
}
