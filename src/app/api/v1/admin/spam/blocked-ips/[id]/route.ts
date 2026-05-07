import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";

export const DELETE = withStaff<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const existing = await prisma.blockedIp.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Blocked IP not found");

  try {
    await prisma.blockedIp.delete({ where: { id: Number(id) } });
    bumpVersion("fraud", { kind: "fraud.ip_unblocked", title: "IP unblocked", body: existing.ipAddress, severity: "info" });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Failed to unblock IP", 500);
  }
});
