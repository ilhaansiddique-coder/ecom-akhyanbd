import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const post = await prisma.blogPost.findFirst({
    where: { slug, isPublished: true },
    include: { author: { select: { id: true, fullName: true } } },
  });

  if (!post) return notFound("Blog post not found");

  return jsonResponse(serialize(post));
}
