import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { blockedIpSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

export const GET = withStaff(async (request) => {
  const ips = await prisma.blockedIp.findMany({ orderBy: { createdAt: "desc" } });
  return jsonResponse(ips.map(serialize));
});

export const POST = withStaff(async (request) => {
  const body = await request.json();
  const parsed = blockedIpSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const { ip_address, reason } = parsed.data;

  if (!ip_address?.trim()) {
    return validationError({ ip_address: ["IP address is required"] });
  }

  const existing = await prisma.blockedIp.findUnique({ where: { ipAddress: ip_address.trim() } });
  if (existing) {
    return jsonResponse(serialize(existing));
  }

  const blocked = await prisma.blockedIp.create({
    data: { ipAddress: ip_address.trim(), reason: reason || "manual_block" },
  });

  bumpVersion("fraud", { kind: "fraud.ip_blocked", title: "IP blocked", body: blocked.ipAddress, severity: "alert" });
  return jsonResponse(serialize(blocked), 201);
});
