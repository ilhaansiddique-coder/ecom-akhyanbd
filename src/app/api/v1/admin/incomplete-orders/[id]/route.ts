import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(); } catch (e) { return e as Response; }
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
