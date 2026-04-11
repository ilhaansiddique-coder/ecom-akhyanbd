import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { shippingZoneSchema } from "@/lib/validation";

export async function GET(_request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const zones = await prisma.shippingZone.findMany({
    orderBy: { name: "asc" },
  });

  return jsonResponse(zones.map(serialize));
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

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

    revalidateTag("shipping", "max");
    return jsonResponse(serialize(zone), 201);
  } catch (error) {
    return errorResponse("Failed to create shipping zone", 500);
  }
}
