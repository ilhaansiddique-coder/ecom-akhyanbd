/**
 * Theme OPTIONS registry — non-CSS configuration that components read.
 *
 * Tokens (theme-tokens.ts) drive CSS variables and apply via a <style> tag.
 * Options drive React rendering: variant selects, on/off toggles, custom
 * text. They live in the same site_setting table but reach components
 * through useOption() which reads from SiteSettingsContext.
 */

export type OptionType = "select" | "toggle" | "text";

export interface OptionDef<T = string> {
  key: string;
  label: string;
  group: OptionGroup;
  type: OptionType;
  default: T;
  /** For type === "select": variant choices. */
  choices?: { value: string; label: string; preview?: string }[];
  /** For type === "text": placeholder hint. */
  placeholder?: string;
  /** Optional description shown under the label in the customizer. */
  hint?: string;
}

export type OptionGroup =
  | "buttons"
  | "card"
  | "card.show"
  | "header"
  | "header.show"
  | "footer"
  | "widgets";

// ─── Buttons ───────────────────────────────────────────────────────────
const BUTTON_STYLES: OptionDef[] = [
  {
    key: "button.style",
    label: "Button Style",
    group: "buttons",
    type: "select",
    default: "solid",
    choices: [
      { value: "solid",    label: "Solid" },
      { value: "outline",  label: "Outline" },
      { value: "gradient", label: "Gradient" },
      { value: "soft",     label: "Soft (tinted)" },
    ],
  },
  {
    key: "button.shape",
    label: "Button Shape",
    group: "buttons",
    type: "select",
    default: "rounded",
    choices: [
      { value: "rounded", label: "Rounded" },
      { value: "square",  label: "Square" },
      { value: "pill",    label: "Pill" },
    ],
  },
];

// ─── Product card ──────────────────────────────────────────────────────
const CARD_OPTIONS: OptionDef[] = [
  {
    key: "card.style",
    label: "Card Style",
    group: "card",
    type: "select",
    default: "shadowed",
    choices: [
      { value: "shadowed", label: "Shadowed" },
      { value: "bordered", label: "Bordered" },
      { value: "minimal",  label: "Minimal" },
      { value: "overlay",  label: "Image Overlay" },
    ],
  },
  {
    key: "card.cta_text",
    label: "Primary CTA Text",
    group: "card",
    type: "text",
    default: "",
    placeholder: "Use translation default",
    hint: "Leave blank to use the translated 'Order Now' label.",
  },
  // Show / hide elements on the product card
  { key: "card.show.badge",          label: "Show Sale / New Badge",   group: "card.show", type: "toggle", default: "1" },
  { key: "card.show.discount",       label: "Show Discount %",          group: "card.show", type: "toggle", default: "1" },
  { key: "card.show.original_price", label: "Show Original Price",      group: "card.show", type: "toggle", default: "1" },
  { key: "card.show.stock",          label: "Show Stock Indicator",     group: "card.show", type: "toggle", default: "1" },
  { key: "card.show.cart_button",    label: "Show 'Add to Cart' Icon",  group: "card.show", type: "toggle", default: "1" },
];

// ─── Header (Navbar) ───────────────────────────────────────────────────
const HEADER_OPTIONS: OptionDef[] = [
  {
    key: "header.layout",
    label: "Header Layout",
    group: "header",
    type: "select",
    default: "classic",
    choices: [
      { value: "classic",  label: "Classic (logo left)" },
      { value: "centered", label: "Centered logo" },
      { value: "minimal",  label: "Minimal (no top bar)" },
    ],
  },
  { key: "header.sticky",         label: "Sticky on Scroll",          group: "header",      type: "toggle", default: "1" },
  { key: "header.show_topbar",    label: "Show Top Bar",              group: "header.show", type: "toggle", default: "1" },
  { key: "header.show_search",    label: "Show Search Icon",          group: "header.show", type: "toggle", default: "1" },
  { key: "header.show_cart",      label: "Show Cart Icon",            group: "header.show", type: "toggle", default: "1" },
  { key: "header.show_login",     label: "Show Login / Account",      group: "header.show", type: "toggle", default: "1" },
];

// ─── Footer ────────────────────────────────────────────────────────────
const FOOTER_OPTIONS: OptionDef[] = [
  {
    key: "footer.layout",
    label: "Footer Layout",
    group: "footer",
    type: "select",
    default: "four_col",
    choices: [
      { value: "four_col", label: "4 Columns (default)" },
      { value: "three_col", label: "3 Columns (no newsletter)" },
      { value: "minimal",   label: "Minimal (single row)" },
    ],
  },
  { key: "footer.show_newsletter", label: "Show Newsletter Signup", group: "footer", type: "toggle", default: "1" },
  { key: "footer.show_socials",    label: "Show Social Icons",      group: "footer", type: "toggle", default: "1" },
];

// ─── Floating widgets (per-channel) ────────────────────────────────────
const WIDGET_OPTIONS: OptionDef[] = [
  { key: "widget.show_whatsapp", label: "Primary Contact Bubble", group: "widgets", type: "toggle", default: "1", hint: "Toggles the main contact bubble. Use 'Contact Mode' below to choose WhatsApp or phone call." },
  {
    key: "widget.contact_mode",
    label: "Contact Mode",
    group: "widgets",
    type: "select",
    default: "whatsapp",
    hint: "Decides what the primary bubble does. WhatsApp opens chat, Phone opens the dialer.",
    choices: [
      { value: "whatsapp", label: "WhatsApp (chat)" },
      { value: "phone",    label: "Phone Call (tel:)" },
    ],
  },
  { key: "widget.show_phone",    label: "Extra Phone Bubble", group: "widgets", type: "toggle", default: "0", hint: "Show a separate dedicated phone-call bubble in addition to the primary one." },
  { key: "widget.show_messenger",label: "Messenger Bubble",   group: "widgets", type: "toggle", default: "0" },
  {
    key: "widget.position",
    label: "Position",
    group: "widgets",
    type: "select",
    default: "bottom_right",
    choices: [
      { value: "bottom_right", label: "Bottom Right" },
      { value: "bottom_left",  label: "Bottom Left" },
    ],
  },
];

export const OPTIONS: OptionDef[] = [
  ...BUTTON_STYLES,
  ...CARD_OPTIONS,
  ...HEADER_OPTIONS,
  ...FOOTER_OPTIONS,
  ...WIDGET_OPTIONS,
];

export const OPTIONS_BY_KEY: Record<string, OptionDef> = Object.fromEntries(OPTIONS.map((o) => [o.key, o]));

export const OPTION_KEYS = OPTIONS.map((o) => o.key);

/** Read an option from a settings record with type-correct fallback. */
export function readOption<T = string>(settings: Record<string, string | null | undefined>, key: string): T {
  const def = OPTIONS_BY_KEY[key];
  const raw = settings[key];
  const value = (raw ?? "").trim();
  if (!def) return (value || "") as unknown as T;
  if (def.type === "toggle") {
    // Truthy if "1" / "true" / "on" / "yes" — normalize.
    if (!value) return (def.default === "1" || def.default === "true") as unknown as T;
    return /^(1|true|on|yes)$/i.test(value) as unknown as T;
  }
  return (value || def.default) as unknown as T;
}

export function snapshotOptions(settings: Record<string, string | null | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const o of OPTIONS) {
    const raw = settings[o.key];
    out[o.key] = (raw ?? "").trim() || String(o.default);
  }
  return out;
}
