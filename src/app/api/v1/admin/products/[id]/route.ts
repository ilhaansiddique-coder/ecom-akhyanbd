import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { productSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

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
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

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

    const rawCatIds: number[] = data.category_ids?.length
      ? data.category_ids
      : data.category_id ? [data.category_id] : [];

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name: data.name,
        slug,
        categoryId: rawCatIds[0] ?? null,
        categories: { set: rawCatIds.map((id) => ({ id })) },
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
        customShipping: data.custom_shipping ?? false,
        shippingCost: data.shipping_cost != null ? Number(data.shipping_cost) : null,
        sortOrder: data.sort_order ?? 0,
      },
      include: { category: true, categories: true, brand: true, variants: { orderBy: { sortOrder: "asc" } } },
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
        include: { category: true, categories: true, brand: true, variants: { orderBy: { sortOrder: "asc" } } },
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Product not found");

  // Hard delete requires BOTH explicit force=1 AND the product to already be
  // in trash. This prevents any accidental hard-delete when the client
  // happens to send force=1 (or a stale build does). Single-step deletes from
  // the main list always soft-delete; the Trash view sends force=1 to convert
  // the second-stage click into permanent removal.
  const force = request.nextUrl.searchParams.get("force") === "1";
  const alreadyTrashed = !!existing.deletedAt;

  if (force && alreadyTrashed) {
    await prisma.product.delete({ where: { id: Number(id) } });
    revalidateAll("products");
    bumpVersion("products");
    return jsonResponse({ message: "Product permanently deleted" });
  }

  // Soft delete — also deactivate so it disappears from storefront immediately.
  // Reaches here for: first delete from any view, OR force=1 on a not-yet-trashed product.
  try {
    await prisma.product.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date(), isActive: false },
    });
  } catch (e) {
    // Most likely cause: `deleted_at` column missing in DB. Run `npx prisma db push`.
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[products] soft-delete failed:", msg);
    if (/deleted_at|deletedAt|column.*does not exist/i.test(msg)) {
      return errorResponse("Trash column missing. Run `npx prisma db push` to enable soft-delete.", 500);
    }
    return errorResponse("Failed to trash product: " + msg, 500);
  }
  revalidateAll("products");
  bumpVersion("products");
  return jsonResponse({ message: "Product moved to trash" });
}

// Restore from trash
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Product not found");

  await prisma.product.update({
    where: { id: Number(id) },
    data: { deletedAt: null },
  });
  revalidateAll("products");
  bumpVersion("products");
  return jsonResponse({ message: "Product restored" });
}
