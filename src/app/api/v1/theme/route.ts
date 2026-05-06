import { jsonResponse } from "@/lib/api-response";
import { getAllSettings } from "@/lib/settingsCache";
import { TOKENS } from "@/lib/theme-tokens";
import { BRANDING_FIELDS } from "@/lib/site-branding";

/**
 * GET /api/v1/theme
 *
 * Public, mobile-shaped projection of the customizer state. The dashboard
 * stores theme tokens in the SiteSetting table as flat rows like
 * `theme.color.primary = #0f5931`. This endpoint:
 *
 *   1. Reads all public settings (settingsCache, 60s TTL).
 *   2. Walks the TOKENS catalog so missing rows fall back to declared defaults.
 *   3. Reshapes the dot-notation keys into a nested JSON tree the Flutter
 *      ThemeProvider can decode in one pass — no key parsing client-side.
 *
 * Response shape (stable contract — Flutter ThemeData rebuilds against this):
 *
 *   {
 *     "version": <number>,                 // sync.ts theme channel version
 *     "branding": {
 *       "site_name": string | null,
 *       "site_tagline": string | null,
 *       "site_logo": string | null,        // URL
 *       "favicon": string | null,
 *       ...
 *     },
 *     "colors": {
 *       "primary": "#0f5931",
 *       "primary_light": "#12693a",
 *       "background": "#ffffff",
 *       ...
 *     },
 *     "fonts": {
 *       "body": "<font stack string>",
 *       "heading": "<font stack string>",
 *       "size_base": 16,                   // numeric, parsed
 *       "line_height": 1.6
 *     },
 *     "radius": { "sm": 6, "md": 12, "lg": 16, "xl": 24 },
 *     "spacing": { "container_max": 1280, "section_y": 80 }
 *   }
 *
 * Triggered live: when admin saves theme/branding, /admin/settings PUT calls
 * `bumpVersion("theme")`. Flutter's SSE client reacts and re-fetches this
 * endpoint, then rebuilds ThemeData. Latency target: <1s end-to-end.
 */
export async function GET() {
  const settings = await getAllSettings();
  const get = (key: string) => settings[key] ?? null;

  // Layer 1: branding (key/value, no transformation)
  const branding: Record<string, string | null> = {};
  for (const f of BRANDING_FIELDS) {
    branding[f.key] = get(f.key);
  }

  // Layer 2: theme tokens — walk catalog, overlay DB, group by section.
  const colors: Record<string, string> = {};
  const fonts: Record<string, string | number> = {};
  const radius: Record<string, number> = {};
  const spacing: Record<string, number> = {};

  for (const t of TOKENS) {
    const value = get(t.key) ?? t.default;

    if (t.group.startsWith("colors.")) {
      // Strip "theme.color." prefix → "primary", "background_alt", etc.
      const name = t.key.replace(/^theme\.color\./, "");
      colors[name] = value;
      continue;
    }

    if (t.group === "typography.family") {
      const name = t.key.replace(/^theme\.font\./, "");
      fonts[name] = value;
      continue;
    }

    if (t.group === "typography.size") {
      const name = t.key.replace(/^theme\.font\./, "");
      const num = Number(value);
      fonts[name] = Number.isFinite(num) ? num : value;
      continue;
    }

    if (t.group === "layout.radius") {
      const name = t.key.replace(/^theme\.radius\./, "");
      radius[name] = Number(value) || 0;
      continue;
    }

    if (t.group === "layout.spacing") {
      const name = t.key
        .replace(/^theme\.container\./, "container_")
        .replace(/^theme\.spacing\./, "");
      spacing[name] = Number(value) || 0;
    }
  }

  return jsonResponse({
    branding,
    colors,
    fonts,
    radius,
    spacing,
  });
}
