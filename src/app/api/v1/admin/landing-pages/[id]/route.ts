import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { landingPageSchema } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const page = await prisma.landingPage.findUnique({
    where: { id: Number(id) },
    include: { product: true },
  });

  if (!page) return notFound("Landing page not found");
  return jsonResponse(serialize(page));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.landingPage.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Landing page not found");

  try {
    const body = await request.json();
    const parsed = landingPageSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const page = await prisma.landingPage.update({
      where: { id: Number(id) },
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
    return jsonResponse(serialize(page));
  } catch (error) {
    return errorResponse("Failed to update landing page", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.landingPage.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Landing page not found");

  await prisma.landingPage.delete({ where: { id: Number(id) } });
  revalidateTag("landing-pages", "max");
  return jsonResponse({ message: "Landing page deleted" });
}
