import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, validationError, notFound } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";

type BlockedIpRow = {
  id: number;
  ipAddress: string;
  reason: string | null;
  createdAt: Date | null;
};

function toBlockedIp(b: BlockedIpRow) {
  return {
    id: b.id,
    ipAddress: b.ipAddress,
    reason: b.reason,
    createdAt: b.createdAt?.toISOString() ?? null,
  };
}

export const GET = withAdmin(async () => {
  const rows = await prisma.blockedIp.findMany({ orderBy: { createdAt: "desc" } });
  return jsonResponse({ data: rows.map(toBlockedIp) });
});

export const POST = withAdmin(async (request) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const ipRaw = (body.ipAddress ?? body.ip_address) as unknown;
    const reasonRaw = body.reason as unknown;
    const ip = typeof ipRaw === "string" ? ipRaw.trim() : "";
    const reason = typeof reasonRaw === "string" && reasonRaw.trim() ? reasonRaw.trim() : "manual_block";

    if (!ip) {
      return validationError({ ipAddress: ["IP address is required"] });
    }

    const blocked = await prisma.blockedIp.upsert({
      where: { ipAddress: ip },
      update: { reason },
      create: { ipAddress: ip, reason },
    });

    revalidateAll("fraud");
    bumpVersion("fraud");
    return jsonResponse({ data: toBlockedIp(blocked) }, 201);
  } catch {
    return errorResponse("Failed to block IP", 500);
  }
});

export const DELETE = withAdmin(async (request) => {
  const ip = request.nextUrl.searchParams.get("ip")?.trim();
  if (!ip) return validationError({ ip: ["ip query parameter is required"] });

  const existing = await prisma.blockedIp.findUnique({ where: { ipAddress: ip } });
  if (!existing) return notFound("Blocked IP not found");

  await prisma.blockedIp.delete({ where: { ipAddress: ip } });
  revalidateAll("fraud");
  bumpVersion("fraud");
  return jsonResponse({ data: { ipAddress: ip, deleted: true } });
});
