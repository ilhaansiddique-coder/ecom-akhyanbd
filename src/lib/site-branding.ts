/**
 * Site identity / branding fields exposed in the customizer.
 *
 * These are plain `siteSetting` rows (one row per key) that already drive the
 * existing components (Navbar, Footer, app/layout.tsx metadata). Surfacing
 * them in the customizer means the user can edit identity + theme in one
 * place instead of jumping to dashboard/settings.
 *
 * Fields are typed by `kind`:
 *   - "text"     → single-line input
 *   - "textarea" → multiline input
 *   - "image"    → upload + URL field (ImagePicker control)
 */

export type BrandingFieldKind = "text" | "textarea" | "image";

export interface BrandingField {
  key: string;
  label: string;
  kind: BrandingFieldKind;
  placeholder?: string;
  hint?: string;
  group: BrandingGroup;
}

export type BrandingGroup = "identity" | "media" | "contact" | "social";

export const BRANDING_FIELDS: BrandingField[] = [
  // ─── Identity ─────────────────────────────────────────────────────────
  { key: "site_name",        label: "Site Name",         kind: "text",     group: "identity", placeholder: "Your Brand Name" },
  { key: "site_tagline",     label: "Tagline",           kind: "text",     group: "identity", placeholder: "Short slogan" },
  { key: "site_description", label: "Meta Description",  kind: "textarea", group: "identity", placeholder: "One-paragraph site description for SEO + footer.", hint: "Used in SEO meta tags and footer." },

  // ─── Media ────────────────────────────────────────────────────────────
  { key: "site_logo", label: "Site Logo",   kind: "image", group: "media", hint: "Used in header, footer, and emails. Recommended ~200px tall." },
  { key: "favicon",   label: "Favicon",     kind: "image", group: "media", hint: "Browser tab icon. Square PNG/ICO, 32×32 or larger." },

  // ─── Contact ──────────────────────────────────────────────────────────
  { key: "phone",    label: "Phone Number", kind: "text", group: "contact", placeholder: "+880 1XXX XXXXXX" },
  { key: "whatsapp", label: "WhatsApp",     kind: "text", group: "contact", placeholder: "+880 1XXX XXXXXX", hint: "Used by the floating WhatsApp button." },
  { key: "email",    label: "Email",        kind: "text", group: "contact", placeholder: "hello@yoursite.com" },
  { key: "address",  label: "Address",      kind: "textarea", group: "contact", placeholder: "Street, City, Country" },

  // ─── Social ───────────────────────────────────────────────────────────
  { key: "facebook",  label: "Facebook URL",  kind: "text", group: "social", placeholder: "https://facebook.com/your-page" },
  { key: "instagram", label: "Instagram URL", kind: "text", group: "social", placeholder: "https://instagram.com/your-handle" },
  { key: "youtube",   label: "YouTube URL",   kind: "text", group: "social", placeholder: "https://youtube.com/@your-channel" },
];

export const BRANDING_KEYS = BRANDING_FIELDS.map((f) => f.key);

export const BRANDING_BY_KEY: Record<string, BrandingField> = Object.fromEntries(
  BRANDING_FIELDS.map((f) => [f.key, f])
);

/** Snapshot all branding values (DB or empty string) for the customizer initial state. */
export function snapshotBranding(settings: Record<string, string | null | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of BRANDING_FIELDS) {
    const raw = settings[f.key];
    out[f.key] = (raw ?? "").trim();
  }
  return out;
}
