import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdmin(); } catch (e) { return e as Response; }

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
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const body = await request.json();
  const { status, blockReason } = body;

  const existing = await prisma.deviceFingerprint.findUnique({
    where: { id: Number(id) },
    select: { id: true, fpHash: true, lastIp: true },
  });
  if (!existing) return notFound("Device not found");

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

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

    return jsonResponse(serialize(updated));
  } catch {
    return errorResponse("Failed to update device", 500);
  }
}
