import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET(
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

  return jsonResponse(serialize(order));
}
