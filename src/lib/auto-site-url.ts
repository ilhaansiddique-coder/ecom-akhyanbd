import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clearEmailTemplatesCache } from "@/lib/email-templates";

/** True for `http(s)://localhost:*`, `127.0.0.1`, `0.0.0.0`, `::1`. */
function isLocalUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?)(:\d+)?(\/|$)/i.test(url);
}

/**
 * Auto-populate `site_url` in `site_settings` from the incoming request host
 * the first time the dashboard is loaded from a real (non-local) domain.
 *
 * Why: emails sent from background jobs have no request context, so they
 * can't derive the site URL on their own. By capturing it on the first
 * dashboard render (which always runs in a request context), every future
 * email gets the correct production URL automatically — no manual env var,
 * no admin action.
 *
 * Idempotent: only writes when the existing value is empty OR local.
 * Safe to call from any server component on any page.
 */
export async function autoCaptureSiteUrl(): Promise<void> {
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "").trim();
    if (!host) return;

    // Honor the proxy's protocol if behind one (Vercel, Nginx, Cloudflare, etc).
    const proto = (h.get("x-forwarded-proto") || "https").split(",")[0].trim();
    const candidate = `${proto}://${host}`.replace(/\/+$/, "");

    // Don't capture local URLs — that's exactly the bug we're fixing.
    if (isLocalUrl(candidate)) return;

    const existing = await prisma.siteSetting.findUnique({ where: { key: "site_url" } });
    const current = (existing?.value ?? "").trim();

    // Only write if missing OR currently set to a local value.
    if (current && !isLocalUrl(current)) return;
    if (current === candidate) return;

    await prisma.siteSetting.upsert({
      where: { key: "site_url" },
      create: { key: "site_url", value: candidate, group: "general" },
      update: { value: candidate },
    });
    // Bust template cache so the new URL flows into the next email immediately.
    clearEmailTemplatesCache();
  } catch {
    // Never block a page render on this — it's a side-effect, not a feature path.
  }
}
