import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";

// Admin-only: staff lost real captures by accidentally clicking the trash
// icon. Locking deletion to admin keeps the abandonment data intact.
export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  try {
    const { id } = await params;
    const idNum = Number(id);
    if (!idNum) return notFound("Invalid id");
    await prisma.incompleteOrder.delete({ where: { id: idNum } }).catch(() => null);
    bumpVersion("orders");
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("[IncompleteOrder] delete error:", e);
    return errorResponse("Failed", 500);
  }
});
