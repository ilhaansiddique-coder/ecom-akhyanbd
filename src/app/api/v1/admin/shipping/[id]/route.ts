import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { shippingZoneSchema } from "@/lib/validation";

export const PUT = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
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

    revalidateAll("shipping");
    return jsonResponse(serialize(zone));
  } catch (error) {
    return errorResponse("Failed to update shipping zone", 500);
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const existing = await prisma.shippingZone.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Shipping zone not found");

  await prisma.shippingZone.delete({ where: { id: Number(id) } });
  revalidateAll("shipping");
  return jsonResponse({ message: "Shipping zone deleted" });
});
