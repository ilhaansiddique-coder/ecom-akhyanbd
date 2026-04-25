import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Admin-only: staff lost real captures by accidentally clicking the trash
  // icon. Locking deletion to admin keeps the abandonment data intact.
  try { await requireAdmin(); } catch (e) { return e as Response; }
  try {
    const { id } = await params;
    const idNum = Number(id);
    if (!idNum) return notFound("Invalid id");
    await prisma.incompleteOrder.delete({ where: { id: idNum } }).catch(() => null);
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("[IncompleteOrder] delete error:", e);
    return errorResponse("Failed", 500);
  }
}
