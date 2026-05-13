import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";

// Used by the Flutter admin app (rootBase: /api/v1/admin/orders/[id]/flag).
// Mirrors /m/orders/[id]/flag — raise riskScore + append a note.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.order.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Order not found");

  const body = (await request.json().catch(() => ({}))) as { reason?: string | null };
  const reason = body.reason?.trim() || null;
  const mergedNotes = reason
    ? `${existing.notes ? existing.notes + "\n" : ""}[Flagged: ${reason}]`
    : existing.notes;

  const updated = await prisma.order.update({
    where: { id: Number(id) },
    data: {
      riskScore: Math.max(70, existing.riskScore ?? 70),
      notes: mergedNotes,
    },
    include: { items: true },
  });

  bumpVersion("orders");
  return jsonResponse(serialize(updated));
}
