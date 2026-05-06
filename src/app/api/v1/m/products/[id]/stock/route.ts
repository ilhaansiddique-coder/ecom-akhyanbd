import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, notFound, errorResponse, validationError } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";

// Stock-only adjustment endpoint. Accepts either an absolute `stock` value or
// a relative `delta` — at least one must be present.
export const PATCH = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const productId = Number(id);
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, stock: true, unlimitedStock: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) return notFound("Product not found");

  try {
    const body = await request.json().catch(() => ({}));
    const { stock, delta } = body as { stock?: number; delta?: number };

    if (stock === undefined && delta === undefined) {
      return validationError({ stock: ["stock or delta must be provided"] });
    }

    const updateData: Prisma.ProductUncheckedUpdateInput = {};
    if (stock !== undefined) {
      updateData.stock = Math.max(0, Math.floor(Number(stock)));
    } else if (delta !== undefined) {
      // Use Prisma increment so concurrent stock adjustments don't race.
      updateData.stock = { increment: Math.floor(Number(delta)) };
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      select: { id: true, stock: true, unlimitedStock: true },
    });

    // Floor at 0 if a delta took us negative (Prisma increment doesn't clamp).
    if (updated.stock < 0) {
      const fixed = await prisma.product.update({
        where: { id: productId },
        data: { stock: 0 },
        select: { id: true, stock: true, unlimitedStock: true },
      });
      revalidateAll("products");
      bumpVersion("products");
      return jsonResponse({ data: { id: fixed.id, stock: fixed.stock, unlimitedStock: fixed.unlimitedStock } });
    }

    revalidateAll("products");
    bumpVersion("products");
    return jsonResponse({ data: { id: updated.id, stock: updated.stock, unlimitedStock: updated.unlimitedStock } });
  } catch (error) {
    console.error("Mobile product stock update error:", error);
    return errorResponse("Failed to update stock", 500);
  }
});
