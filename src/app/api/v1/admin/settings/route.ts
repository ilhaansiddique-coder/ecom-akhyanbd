import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { clearSmtpCache, clearEmailBrandCache } from "@/lib/email";
import { clearEmailTemplatesCache } from "@/lib/email-templates";

export const GET = withAdmin(async (_request) => {
  const settings = await prisma.siteSetting.findMany();

  // Sensitive keys — mask in API response (write-only)
  const SENSITIVE_KEYS = new Set([
    "smtp_pass",
    "steadfast_api_key",
    "steadfast_secret_key",
    "fb_capi_access_token",
    "pathao_client_secret",
    "pathao_password",
    "pathao_access_token",
    "pathao_refresh_token",
    "pathao_web_token",
  ]);

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
});

export const PUT = withAdmin(async (request) => {
  try {
    const body = await request.json();

    // Skip masked values — don't overwrite secrets with "••••••••"
    const incoming = Object.entries(body).filter(([_, v]) => v !== "••••••••");
    if (incoming.length === 0) return jsonResponse({ message: "Nothing to update" });

    // Only upsert keys whose value actually changed — saves N round trips per save.
    const keys = incoming.map(([k]) => k);
    const existing = await prisma.siteSetting.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    });
    const existingMap = new Map(existing.map((r) => [r.key, r.value]));

    const changed = incoming.filter(([k, v]) => existingMap.get(k) !== (v as string));
    if (changed.length === 0) {
      return jsonResponse({ message: "No changes" });
    }

    // Run upserts in parallel (no transaction needed — independent rows, idempotent).
    await Promise.all(
      changed.map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value: value as string },
          create: { key, value: value as string },
        })
      )
    );

    revalidateAll("settings");
    clearSmtpCache();
    // Bust email brand cache so next email picks up new theme/lang/site_name.
    clearEmailBrandCache();
    // Bust email templates cache if the customizer was saved.
    if (changed.some(([k]) => k === "email_templates")) {
      clearEmailTemplatesCache();
    }
    return jsonResponse({ message: "Settings updated", changed: changed.length });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return errorResponse("Failed to update settings", 500);
  }
});
