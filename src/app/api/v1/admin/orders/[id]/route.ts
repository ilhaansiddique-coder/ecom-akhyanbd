import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { withAdmin, withStaff } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (body.customer_name !== undefined) updateData.customerName = body.customer_name;
    if (body.customer_phone !== undefined) updateData.customerPhone = body.customer_phone;
    if (body.customer_email !== undefined) updateData.customerEmail = body.customer_email || null;
    if (body.customer_address !== undefined) updateData.customerAddress = body.customer_address;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.zip_code !== undefined) updateData.zipCode = body.zip_code || null;
    // Guard: dispatched orders can't revert to pre-courier states. Mirrors
    // the same protection in /admin/orders/[id]/status/route.ts.
    if (body.status !== undefined) {
      const PRE_COURIER = new Set(["pending", "confirmed", "processing"]);
      const dispatched = Boolean(existing.courierSent && existing.consignmentId);
      updateData.status = (dispatched && PRE_COURIER.has(String(body.status))) ? "shipped" : body.status;
    }
    if (body.payment_status !== undefined) updateData.paymentStatus = body.payment_status;
    if (body.payment_method !== undefined) updateData.paymentMethod = body.payment_method;
    if (body.shipping_cost !== undefined) updateData.shippingCost = Number(body.shipping_cost);
    if (body.discount !== undefined) updateData.discount = Number(body.discount) || 0;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.courier_sent !== undefined) updateData.courierSent = Boolean(body.courier_sent);
    if (body.consignment_id !== undefined) updateData.consignmentId = body.consignment_id || null;
    if (body.courier_status !== undefined) updateData.courierStatus = body.courier_status || null;
    // courier_type lets admin tag an order with the provider it was sent to
    // outside the dashboard (e.g. manual Steadfast/Pathao entry through the
    // edit modal). Empty string from the form means "no courier" → null.
    if (body.courier_type !== undefined) {
      const ct = String(body.courier_type || "").toLowerCase();
      updateData.courierType = ct === "steadfast" || ct === "pathao" ? ct : null;
    }
    // If a consignment ID is being attached and no explicit courier_sent flag
    // was sent, treat it as courier-attached. Mirrors the "willHaveConsignment"
    // logic below but covers callers that only send consignment_id.
    if (body.consignment_id !== undefined && body.courier_sent === undefined) {
      updateData.courierSent = Boolean(body.consignment_id);
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
      body.consignment_id !== undefined
        ? Boolean(body.consignment_id)
        : Boolean(existing.consignmentId);
    const willBeCourierSent =
      body.courier_sent !== undefined
        ? Boolean(body.courier_sent)
        : Boolean(existing.courierSent);
    const attachedToCourier = willHaveConsignment || willBeCourierSent;
    const PRE_COURIER_STATUSES = new Set(["pending", "confirmed", "processing"]);
    const callerSetStatus = body.status !== undefined;

    if (attachedToCourier && !callerSetStatus && PRE_COURIER_STATUSES.has(existing.status)) {
      updateData.status = "shipped";
    }
    // Stamp courierSentAt once on first transition to "attached".
    if (attachedToCourier && !existing.courierSentAt) {
      updateData.courierSentAt = new Date();
    }

    // Recalculate totals
    if (body.subtotal !== undefined) updateData.subtotal = Number(body.subtotal);
    if (body.total !== undefined) updateData.total = Number(body.total);
    if (body.shipping_cost !== undefined && body.total === undefined) {
      updateData.total = Number(existing.subtotal) + Number(body.shipping_cost);
    }

    // Update items if provided
    if (body.items && Array.isArray(body.items)) {
      await prisma.orderItem.deleteMany({ where: { orderId: Number(id) } });
      await prisma.orderItem.createMany({
        // variantId/variantLabel must persist on edit too — without these the
        // saved order silently reverts to the parent product on reload, and
        // the courier description loses the variant label.
        data: body.items.map((i: any) => ({
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
