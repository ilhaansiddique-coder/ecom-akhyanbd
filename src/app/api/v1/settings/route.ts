import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";

// Keys that must NEVER be exposed to the public
const PRIVATE_KEYS = new Set([
  "fb_capi_access_token",
  "steadfast_api_key",
  "steadfast_secret_key",
  "smtp_pass",
]);

export async function GET() {
  const settings = await prisma.siteSetting.findMany();

  // Return as key-value object, filtering out secrets
  const result: Record<string, string | null> = {};
  for (const s of settings) {
    if (PRIVATE_KEYS.has(s.key)) continue;
    result[s.key] = s.value;
  }

  return jsonResponse(result);
}
