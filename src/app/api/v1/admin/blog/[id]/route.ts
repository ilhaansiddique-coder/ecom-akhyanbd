import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { blogPostSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";

export const GET = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { id: Number(id) },
    include: { author: true },
  });

  if (!post) return notFound("Blog post not found");
  return jsonResponse(serialize(post));
});

export const PUT = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const existing = await prisma.blogPost.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Blog post not found");

  try {
    const body = await request.json();
    const parsed = blogPostSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.title, "blogPost", data.slug, Number(id));

    const post = await prisma.blogPost.update({
      where: { id: Number(id) },
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt ?? null,
        content: data.content,
        image: data.image ?? null,
        category: data.category ?? null,
        tags: data.tags ?? null,
        readTime: data.read_time ?? null,
        featured: data.featured ?? false,
        metaTitle: data.meta_title ?? null,
        metaDescription: data.meta_description ?? null,
        metaKeywords: data.meta_keywords ?? null,
        ogImage: data.og_image ?? null,
        isPublished: data.is_published ?? false,
        publishedAt: data.published_at ? new Date(data.published_at) : null,
      },
      include: { author: true },
    });

    revalidateAll("blog");
    return jsonResponse(serialize(post));
  } catch (error) {
    return errorResponse("Failed to update blog post", 500);
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const existing = await prisma.blogPost.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Blog post not found");

  await prisma.blogPost.delete({ where: { id: Number(id) } });
  revalidateAll("blog");
  return jsonResponse({ message: "Blog post deleted" });
});
