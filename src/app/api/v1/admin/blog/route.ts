import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { blogPostSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";

export async function GET(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = 15;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      include: { author: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.blogPost.count(),
  ]);

  return jsonResponse(paginatedResponse(posts, { page, perPage, total }));
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

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
        authorId: Number(admin.id),
        isPublished: data.is_published ?? false,
        publishedAt: data.published_at ? new Date(data.published_at) : null,
      },
      include: { author: true },
    });

    revalidateAll("blog");
    return jsonResponse(serialize(post), 201);
  } catch (error) {
    return errorResponse("Failed to create blog post", 500);
  }
}
