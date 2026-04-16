import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.blockedIp.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Blocked IP not found");

  try {
    await prisma.blockedIp.delete({ where: { id: Number(id) } });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Failed to unblock IP", 500);
  }
}
