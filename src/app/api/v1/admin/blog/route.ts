import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { blogPostSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";

export const GET = withAdmin(async (request) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = 15;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      include: { author: { select: { id: true, fullName: true, email: true, image: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.blogPost.count(),
  ]);

  return jsonResponse(paginatedResponse(posts, { page, perPage, total }));
});

export const POST = withAdmin(async (request, _ctx, admin) => {
  try {
    const body = await request.json();
    const parsed = blogPostSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.title, "blogPost", data.slug);

    const post = await prisma.blogPost.create({
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
        authorId: admin.id,
        isPublished: data.is_published ?? false,
        publishedAt: data.published_at ? new Date(data.published_at) : null,
      },
      include: { author: { select: { id: true, fullName: true, email: true, image: true } } },
    });

    revalidateAll("blog");
    return jsonResponse(serialize(post), 201);
  } catch (error) {
    return errorResponse("Failed to create blog post", 500);
  }
});
