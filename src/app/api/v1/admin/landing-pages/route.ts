import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { landingPageSchema } from "@/lib/validation";

export async function GET(_request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const pages = await prisma.landingPage.findMany({
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return jsonResponse(pages.map(serialize));
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const body = await request.json();
    const parsed = landingPageSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const page = await prisma.landingPage.create({
      data: {
        productId: data.product_id,
        slug: data.slug,
        customTitle: data.custom_title ?? null,
        customDescription: data.custom_description ?? null,
        isActive: data.is_active ?? true,
      },
      include: { product: true },
    });

    revalidateTag("landing-pages", "max");
    return jsonResponse(serialize(page), 201);
  } catch (error) {
    return errorResponse("Failed to create landing page", 500);
  }
}
