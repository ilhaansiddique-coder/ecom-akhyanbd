/**
 * Centralized site_settings cache.
 *
 * Why this exists:
 *   pg_stat_activity showed `siteSetting.findMany()` running every 3-5 seconds
 *   from multiple call sites (homepage SSR, /collect, /checkout-settings,
 *   FB CAPI fire paths, etc). Each call returned the same ~118 rows. This
 *   wraps the read in `unstable_cache` so most requests hit the in-memory
 *   cache instead of Postgres.
 *
 * Invalidation:
 *   The admin Settings PUT route already calls `revalidateAll("settings")`
 *   which calls `revalidateTag("settings", "max")` — that busts this cache
 *   immediately on any settings change. 60s TTL is the fallback.
 *
 * Safety for pixel/defer:
 *   `fb_deferred_purchase` toggle staleness is now harmless because the
 *   status route was fixed to ignore the live flag and trust trackingData
 *   presence. Pixel/token rotation: 60s lag is acceptable; admin rotating
 *   keys can call the Settings PUT (or use the Test action) which busts
 *   the cache instantly.
 */
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type SettingsMap = Record<string, string | null>;

const fetchAll = unstable_cache(
  async (): Promise<SettingsMap> => {
    const rows = await prisma.siteSetting.findMany({
      select: { key: true, value: true },
    });
    const out: SettingsMap = {};
    for (const r of rows) out[r.key] = r.value ?? null;
    return out;
  },
  ["site-settings-all"],
  { tags: ["settings"], revalidate: 60 },
);

/**
 * Returns the full settings map. Per-request memoized via React `cache()`
 * so multiple callers in the same render share one fetch; cross-request
 * sharing handled by `unstable_cache` above.
 */
export const getAllSettings = cache(async (): Promise<SettingsMap> => {
  try { return await fetchAll(); }
  catch { return {}; }
});

/** Convenience: read a single setting (string or null). */
export async function getSetting(key: string): Promise<string | null> {
  const all = await getAllSettings();
  return all[key] ?? null;
}

/** Convenience: read multiple keys into a flat object. */
export async function getSettings(keys: string[]): Promise<SettingsMap> {
  const all = await getAllSettings();
  const out: SettingsMap = {};
  for (const k of keys) out[k] = all[k] ?? null;
  return out;
}
