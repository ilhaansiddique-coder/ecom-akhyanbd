import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound } from "@/lib/api-response";

/**
 * GET /api/v1/orders/token/[token] — Public order lookup by token
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const order = await prisma.order.findUnique({
    where: { orderToken: token },
    include: { items: true },
  });

  if (!order) return notFound("Order not found");

  return jsonResponse(serialize(order));
}
