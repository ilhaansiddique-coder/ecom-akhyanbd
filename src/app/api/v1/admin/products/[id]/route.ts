import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { productSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: { category: true, brand: true },
  });

  if (!product) return notFound("Product not found");
  return jsonResponse(serialize(product));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Product not found");

  try {
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.name, "product", data.slug, Number(id));

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name: data.name,
        slug,
        categoryId: data.category_id ?? undefined,
        brandId: data.brand_id ?? null,
        description: data.description,
        price: data.price,
        originalPrice: data.original_price ?? null,
        image: data.image || undefined,
        images: JSON.stringify(data.images ?? []),
        badge: data.badge ?? null,
        badgeColor: data.badge_color ?? null,
        weight: data.weight ?? null,
        stock: data.stock ?? 0,
        unlimitedStock: data.unlimited_stock ?? false,
        soldCount: data.sold_count ?? 0,
        isActive: data.is_active ?? true,
        isFeatured: data.is_featured ?? false,
        hasVariations: data.has_variations ?? false,
        variationType: data.variation_type ?? null,
        sortOrder: data.sort_order ?? 0,
      },
      include: { category: true, brand: true, variants: { orderBy: { sortOrder: "asc" } } },
    });

    // Handle variants: delete old, create new
    if (data.variants !== undefined && Array.isArray(data.variants)) {
      await prisma.productVariant.deleteMany({ where: { productId: Number(id) } });
      if (data.variants.length > 0) {
        await prisma.productVariant.createMany({
          data: data.variants.map((v: any, i: number) => ({
            productId: Number(id),
            label: v.label,
            price: Number(v.price),
            originalPrice: v.original_price ? Number(v.original_price) : null,
            sku: v.sku || null,
            stock: Number(v.stock) || 0,
            unlimitedStock: v.unlimited_stock ?? false,
            image: v.image || null,
            sortOrder: v.sort_order ?? i,
            isActive: v.is_active ?? true,
          })),
        });
      }
      // Re-fetch with variants
      const updated = await prisma.product.findUnique({
        where: { id: Number(id) },
        include: { category: true, brand: true, variants: { orderBy: { sortOrder: "asc" } } },
      });
      revalidateAll("products");
      bumpVersion("products");
      return jsonResponse(serialize(updated));
    }

    revalidateAll("products");
    bumpVersion("products");
    return jsonResponse(serialize(product));
  } catch (error) {
    return errorResponse("Failed to update product", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Product not found");

  await prisma.product.delete({ where: { id: Number(id) } });
  revalidateAll("products");
  bumpVersion("products");
  return jsonResponse({ message: "Product deleted" });
}
