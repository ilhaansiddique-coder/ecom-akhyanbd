import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import BlogClient from "./BlogClient";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const data = await prisma.blogPost.findMany({
      include: { author: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });

    const items = data.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? undefined,
      content: p.content ?? undefined,
      image: p.image ?? undefined,
      is_published: p.isPublished,
      published_at: p.publishedAt?.toISOString() ?? undefined,
    }));

    return <BlogClient initialData={{ items }} />;
  } catch {
    return <BlogClient initialData={{ items: [] }} />;
  }
}


