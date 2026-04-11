import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { items: true, user: true },
  });

  if (!order) return notFound("Order not found");
  return jsonResponse(serialize(order));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

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
    if (body.status !== undefined) updateData.status = body.status;
    if (body.payment_status !== undefined) updateData.paymentStatus = body.payment_status;
    if (body.payment_method !== undefined) updateData.paymentMethod = body.payment_method;
    if (body.shipping_cost !== undefined) updateData.shippingCost = Number(body.shipping_cost);
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    // Recalculate total if shipping changed
    if (body.shipping_cost !== undefined) {
      updateData.total = Number(existing.subtotal) + Number(body.shipping_cost);
    }

    const order = await prisma.order.update({
      where: { id: Number(id) },
      data: updateData,
      include: { items: true, user: true },
    });

    bumpVersion("orders");
    return jsonResponse(serialize(order));
  } catch (error) {
    console.error("Order update error:", error);
    return errorResponse("Failed to update order", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.order.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Order not found");

  try {
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: Number(id) } }),
      prisma.order.delete({ where: { id: Number(id) } }),
    ]);

    bumpVersion("orders");
    return jsonResponse({ message: "Order deleted" });
  } catch (error) {
    return errorResponse("Failed to delete order", 500);
  }
}
