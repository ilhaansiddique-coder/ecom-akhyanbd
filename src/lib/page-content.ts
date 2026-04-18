/**
 * Page content registry — editable copy for sections that already accept
 * a `content` prop (Hero, Features, Reviews on the homepage).
 *
 * Storage: a single siteSetting row per page, JSON-serialized.
 *   key:   "homepage_content"
 *   value: JSON.stringify({ hero: {...}, features: [...], reviews: {...} })
 *
 * The shape mirrors the prop interfaces of the rendering components, so
 * the saved value can be passed straight through.
 */

export const HOMEPAGE_CONTENT_KEY = "homepage_content";

// ─── Hero ──────────────────────────────────────────────────────────────
export interface HeroContent {
  badge?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  cta_primary?: string;
  cta_secondary?: string;
  trust_1?: string;
  trust_2?: string;
  trust_3?: string;
  hero_logo?: string;
}

export const HERO_FIELDS: { key: keyof HeroContent; label: string; type: "text" | "textarea"; placeholder?: string }[] = [
  { key: "badge",         label: "Top Badge",          type: "text",     placeholder: "e.g. 100% Authentic" },
  { key: "title",         label: "Main Headline",      type: "text",     placeholder: "Your Hero Title" },
  { key: "subtitle",      label: "Subheadline",        type: "text",     placeholder: "Supporting line" },
  { key: "description",   label: "Description",        type: "textarea", placeholder: "Short paragraph under the headline" },
  { key: "cta_primary",   label: "Primary CTA Text",   type: "text",     placeholder: "Shop Now" },
  { key: "cta_secondary", label: "Secondary CTA Text", type: "text",     placeholder: "Learn More" },
  { key: "trust_1",       label: "Trust Badge 1",      type: "text",     placeholder: "Skin-Friendly Fabric" },
  { key: "trust_2",       label: "Trust Badge 2",      type: "text",     placeholder: "Fast Delivery" },
  { key: "trust_3",       label: "Trust Badge 3",      type: "text",     placeholder: "5★ Rated" },
];

// ─── Features ──────────────────────────────────────────────────────────
export interface FeatureContent {
  icon: string;
  title: string;
  description: string;
}

/** Whitelist of icons available in the Features component. */
export const FEATURE_ICONS: { value: string; label: string }[] = [
  { value: "truck",      label: "Truck (delivery)" },
  { value: "headphones", label: "Headphones (support)" },
  { value: "shield",     label: "Shield (safety)" },
  { value: "refresh",    label: "Refresh (returns)" },
  { value: "star",       label: "Star" },
  { value: "heart",      label: "Heart" },
  { value: "check",      label: "Check" },
  { value: "gift",       label: "Gift" },
  { value: "clock",      label: "Clock" },
  { value: "leaf",       label: "Leaf (herbal)" },
];

export const DEFAULT_FEATURE: FeatureContent = { icon: "star", title: "", description: "" };

// ─── Reviews ───────────────────────────────────────────────────────────
export interface ReviewsContent {
  title?: string;
  subtitle?: string;
}

export const REVIEWS_FIELDS: { key: keyof ReviewsContent; label: string; type: "text" | "textarea"; placeholder?: string }[] = [
  { key: "title",    label: "Section Title",    type: "text",     placeholder: "What Our Customers Say" },
  { key: "subtitle", label: "Section Subtitle", type: "textarea", placeholder: "Real reviews from real customers" },
];

// ─── Bundled homepage content ─────────────────────────────────────────
export interface HomepageContent {
  hero?: HeroContent;
  features?: FeatureContent[];
  reviews?: ReviewsContent;
}

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  hero: {},
  features: [],
  reviews: {},
};

/** Parse the stored JSON safely; missing/invalid → defaults. */
export function parseHomepageContent(raw: string | null | undefined): HomepageContent {
  if (!raw) return { ...DEFAULT_HOMEPAGE_CONTENT };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_HOMEPAGE_CONTENT };
    return {
      hero: parsed.hero && typeof parsed.hero === "object" ? parsed.hero : {},
      features: Array.isArray(parsed.features) ? parsed.features : [],
      reviews: parsed.reviews && typeof parsed.reviews === "object" ? parsed.reviews : {},
    };
  } catch {
    return { ...DEFAULT_HOMEPAGE_CONTENT };
  }
}
