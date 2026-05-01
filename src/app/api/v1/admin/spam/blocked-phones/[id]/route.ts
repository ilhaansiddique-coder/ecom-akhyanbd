import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.blockedPhone.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Blocked phone not found");

  try {
    await prisma.blockedPhone.delete({ where: { id: Number(id) } });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Failed to unblock phone", 500);
  }
}
