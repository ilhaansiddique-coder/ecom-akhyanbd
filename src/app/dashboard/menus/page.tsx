import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import MenusClient from "./MenusClient";

export const dynamic = "force-dynamic";

export default async function MenusPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const data = await prisma.navMenu.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    const items = data.map((m) => ({
      id: m.id,
      label: m.label,
      url: m.url,
      sort_order: m.sortOrder,
      is_active: m.isActive,
    }));

    return <MenusClient initialData={{ items }} />;
  } catch {
    return <MenusClient initialData={{ items: [] }} />;
  }
}


