import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound, errorResponse, validationError } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { deviceStatusSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

export const GET = withStaff<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const device = await prisma.deviceFingerprint.findUnique({
    where: { id: Number(id) },
    include: {
      orderFingerprints: {
        include: {
          order: {
            select: {
              id: true, customerName: true, customerPhone: true,
              customerAddress: true, city: true, total: true, status: true,
              paymentMethod: true, createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!device) return notFound("Device not found");

  return jsonResponse(serialize(device));
});

export const PUT = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();
  const parsed = deviceStatusSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const { status, blockReason } = parsed.data;

  const existing = await prisma.deviceFingerprint.findUnique({
    where: { id: Number(id) },
    select: { id: true, fpHash: true, lastIp: true },
  });
  if (!existing) return notFound("Device not found");

  try {
    const updateData: Prisma.DeviceFingerprintUncheckedUpdateInput = {};

    if (status === "blocked") {
      updateData.status = "blocked";
      updateData.blockedAt = new Date();
      updateData.blockReason = blockReason || "manual_block";

      // Also block associated IP
      if (existing.lastIp) {
        await prisma.blockedIp.upsert({
          where: { ipAddress: existing.lastIp },
          update: { reason: `device_block fp=${existing.fpHash.slice(0, 8)}` },
          create: { ipAddress: existing.lastIp, reason: `device_block fp=${existing.fpHash.slice(0, 8)}` },
        }).catch(() => {});
      }
    } else if (status === "safe") {
      updateData.status = "safe";
      updateData.blockedAt = null;
      updateData.blockReason = null;

      // Remove IP from block list if it was blocked for this device
      if (existing.lastIp) {
        await prisma.blockedIp.deleteMany({
          where: { ipAddress: existing.lastIp, reason: { contains: existing.fpHash.slice(0, 8) } },
        }).catch(() => {});
      }
    } else if (status === "active") {
      updateData.status = "active";
      updateData.blockedAt = null;
      updateData.blockReason = null;
    }

    const updated = await prisma.deviceFingerprint.update({
      where: { id: Number(id) },
      data: updateData,
    });

    bumpVersion("fraud", {
      kind: status === "blocked" ? "fraud.device_blocked" : "fraud.device_status_changed",
      title: status === "blocked" ? "Device blocked" : `Device set to ${status}`,
      body: `fp ${existing.fpHash.slice(0, 8)}`,
      severity: status === "blocked" ? "alert" : "info",
    });
    return jsonResponse(serialize(updated));
  } catch {
    return errorResponse("Failed to update device", 500);
  }
});
