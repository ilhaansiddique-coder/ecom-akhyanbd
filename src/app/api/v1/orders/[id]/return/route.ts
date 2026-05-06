import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, validationError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return errorResponse("Invalid order ID", 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return errorResponse("Order not found", 404);
  }

  // Verify user owns the order
  if (order.userId !== user.id) {
    return errorResponse("Unauthorized", 403);
  }

  // Only allow returns on completed or delivered orders
  if (!["completed", "delivered"].includes(order.status)) {
    return validationError({ status: ["This order cannot be returned. Only delivered orders can be returned."] });
  }

  const body = await request.json();
  const { reason, description, images } = body;

  if (!reason) {
    return validationError({ reason: ["Return reason is required"] });
  }

  const validReasons = ["defective", "wrong_item", "not_as_described", "other"];
  if (!validReasons.includes(reason)) {
    return validationError({ reason: [`Invalid reason. Must be one of: ${validReasons.join(", ")}`] });
  }

  const orderReturn = await prisma.orderReturn.create({
    data: {
      orderId,
      reason,
      description: description || null,
      images: images ? JSON.stringify(images) : null,
      status: "pending",
    },
  });

  return jsonResponse({
    id: orderReturn.id,
    order_id: orderReturn.orderId,
    reason: orderReturn.reason,
    description: orderReturn.description,
    images: orderReturn.images ? JSON.parse(orderReturn.images) : null,
    status: orderReturn.status,
    created_at: orderReturn.createdAt,
  }, 201);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return errorResponse("Invalid order ID", 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return errorResponse("Order not found", 404);
  }

  // Verify user owns the order
  if (order.userId !== user.id) {
    return errorResponse("Unauthorized", 403);
  }

  const returns = await prisma.orderReturn.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

  return jsonResponse(
    returns.map((ret) => ({
      id: ret.id,
      order_id: ret.orderId,
      reason: ret.reason,
      description: ret.description,
      images: ret.images ? JSON.parse(ret.images) : null,
      status: ret.status,
      refund_amount: ret.refundAmount,
      notes: ret.notes,
      created_at: ret.createdAt,
      updated_at: ret.updatedAt,
    }))
  );
}
