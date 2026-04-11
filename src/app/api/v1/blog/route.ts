import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse } from "@/lib/api-response";

export async function GET() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });

  return jsonResponse(posts.map(serialize));
}
