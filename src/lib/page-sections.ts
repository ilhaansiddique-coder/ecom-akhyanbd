/**
 * Page section registry — defines the catalog of sections that can appear
 * on each customizable page, the order they render in by default, and
 * whether they're enabled.
 *
 * The actual rendering switch lives in the page file (e.g. app/page.tsx),
 * which reads the resolved section list and matches each `id` to a
 * concrete component. Keeping the catalog declarative here lets the
 * customizer iterate sections without importing React components.
 *
 * Storage: a single siteSetting row per page, e.g.
 *   key:   "page.home.sections"
 *   value: JSON.stringify([{ id: "hero", enabled: true }, ...])
 */

export interface SectionDef {
  id: string;
  label: string;
  /** Short hint shown under the label in the customizer. */
  description?: string;
  /** If true, the user cannot toggle this section off (still reorderable). */
  required?: boolean;
}

export interface SectionState {
  id: string;
  enabled: boolean;
}

// ─── Homepage catalog ─────────────────────────────────────────────────
export const HOME_SECTIONS: SectionDef[] = [
  { id: "hero",         label: "Hero Banner",        description: "Top banner with headline, image, and CTA." },
  { id: "flash_sale",   label: "Flash Sale",         description: "Time-limited promotional products with countdown." },
  { id: "all_products", label: "Product Grid",       description: "Main catalogue grid with filters.", required: true },
  { id: "reviews",      label: "Customer Reviews",   description: "Approved customer testimonials carousel." },
  { id: "features",     label: "Features / USPs",    description: "Trust signals: shipping, support, returns, etc." },
];

export const HOME_SECTION_KEY = "page.home.sections";

export const PAGE_SECTION_KEYS = [HOME_SECTION_KEY] as const;

/** Default state = catalog order, all enabled. */
export function defaultSectionState(catalog: SectionDef[]): SectionState[] {
  return catalog.map((s) => ({ id: s.id, enabled: true }));
}

/**
 * Resolve a stored JSON string into a normalized SectionState[] that:
 *  - Preserves the saved order
 *  - Drops unknown ids (catalog drift)
 *  - Appends newly-added catalog entries at the end (so adding a section
 *    in code makes it show up automatically without breaking saved order)
 *  - Forces required sections back on, even if user had toggled them off
 */
export function resolveSections(raw: string | null | undefined, catalog: SectionDef[]): SectionState[] {
  const byId = new Map(catalog.map((s) => [s.id, s]));
  const requiredIds = new Set(catalog.filter((s) => s.required).map((s) => s.id));

  let parsed: SectionState[] = [];
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        parsed = data
          .filter((s) => s && typeof s.id === "string" && byId.has(s.id))
          .map((s) => ({ id: s.id, enabled: requiredIds.has(s.id) ? true : Boolean(s.enabled) }));
      }
    } catch {
      // fall through to defaults
    }
  }

  if (parsed.length === 0) return defaultSectionState(catalog);

  const seen = new Set(parsed.map((s) => s.id));
  for (const def of catalog) {
    if (!seen.has(def.id)) parsed.push({ id: def.id, enabled: true });
  }
  return parsed;
}

/** Convenience: resolve homepage sections from a settings record. */
export function resolveHomeSections(settings: Record<string, string | null | undefined>): SectionState[] {
  return resolveSections(settings[HOME_SECTION_KEY], HOME_SECTIONS);
}
