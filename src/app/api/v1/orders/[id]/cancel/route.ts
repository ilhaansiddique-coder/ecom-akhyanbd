import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound, unauthorized, errorResponse } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id: Number(id), userId: user.id },
    include: { items: true },
  });

  if (!order) return notFound("Order not found");
  if (order.status !== "pending") {
    return errorResponse("শুধুমাত্র পেন্ডিং অর্ডার বাতিল করা যায়।", 422);
  }

  // Cancel and restore stock
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
await prisma.$transaction(async (tx: any) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "cancelled" },
    });

    for (const item of order.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            soldCount: { decrement: item.quantity },
          },
        });
      }
    }
  });

  const updated = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true },
  });

  return jsonResponse(serialize(updated));
}
