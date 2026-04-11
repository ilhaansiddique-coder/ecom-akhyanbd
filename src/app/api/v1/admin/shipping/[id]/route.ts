import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { shippingZoneSchema } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.shippingZone.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Shipping zone not found");

  try {
    const body = await request.json();
    const parsed = shippingZoneSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const zone = await prisma.shippingZone.update({
      where: { id: Number(id) },
      data: {
        name: data.name,
        cities: JSON.stringify(data.cities),
        rate: data.rate,
        estimatedDays: data.estimated_days ?? null,
        isActive: data.is_active ?? true,
      },
    });

    revalidateTag("shipping", "max");
    return jsonResponse(serialize(zone));
  } catch (error) {
    return errorResponse("Failed to update shipping zone", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;
  const existing = await prisma.shippingZone.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Shipping zone not found");

  await prisma.shippingZone.delete({ where: { id: Number(id) } });
  revalidateTag("shipping", "max");
  return jsonResponse({ message: "Shipping zone deleted" });
}
