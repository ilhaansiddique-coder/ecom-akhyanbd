import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { orderStatusSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

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
    const parsed = orderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { status: data.status };
    if (data.payment_status) updateData.paymentStatus = data.payment_status;

    const order = await prisma.order.update({
      where: { id: Number(id) },
      data: updateData,
      include: { items: true },
    });

    revalidateAll("orders");
    bumpVersion("orders");
    return jsonResponse(serialize(order));
  } catch (error) {
    return errorResponse("Failed to update order status", 500);
  }
}
