import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";

async function shapeOrder(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { image: true } } } } },
  });
  if (!order) return null;
  const variantIds = order.items.map((i) => i.variantId).filter((v): v is number => !!v);
  const variantMap = new Map<number, string>();
  if (variantIds.length > 0) {
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, image: true },
    });
    for (const v of variants) if (v.image) variantMap.set(v.id, v.image);
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

// Mark order as dispatched to courier. Auto-flips status to "shipped" if it
// was still in a pre-courier state — same rule the admin PUT applies.
export const POST = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const orderId = Number(id);
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) return notFound("Order not found");

  try {
    const body = await request.json().catch(() => ({}));
    const { courier, weight, instructions } = body as {
      courier?: string;
      weight?: number;
      instructions?: string;
    };

    const ct = String(courier || "").toLowerCase();
    const courierType = ct === "steadfast" || ct === "pathao" ? ct : null;

    const updateData: Prisma.OrderUncheckedUpdateInput = {
      courierType,
      courierSent: true,
      courierSentAt: existing.courierSentAt ?? new Date(),
    };

    const PRE_COURIER = new Set(["pending", "confirmed", "processing"]);
    if (PRE_COURIER.has(existing.status)) {
      updateData.status = "shipped";
    }

    // Append weight + instructions to notes if provided so the merchant has a
    // record without needing extra columns. Schema doesn't have dedicated
    // courier-weight / courier-instructions fields.
    const noteParts: string[] = [];
    if (weight !== undefined && weight !== null) noteParts.push(`Courier weight: ${weight}`);
    if (instructions) noteParts.push(`Courier instructions: ${instructions}`);
    if (noteParts.length > 0) {
      const appended = noteParts.join("\n");
      updateData.notes = existing.notes ? `${existing.notes}\n${appended}` : appended;
    }

    await prisma.order.update({ where: { id: orderId }, data: updateData });
    revalidateAll("orders");
    bumpVersion("orders");
    const data = await shapeOrder(orderId);
    return jsonResponse({ data });
  } catch (error) {
    console.error("Mobile courier dispatch error:", error);
    return errorResponse("Failed to send to courier", 500);
  }
});
