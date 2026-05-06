import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, validationError, notFound } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";

// BlockedDevice projection for mobile.
// seenCount = number of OrderFingerprint rows tied to this fpHash.
// riskScore = max risk across linked orders (fallback to the device row's own
// riskScore, then 0).
async function buildBlockedDevice(d: {
  id: number;
  fpHash: string;
  lastIp: string | null;
  platform: string | null;
  blockReason: string | null;
  blockedAt: Date | null;
  riskScore: number;
}) {
  const [seenCount, maxOrderRisk] = await Promise.all([
    prisma.orderFingerprint.count({ where: { fpHash: d.fpHash } }),
    prisma.orderFingerprint.aggregate({
      where: { fpHash: d.fpHash },
      _max: { riskScore: true },
    }),
  ]);
  return {
    id: d.id,
    fpHash: d.fpHash,
    lastIp: d.lastIp,
    platform: d.platform,
    blockReason: d.blockReason,
    blockedAt: d.blockedAt?.toISOString() ?? null,
    seenCount,
    riskScore: Math.max(d.riskScore ?? 0, maxOrderRisk._max.riskScore ?? 0, 0),
  };
}

export const GET = withAdmin(async () => {
  const devices = await prisma.deviceFingerprint.findMany({
    where: { status: "blocked" },
    orderBy: { blockedAt: "desc" },
    select: {
      id: true,
      fpHash: true,
      lastIp: true,
      platform: true,
      blockReason: true,
      blockedAt: true,
      riskScore: true,
    },
  });

  const data = await Promise.all(devices.map(buildBlockedDevice));
  return jsonResponse({ data });
});

export const POST = withAdmin(async (request) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const fpRaw = body.fpHash as unknown;
    const reasonRaw = body.reason as unknown;
    const fpHash = typeof fpRaw === "string" ? fpRaw.trim() : "";
    const reason =
      typeof reasonRaw === "string" && reasonRaw.trim() ? reasonRaw.trim() : "manual_block";

    if (!fpHash) {
      return validationError({ fpHash: ["fpHash is required"] });
    }

    const now = new Date();
    const device = await prisma.deviceFingerprint.upsert({
      where: { fpHash },
      update: { status: "blocked", blockReason: reason, blockedAt: now },
      create: { fpHash, status: "blocked", blockReason: reason, blockedAt: now },
      select: {
        id: true,
        fpHash: true,
        lastIp: true,
        platform: true,
        blockReason: true,
        blockedAt: true,
        riskScore: true,
      },
    });

    bumpVersion("spam");
    return jsonResponse({ data: await buildBlockedDevice(device) }, 201);
  } catch {
    return errorResponse("Failed to block device", 500);
  }
});

export const DELETE = withAdmin(async (request) => {
  const fpHash = request.nextUrl.searchParams.get("fpHash")?.trim();
  if (!fpHash) return validationError({ fpHash: ["fpHash query parameter is required"] });

  const existing = await prisma.deviceFingerprint.findUnique({ where: { fpHash } });
  if (!existing) return notFound("Device fingerprint not found");

  // Schema default for status is "active" — restore to that on unblock.
  await prisma.deviceFingerprint.update({
    where: { fpHash },
    data: { status: "active", blockReason: null, blockedAt: null },
  });

  bumpVersion("spam");
  return jsonResponse({ data: { fpHash, deleted: true } });
});
