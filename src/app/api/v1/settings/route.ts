import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";

export async function GET() {
  const settings = await prisma.siteSetting.findMany();

  // Return as key-value object (matches Laravel format)
  const result: Record<string, string | null> = {};
  for (const s of settings) {
    result[s.key] = s.value;
  }

  return jsonResponse(result);
}
