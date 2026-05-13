import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";

// Used by the Flutter admin app (rootBase: /api/v1/admin/orders/[id]/dispatch).
// Marks the order as sent to a courier; mirrors the mobile /m/orders/[id]/courier
// route. Staff-only.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.order.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Order not found");

  const body = (await request.json().catch(() => ({}))) as {
    courier?: string;
    weight?: number;
    instructions?: string | null;
  };
  const courier = (body.courier || "").trim();
  if (!courier) return errorResponse("courier is required", 422);

  const mergedNotes = body.instructions
    ? `${existing.notes ? existing.notes + "\n" : ""}[Courier instructions: ${body.instructions}]`
    : existing.notes;

  const updated = await prisma.order.update({
    where: { id: Number(id) },
    data: {
      courierType: courier,
      courierSent: true,
      courierSentAt: existing.courierSentAt ?? new Date(),
      status:
        existing.status === "pending" || existing.status === "confirmed"
          ? "courier_sent"
          : existing.status,
      notes: mergedNotes,
    },
    include: { items: true },
  });

  bumpVersion("orders");
  return jsonResponse(serialize(updated));
}
