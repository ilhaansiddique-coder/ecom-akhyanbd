import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound, errorResponse, validationError } from "@/lib/api-response";
import { withAdmin, withStaff } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";
import { adminOrderUpdateSchema } from "@/lib/validation";

export const GET = withStaff<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: {
      items: { include: { product: { select: { image: true } } } },
      user: { select: { id: true, fullName: true, email: true, phone: true, image: true } },
    },
  });

  if (!order) return notFound("Order not found");

  // Attach variant image fallback (no Prisma relation declared on OrderItem.variantId)
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
  const orderWithVariantImages = {
    ...order,
    items: order.items.map((i) => ({
      ...i,
      variantImage: i.variantId ? variantMap.get(i.variantId) || null : null,
    })),
  };

  return jsonResponse(serialize(orderWithVariantImages));
});

export const PUT = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const existing = await prisma.order.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Order not found");

  try {
    const body = await request.json();
    const parsed = adminOrderUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    const updateData: Prisma.OrderUncheckedUpdateInput = {};
    if (data.customer_name !== undefined) updateData.customerName = data.customer_name;
    if (data.customer_phone !== undefined) updateData.customerPhone = data.customer_phone;
    if (data.customer_email !== undefined) updateData.customerEmail = data.customer_email || null;
    if (data.customer_address !== undefined) updateData.customerAddress = data.customer_address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.zip_code !== undefined) updateData.zipCode = data.zip_code || null;
    // Guard: dispatched orders can't revert to pre-courier states. Mirrors
    // the same protection in /admin/orders/[id]/status/route.ts.
    if (data.status !== undefined) {
      const PRE_COURIER = new Set(["pending", "confirmed", "processing"]);
      const dispatched = Boolean(existing.courierSent && existing.consignmentId);
      updateData.status = (dispatched && PRE_COURIER.has(String(data.status))) ? "shipped" : data.status;
    }
    if (data.payment_status !== undefined) updateData.paymentStatus = data.payment_status;
    if (data.payment_method !== undefined) updateData.paymentMethod = data.payment_method;
    if (data.shipping_cost !== undefined) updateData.shippingCost = Number(data.shipping_cost);
    if (data.discount !== undefined) updateData.discount = Number(data.discount) || 0;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.courier_sent !== undefined) updateData.courierSent = Boolean(data.courier_sent);
    if (data.consignment_id !== undefined) updateData.consignmentId = data.consignment_id || null;
    if (data.courier_status !== undefined) updateData.courierStatus = data.courier_status || null;
    // courier_type lets admin tag an order with the provider it was sent to
    // outside the dashboard (e.g. manual Steadfast/Pathao entry through the
    // edit modal). Empty string from the form means "no courier" → null.
    if (data.courier_type !== undefined) {
      const ct = String(data.courier_type || "").toLowerCase();
      updateData.courierType = ct === "steadfast" || ct === "pathao" ? ct : null;
    }
    // If a consignment ID is being attached and no explicit courier_sent flag
    // was sent, treat it as courier-attached. Mirrors the "willHaveConsignment"
    // logic below but covers callers that only send consignment_id.
    if (data.consignment_id !== undefined && data.courier_sent === undefined) {
      updateData.courierSent = Boolean(data.consignment_id);
    }

    // Auto-flip order status → "shipped" the moment a parcel is attached to a
    // courier. This covers two paths that previously left status stuck on
    // "confirmed":
    //   1. Admin pastes a consignment ID into the inline input on the orders table.
    //   2. Admin toggles courier_sent manually without going through /courier/pathao.
    //
    // We also stamp courierSentAt so daily-dispatch analytics on the dashboard
    // count the order on the day the courier was actually engaged. Both fields
    // are set ONLY if the caller hasn't explicitly overridden status, and only
    // when the existing status is a pre-courier state. Never override delivered
    // / cancelled / trashed — those are terminal.
    const willHaveConsignment =
      data.consignment_id !== undefined
        ? Boolean(data.consignment_id)
        : Boolean(existing.consignmentId);
    const willBeCourierSent =
      data.courier_sent !== undefined
        ? Boolean(data.courier_sent)
        : Boolean(existing.courierSent);
    const attachedToCourier = willHaveConsignment || willBeCourierSent;
    const PRE_COURIER_STATUSES = new Set(["pending", "confirmed", "processing"]);
    const callerSetStatus = data.status !== undefined;

    if (attachedToCourier && !callerSetStatus && PRE_COURIER_STATUSES.has(existing.status)) {
      updateData.status = "shipped";
    }
    // Stamp courierSentAt once on first transition to "attached".
    if (attachedToCourier && !existing.courierSentAt) {
      updateData.courierSentAt = new Date();
    }

    // Recalculate totals
    if (data.subtotal !== undefined) updateData.subtotal = Number(data.subtotal);
    if (data.total !== undefined) updateData.total = Number(data.total);
    if (data.shipping_cost !== undefined && data.total === undefined) {
      updateData.total = Number(existing.subtotal) + Number(data.shipping_cost);
    }

    // Update items if provided
    if (data.items && Array.isArray(data.items)) {
      await prisma.orderItem.deleteMany({ where: { orderId: Number(id) } });
      await prisma.orderItem.createMany({
        // variantId/variantLabel must persist on edit too — without these the
        // saved order silently reverts to the parent product on reload, and
        // the courier description loses the variant label.
        data: data.items.map((i) => ({
          orderId: Number(id),
          productId: i.product_id || null,
          productName: i.product_name || "",
          variantId: i.variant_id ? Number(i.variant_id) : null,
          variantLabel: i.variant_label || null,
          price: Number(i.price),
          quantity: Number(i.quantity),
        })),
      });
    }

    const order = await prisma.order.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        items: true,
        user: { select: { id: true, fullName: true, email: true, phone: true, image: true } },
      },
    });

    bumpVersion("orders");
    return jsonResponse(serialize(order));
  } catch (error) {
    console.error("Order update error:", error);
    return errorResponse("Failed to update order", 500);
  }
});

// Order deletion (trash + hard delete) is admin-only. Staff can update
// status, send to courier, etc. but never destroy customer-facing data.
export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const existing = await prisma.order.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Order not found");

  // Hard delete only when explicitly forced OR already trashed.
  const force = request.nextUrl.searchParams.get("force") === "1";
  const alreadyTrashed = existing.status === "trashed";

  try {
    if (force || alreadyTrashed) {
      await prisma.$transaction([
        prisma.orderFingerprint.deleteMany({ where: { orderId: Number(id) } }),
        prisma.orderItem.deleteMany({ where: { orderId: Number(id) } }),
        prisma.order.delete({ where: { id: Number(id) } }),
      ]);
      bumpVersion("orders");
      return jsonResponse({ message: "Order permanently deleted" });
    }

    // Soft delete — flip status to "trashed"
    await prisma.order.update({
      where: { id: Number(id) },
      data: { status: "trashed" },
    });
    bumpVersion("orders");
    return jsonResponse({ message: "Order moved to trash" });
  } catch (error) {
    return errorResponse("Failed to delete order", 500);
  }
});
