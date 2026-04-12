import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { clearSmtpCache } from "@/lib/email";

export async function GET(_request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const settings = await prisma.siteSetting.findMany();

  // Sensitive keys — mask in API response (write-only)
  const SENSITIVE_KEYS = new Set(["smtp_pass", "steadfast_api_key", "steadfast_secret_key"]);

  // Convert to key-value object, masking sensitive values
  const result: Record<string, string | null> = {};
  for (const setting of settings) {
    if (SENSITIVE_KEYS.has(setting.key) && setting.value) {
      result[setting.key] = "••••••••";
    } else {
      result[setting.key] = setting.value;
    }
  }

  return jsonResponse(result);
}

export async function PUT(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const body = await request.json();

    // Skip masked values — don't overwrite secrets with "••••••••"
    const entries = Object.entries(body).filter(([_, value]) => value !== "••••••••");
    const updates = entries.map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      })
    );

    await prisma.$transaction(updates);

    revalidateAll("settings");
    clearSmtpCache();
    return jsonResponse({ message: "Settings updated" });
  } catch (error) {
    return errorResponse("Failed to update settings", 500);
  }
}
