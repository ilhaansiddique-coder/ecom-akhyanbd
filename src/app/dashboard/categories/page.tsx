import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import CategoriesClient from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const data = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    });

    const items = data.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image ?? undefined,
      description: c.description ?? undefined,
      sort: c.sortOrder,
      is_active: c.isActive,
    }));

    return <CategoriesClient initialData={{ items }} />;
  } catch {
    return <CategoriesClient initialData={{ items: [] }} />;
  }
}
