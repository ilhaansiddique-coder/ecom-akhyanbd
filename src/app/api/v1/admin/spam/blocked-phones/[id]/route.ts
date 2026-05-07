import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";

export const DELETE = withStaff<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const existing = await prisma.blockedPhone.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Blocked phone not found");

  try {
    await prisma.blockedPhone.delete({ where: { id: Number(id) } });
    bumpVersion("fraud", { kind: "fraud.phone_unblocked", title: "Phone unblocked", body: existing.phone, severity: "info" });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Failed to unblock phone", 500);
  }
});
