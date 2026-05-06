import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";
import { calculateRiskScore, isValidBDPhone, isGibberishName } from "@/lib/spamDetection";
import { getClientIp } from "@/lib/fbcapi";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fpHash,
      canvasHash, webglHash, audioHash,
      screenResolution, platform, timezone, languages,
      cpuCores, memoryGb, touchPoints,
      behavioral,
      orderContext, // { phone, address, name } — for scoring at fingerprint time
    } = body;

    if (!fpHash) return jsonResponse({ message: "Missing fpHash" }, 200);

    const ip = getClientIp(request);
    const ua = request.headers.get("user-agent") || undefined;

    // Check if already blocked
    const [existing, blockedIp] = await Promise.all([
      prisma.deviceFingerprint.findUnique({ where: { fpHash }, select: { id: true, status: true, seenCount: true } }),
      prisma.blockedIp.findUnique({ where: { ipAddress: ip }, select: { id: true } }),
    ]);

    const isBlocked = existing?.status === "blocked" || !!blockedIp;

    // Calculate risk score from behavioral + order context signals
    const behavioralSignals = behavioral || {};
    const orderPatternSignals = orderContext ? {
      phoneValid: isValidBDPhone(orderContext.phone || ""),
      addressLength: (orderContext.address || "").trim().length,
      nameLength: (orderContext.name || "").trim().length,
      recentOrdersFromFp: 0,
    } : {};

    const { score, flags } = calculateRiskScore(behavioralSignals, {
      canvasHash, webglHash, audioHash,
    }, orderPatternSignals);

    // Check recent order velocity
    let recentOrders = 0;
    if (existing?.id) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      recentOrders = await prisma.orderFingerprint.count({
        where: {
          deviceFingerprintId: existing.id,
          createdAt: { gte: oneHourAgo },
        },
      });
    }

    // Re-score with velocity
    const { score: finalScore, flags: finalFlags } = calculateRiskScore(
      behavioralSignals,
      { canvasHash, webglHash, audioHash },
      { ...orderPatternSignals, recentOrdersFromFp: recentOrders }
    );

    // Auto-block if score >= 85 or honeypot triggered
    const autoBlock = finalScore >= 85 || behavioralSignals.honeypotTriggered === true;

    // Upsert DeviceFingerprint
    if (existing) {
      await prisma.deviceFingerprint.update({
        where: { fpHash },
        data: {
          lastIp: ip,
          userAgent: ua,
          riskScore: Math.max(existing.seenCount > 0 ? finalScore : 0, finalScore),
          status: autoBlock && existing.status !== "safe" ? "blocked" : existing.status,
          seenCount: { increment: 1 },
          lastSeenAt: new Date(),
          blockReason: autoBlock && existing.status !== "safe" ? "auto_block_high_risk" : undefined,
        },
      });
    } else {
      await prisma.deviceFingerprint.create({
        data: {
          fpHash,
          canvasHash: canvasHash || null,
          webglHash: webglHash || null,
          audioHash: audioHash || null,
          screenResolution: screenResolution || null,
          platform: platform || null,
          timezone: timezone || null,
          languages: languages || null,
          cpuCores: cpuCores || null,
          memoryGb: memoryGb || null,
          touchPoints: touchPoints || null,
          userAgent: ua || null,
          lastIp: ip,
          riskScore: finalScore,
          status: autoBlock ? "blocked" : "active",
          seenCount: 1,
          lastSeenAt: new Date(),
          blockReason: autoBlock ? "auto_block_high_risk" : null,
        },
      });
    }

    // Add IP to block list if auto-blocked
    if (autoBlock && ip && ip !== "unknown") {
      await prisma.blockedIp.upsert({
        where: { ipAddress: ip },
        update: {},
        create: { ipAddress: ip, reason: `auto_block score=${finalScore}` },
      }).catch(() => {});
    }

    const shouldBlock = isBlocked || autoBlock;

    // Set or clear blocked cookie so middleware can check without DB
    const res = jsonResponse({
      message: "ok",
      blocked: shouldBlock,
      score: finalScore,
      flags: finalFlags,
    });

    if (shouldBlock) {
      res.headers.set("Set-Cookie", "blocked=1;Path=/;Max-Age=31536000;SameSite=Lax");
    } else {
      // Always clear blocked cookie if not blocked — handles unblock case
      res.headers.set("Set-Cookie", "blocked=;Path=/;Max-Age=0;SameSite=Lax");
    }

    return res;
  } catch {
    return jsonResponse({ message: "ok" });
  }
}
