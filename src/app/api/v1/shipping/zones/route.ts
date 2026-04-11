import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse } from "@/lib/api-response";

export async function GET() {
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true },
  });

  return jsonResponse(zones.map(serialize));
}
