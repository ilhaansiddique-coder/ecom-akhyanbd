import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { withStaff, requireAdmin } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";

// Shape a Prisma order (with items) into the camelCase Order envelope the
// Flutter client expects. Kept inline so each m/ route is self-contained.
async function shapeOrder(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { image: true } } } },
    },
  });
  if (!order) return null;

  const variantIds = order.items.map((i) => i.variantId).filter((v): v is number => !!v);
  const variantMap = new Map<number, string>();
  if (variantIds.length > 0) {
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, image: true },
    });
    for (const v of variants) {
      if (v.image) variantMap.set(v.id, v.image);
    }
  }

  return {
    id: order.id,
    userId: order.userId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    customerAddress: order.customerAddress,
    city: order.city,
    zipCode: order.zipCode,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    discount: order.discount,
    total: order.total,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    transactionId: order.transactionId,
    consignmentId: order.consignmentId,
    courierType: order.courierType,
    courierStatus: order.courierStatus,
    courierSent: order.courierSent,
    courierSentAt: order.courierSentAt?.toISOString() ?? null,
    notes: order.notes,
    riskScore: order.riskScore,
    flagged: (order.riskScore ?? 0) >= 70,
    createdAt: order.createdAt?.toISOString() ?? null,
    updatedAt: order.updatedAt?.toISOString() ?? null,
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      variantId: i.variantId,
      variantLabel: i.variantLabel,
      price: i.price,
      quantity: i.quantity,
      image: i.product?.image ?? (i.variantId ? variantMap.get(i.variantId) ?? null : null),
    })),
  };
}

export const GET = withStaff<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const data = await shapeOrder(Number(id));
  if (!data) return notFound("Order not found");
  return jsonResponse({ data });
});

export const PATCH = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const orderId = Number(id);
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) return notFound("Order not found");

  try {
    const body = await request.json().catch(() => ({}));
    const { status, paymentStatus, notes } = body as {
      status?: string;
      paymentStatus?: string;
      notes?: string;
    };

    // Trashing requires admin (staff can do other status transitions). Mirrors
    // /admin/orders/[id]/status/route.ts.
    if (status === "trashed") {
      try { await requireAdmin(); } catch (e) { return e as Response; }
    }

    const updateData: Prisma.OrderUncheckedUpdateInput = {};

    if (status !== undefined) {
      // Same dispatched-guard rule as the canonical status route — once a
      // parcel is on the courier we never revert to a pre-courier state.
      const PRE_COURIER = new Set(["pending", "confirmed", "processing"]);
      const dispatched = Boolean(existing.courierSent && existing.consignmentId);
      updateData.status = (dispatched && PRE_COURIER.has(status)) ? "shipped" : status;
    }
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (notes !== undefined) updateData.notes = notes || null;

    if (Object.keys(updateData).length === 0) {
      const data = await shapeOrder(orderId);
      return jsonResponse({ data });
    }

    await prisma.order.update({ where: { id: orderId }, data: updateData });
    bumpVersion("orders");
    const data = await shapeOrder(orderId);
    return jsonResponse({ data });
  } catch (error) {
    console.error("Mobile order update error:", error);
    return errorResponse("Failed to update order", 500);
  }
});
