/**
 * Bilingual content helpers.
 *
 * Many editable fields support both English ("en") and Bangla ("bn") strings.
 * This module defines the shape and a normalizer that handles legacy data —
 * if a stored field is a plain string (from before bilingual support), it is
 * lifted into { en: string, bn: string } so consumers always see the new shape.
 */

export type Bilingual = { en: string; bn: string };

export function toBilingual(v: unknown): Bilingual {
  if (!v) return { en: "", bn: "" };
  if (typeof v === "string") return { en: v, bn: v };
  if (typeof v === "object" && v !== null) {
    const o = v as { en?: unknown; bn?: unknown };
    if ("en" in o || "bn" in o) {
      return {
        en: typeof o.en === "string" ? o.en : o.en != null ? String(o.en) : "",
        bn: typeof o.bn === "string" ? o.bn : o.bn != null ? String(o.bn) : "",
      };
    }
  }
  return { en: "", bn: "" };
}
