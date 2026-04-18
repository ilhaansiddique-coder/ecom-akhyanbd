import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import BannersClient from "./BannersClient";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const data = await prisma.banner.findMany({
      orderBy: [{ position: "asc" }, { sortOrder: "asc" }],
    });

    const items = data.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle ?? undefined,
      description: b.description ?? undefined,
      button_text: b.buttonText ?? undefined,
      button_url: b.buttonUrl ?? undefined,
      image: b.image ?? undefined,
      gradient: b.gradient ?? undefined,
      emoji: b.emoji ?? undefined,
      position: b.position as "hero" | "ad_section",
      sort_order: b.sortOrder,
      is_active: b.isActive,
    }));

    return <BannersClient initialData={{ items }} />;
  } catch {
    return <BannersClient initialData={{ items: [] }} />;
  }
}
