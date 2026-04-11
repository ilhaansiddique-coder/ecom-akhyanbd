import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateShippingSchema } from "@/lib/validation";
import { jsonResponse, validationError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = calculateShippingSchema.safeParse(body);
  if (!parsed.success) return validationError({ city: ["শহরের নাম দিন।"] });

  const { city } = parsed.data;
  const cityLower = city.toLowerCase();

  const zones = await prisma.shippingZone.findMany({ where: { isActive: true } });

  for (const zone of zones) {
    const cities = JSON.parse(zone.cities) as string[];
    if (cities.some((c: string) => c.toLowerCase() === cityLower)) {
      const r = Number(zone.rate);
      return jsonResponse({
        rate: r,
        shipping_cost: r,
        estimated_days: zone.estimatedDays,
      });
    }
  }

  // Default rate
  return jsonResponse({ rate: 60, shipping_cost: 60, estimated_days: "3-5 days" });
}
