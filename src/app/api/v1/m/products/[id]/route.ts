import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";
import { productDetailSelect, shapeDetailProduct } from "../_shared";

export const GET = withStaff<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    select: { ...productDetailSelect, deletedAt: true },
  });
  if (!product || product.deletedAt) return notFound("Product not found");
  return jsonResponse({ data: shapeDetailProduct(product) });
});

// Partial update — accepts any subset of productSchema fields. We use a fully
// optional schema so PATCH semantics work without forcing the caller to send
// `name` (required by the canonical productSchema). Validation rules per field
// stay loose; admin route is still the source of truth for full creates.
const productPatchSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional().nullable(),
  category_id: z.coerce.number().optional().nullable(),
  category_ids: z.array(z.coerce.number()).optional(),
  brand_id: z.coerce.number().optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().optional(),
  original_price: z.coerce.number().optional().nullable(),
  image: z.string().optional().nullable(),
  images: z.array(z.string()).nullable().optional(),
  badge: z.string().optional().nullable(),
  badge_color: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  stock: z.coerce.number().int().optional(),
  unlimited_stock: z.boolean().optional(),
  sold_count: z.coerce.number().int().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  has_variations: z.boolean().optional(),
  variation_type: z.string().optional().nullable(),
  custom_shipping: z.boolean().optional(),
  shipping_cost: z.coerce.number().optional().nullable(),
  sort_order: z.coerce.number().int().optional(),
  variants: z.array(z.object({
    label: z.string().min(1),
    price: z.coerce.number(),
    original_price: z.coerce.number().optional().nullable(),
    sku: z.string().optional().nullable(),
    stock: z.coerce.number().optional(),
    unlimited_stock: z.boolean().optional(),
    image: z.string().optional().nullable(),
    sort_order: z.coerce.number().optional(),
    is_active: z.boolean().optional(),
  })).optional(),
});

export const PATCH = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const productId = Number(id);
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) return notFound("Product not found");

  try {
    const body = await request.json();
    const parsed = productPatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    const updateData: Prisma.ProductUncheckedUpdateInput = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
      // Recompute slug only if name changed and caller didn't pass an explicit one.
      const newSlug = await uniqueSlug(data.name, "product", data.slug ?? undefined, productId);
      updateData.slug = newSlug;
    } else if (data.slug !== undefined && data.slug !== null) {
      updateData.slug = await uniqueSlug(existing.name, "product", data.slug, productId);
    }
    if (data.category_id !== undefined) updateData.categoryId = data.category_id;
    if (data.brand_id !== undefined) updateData.brandId = data.brand_id;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.original_price !== undefined) updateData.originalPrice = data.original_price;
    if (data.image !== undefined && data.image) updateData.image = data.image;
    if (data.images !== undefined) updateData.images = JSON.stringify(data.images ?? []);
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.badge_color !== undefined) updateData.badgeColor = data.badge_color;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.unlimited_stock !== undefined) updateData.unlimitedStock = data.unlimited_stock;
    if (data.sold_count !== undefined) updateData.soldCount = data.sold_count;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.is_featured !== undefined) updateData.isFeatured = data.is_featured;
    if (data.has_variations !== undefined) updateData.hasVariations = data.has_variations;
    if (data.variation_type !== undefined) updateData.variationType = data.variation_type;
    if (data.custom_shipping !== undefined) updateData.customShipping = data.custom_shipping;
    if (data.shipping_cost !== undefined) {
      updateData.shippingCost = data.shipping_cost != null ? Number(data.shipping_cost) : null;
    }
    if (data.sort_order !== undefined) updateData.sortOrder = data.sort_order;

    if (data.category_ids !== undefined) {
      // M2M update — requires a separate `set` operation. Only run when caller
      // explicitly sent the array.
      await prisma.product.update({
        where: { id: productId },
        data: { categories: { set: data.category_ids.map((cid) => ({ id: cid })) } },
      });
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.product.update({ where: { id: productId }, data: updateData });
    }

    // Variant replacement — delete-then-recreate, same approach as admin PUT.
    if (data.variants !== undefined) {
      await prisma.productVariant.deleteMany({ where: { productId } });
      if (data.variants.length > 0) {
        await prisma.productVariant.createMany({
          data: data.variants.map((v, i) => ({
            productId,
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
    }

    const updated = await prisma.product.findUnique({
      where: { id: productId },
      select: productDetailSelect,
    });
    if (!updated) return notFound("Product not found");

    revalidateAll("products");
    bumpVersion("products");
    return jsonResponse({ data: shapeDetailProduct(updated) });
  } catch (error) {
    console.error("Mobile product patch error:", error);
    return errorResponse("Failed to update product", 500);
  }
});

// Soft-delete only. Mobile clients never get a force-delete escape hatch —
// trash management stays in the admin web UI.
export const DELETE = withStaff<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const productId = Number(id);
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) return notFound("Product not found");

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), isActive: false },
    });
    revalidateAll("products");
    bumpVersion("products");
    return jsonResponse({ data: { id: productId, deleted: true } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/deleted_at|deletedAt|column.*does not exist/i.test(msg)) {
      return errorResponse("Trash column missing. Run `npx prisma db push` to enable soft-delete.", 500);
    }
    return errorResponse("Failed to delete product", 500);
  }
});
