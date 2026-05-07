import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { shippingZoneSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

export const GET = withAdmin(async (_request) => {
  const zones = await prisma.shippingZone.findMany({
    orderBy: { name: "asc" },
  });

  return jsonResponse(zones.map(serialize));
});

export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json();
    const parsed = shippingZoneSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    const zone = await prisma.shippingZone.create({
      data: {
        name: data.name,
        cities: JSON.stringify(data.cities),
        rate: data.rate,
        estimatedDays: data.estimated_days ?? null,
        isActive: data.is_active ?? true,
      },
    });

    revalidateAll("shipping");
    bumpVersion("shipping", { kind: "shipping.zone_created", title: "Shipping zone added", body: zone.name, severity: "info" });
    return jsonResponse(serialize(zone), 201);
  } catch (error) {
    return errorResponse("Failed to create shipping zone", 500);
  }
});
