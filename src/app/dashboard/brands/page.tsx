import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import BrandsClient from "./BrandsClient";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const user = await getSessionUser();
  if (!user || !isStaffOrAdmin(user.role)) redirect("/cdlogin");

  try {
    const data = await prisma.brand.findMany({
      orderBy: { name: "asc" },
    });

    const items = data.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logo: b.logo ?? undefined,
      // `description` isn't on the Brand model in Prisma; the client form has
      // an unused field. Pass undefined so the UI shows blank.
      description: undefined,
      is_active: b.isActive,
    }));

    return <BrandsClient initialData={{ items }} />;
  } catch {
    return <BrandsClient initialData={{ items: [] }} />;
  }
}
