import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string } > }
) {
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return errorResponse("Invalid order ID", 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order) {
    return notFound("Order not found");
  }

  // Check authorization - user owns order or it's a guest order they have access to
  const user = await getSessionUser();
  if (user && order.userId !== user.id) {
    return errorResponse("Unauthorized", 403);
  }

  // Format invoice data
  const invoice = {
    id: order.id,
    order_token: order.orderToken,
    status: order.status,
    payment_status: order.paymentStatus,
    created_at: order.createdAt,
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
      address: order.customerAddress,
      city: order.city,
      zip_code: order.zipCode,
    },
    items: order.items.map((item) => ({
      id: item.id,
      product_id: item.productId,
      product_name: item.productName,
      variant_label: item.variantLabel,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
    })),
    summary: {
      subtotal: order.subtotal,
      shipping_cost: order.shippingCost,
      discount: order.discount,
      total: order.total,
    },
    shipping_info: {
      courier_type: order.courierType,
      tracking_id: order.consignmentId,
      status: order.courierStatus,
    },
  };

  return jsonResponse(invoice);
}
