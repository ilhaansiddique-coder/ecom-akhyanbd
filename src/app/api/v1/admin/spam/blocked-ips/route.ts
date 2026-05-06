import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";

export const GET = withStaff(async (request) => {
  const ips = await prisma.blockedIp.findMany({ orderBy: { createdAt: "desc" } });
  return jsonResponse(ips.map(serialize));
});

export const POST = withStaff(async (request) => {
  const body = await request.json();
  const { ip_address, reason } = body;

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

  return jsonResponse(serialize(blocked), 201);
});
