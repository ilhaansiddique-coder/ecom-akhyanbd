import { jsonResponse } from "@/lib/api-response";
import { getAllSettings } from "@/lib/settingsCache";

// Keys that must NEVER be exposed to the public.
// Filter applied after cache read so the cache itself stays a single shared
// dataset and we don't carve up multiple variants.
// Mirrors the layout.tsx PRIVATE_KEYS list — keep in sync.
const PRIVATE_KEYS = new Set([
  "fb_capi_access_token",
  "fb_test_event_code",
  "steadfast_api_key",
  "steadfast_secret_key",
  "smtp_pass",
  "smtp_user",
  "pathao_client_id",
  "pathao_client_secret",
  "pathao_username",
  "pathao_password",
  "pathao_access_token",
  "pathao_refresh_token",
  "pathao_token_expires_at",
  "pathao_web_token",
  "pathao_web_token_auto",
  "admin_email",
]);

export async function GET() {
  const all = await getAllSettings();
  const result: Record<string, string | null> = {};
  for (const key of Object.keys(all)) {
    if (PRIVATE_KEYS.has(key)) continue;
    result[key] = all[key];
  }
  return jsonResponse(result);
}
