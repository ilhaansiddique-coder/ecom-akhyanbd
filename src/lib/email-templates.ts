/**
 * Email Templates helper (Next.js side).
 *
 * Reads admin-customizable email content stored as JSON under the
 * `email_templates` site setting. Provides a localized getter with
 * `{{variable}}` substitution. Cached for 5 minutes to keep email
 * sending fast — bust via `clearEmailTemplatesCache()` after a save.
 */

import { prisma } from "@/lib/prisma";
import { toBilingual } from "@/lib/bilingual";

let cache: Record<string, unknown> | null = null;
let cacheTime = 0;
const TTL = 5 * 60 * 1000;

export function clearEmailTemplatesCache() {
  cache = null;
  cacheTime = 0;
}

async function loadTemplates(): Promise<Record<string, unknown>> {
  if (cache && Date.now() - cacheTime < TTL) return cache;
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "email_templates" } });
    cache = row?.value ? JSON.parse(row.value) : {};
    cacheTime = Date.now();
    return cache!;
  } catch {
    return {};
  }
}

/**
 * Get a bilingual template field with optional variable substitution.
 * `vars` keys (without braces) get replaced into the resolved string.
 * Falls back to fallback if missing.
 */
export async function getEmailTemplate(
  template: string,
  field: string,
  lang: "en" | "bn",
  vars: Record<string, string | number> = {},
  fallback: string = "",
): Promise<string> {
  const data = await loadTemplates();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldVal = (data?.[template] as any)?.[field];
  const bilingual = toBilingual(fieldVal);
  let text = bilingual[lang] || bilingual.en || bilingual.bn || fallback;
  for (const [k, v] of Object.entries(vars)) {
    text = text.split(`{{${k}}}`).join(String(v));
  }
  return text;
}

/**
 * Read a boolean field (e.g. show_customer_info). Treats undefined/null as
 * `fallback` so absent saved data keeps the default. Accepts true/false,
 * 0/1, and "true"/"false"/"1"/"0" strings for legacy compat.
 */
export async function getEmailTemplateBool(
  template: string,
  field: string,
  fallback: boolean = true,
): Promise<boolean> {
  const data = await loadTemplates();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (data?.[template] as any)?.[field];
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no" || s === "") return false;
  }
  return fallback;
}

/**
 * Read a plain (non-bilingual) string field with `{{variable}}` substitution.
 * Used for things like `button_url` where the same URL applies to both langs.
 */
export async function getEmailTemplateString(
  template: string,
  field: string,
  vars: Record<string, string | number> = {},
  fallback: string = "",
): Promise<string> {
  const data = await loadTemplates();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (data?.[template] as any)?.[field];
  let text = typeof v === "string" ? v : fallback;
  for (const [k, val] of Object.entries(vars)) {
    text = text.split(`{{${k}}}`).join(String(val));
  }
  return text;
}
