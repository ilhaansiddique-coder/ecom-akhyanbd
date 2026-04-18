/**
 * Theme token registry.
 *
 * Single source of truth for everything the customizer can change. Each token
 * has:
 *   - `key`: settings DB key (`theme.color.primary`, etc.)
 *   - `cssVar`: the CSS custom property it drives (must already be referenced in globals.css)
 *   - `default`: fallback value when no row exists in the DB
 *   - `label` / `group`: how it shows up in the dashboard customizer
 *   - `type`: what control to render
 *
 * To add a new customizable token: add an entry here, ensure globals.css has the
 * matching `--var` (or add it), and the customizer will pick it up automatically.
 */

export type TokenType = "color" | "font" | "size" | "select";

export interface TokenDef {
  key: string;
  cssVar: string;
  default: string;
  label: string;
  group: TokenGroup;
  type: TokenType;
  /** Only for type === "size": min/max/unit for the slider control. */
  min?: number;
  max?: number;
  unit?: string;
  /** Only for type === "select" or "font": option list. */
  options?: { value: string; label: string }[];
}

export type TokenGroup =
  | "colors.brand"
  | "colors.surface"
  | "colors.text"
  | "colors.accent"
  | "typography.family"
  | "typography.size"
  | "layout.radius"
  | "layout.spacing";

/** Curated font stacks. Values must reference `--font-*` variables loaded by next/font in app/layout.tsx. */
const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "var(--font-hind-siliguri), 'Hind Siliguri', system-ui, sans-serif", label: "Hind Siliguri (Bengali + Latin)" },
  { value: "var(--font-bricolage), 'Bricolage Grotesque', system-ui, sans-serif", label: "Bricolage Grotesque (Modern)" },
  { value: "var(--font-playfair), 'Playfair Display', Georgia, serif", label: "Playfair Display (Classic Serif)" },
  { value: "var(--font-manrope), 'Manrope', system-ui, sans-serif", label: "Manrope (Clean Sans)" },
  { value: "system-ui, -apple-system, 'Segoe UI', sans-serif", label: "System Default" },
];

export const TOKENS: TokenDef[] = [
  // ─── Brand colors ──────────────────────────────────────────────────────
  { key: "theme.color.primary",        cssVar: "--primary",         default: "#0f5931", label: "Primary",         group: "colors.brand",   type: "color" },
  { key: "theme.color.primary_light",  cssVar: "--primary-light",   default: "#12693a", label: "Primary Light",   group: "colors.brand",   type: "color" },
  { key: "theme.color.primary_dark",   cssVar: "--primary-dark",    default: "#0a3d22", label: "Primary Dark",    group: "colors.brand",   type: "color" },
  { key: "theme.color.primary_darker", cssVar: "--primary-darker",  default: "#072b18", label: "Primary Darker",  group: "colors.brand",   type: "color" },

  // ─── Surface colors ────────────────────────────────────────────────────
  { key: "theme.color.background",     cssVar: "--background",      default: "#ffffff", label: "Background",      group: "colors.surface", type: "color" },
  { key: "theme.color.background_alt", cssVar: "--background-alt",  default: "#f7f7f7", label: "Background Alt",  group: "colors.surface", type: "color" },
  { key: "theme.color.border",         cssVar: "--border",          default: "#e8e8e8", label: "Border",          group: "colors.surface", type: "color" },

  // ─── Text colors ───────────────────────────────────────────────────────
  { key: "theme.color.foreground",     cssVar: "--foreground",      default: "#333333", label: "Heading / Strong", group: "colors.text",   type: "color" },
  { key: "theme.color.text_body",      cssVar: "--text-body",       default: "#555555", label: "Body Text",       group: "colors.text",    type: "color" },
  { key: "theme.color.text_muted",     cssVar: "--text-muted",      default: "#888888", label: "Muted Text",      group: "colors.text",    type: "color" },
  { key: "theme.color.text_light",     cssVar: "--text-light",      default: "#aaaaaa", label: "Light Text",      group: "colors.text",    type: "color" },

  // ─── Accent / status colors ────────────────────────────────────────────
  { key: "theme.color.sale_red",       cssVar: "--sale-red",        default: "#e91024", label: "Sale Red",        group: "colors.accent",  type: "color" },
  { key: "theme.color.badge_green",    cssVar: "--badge-green",     default: "#4caf50", label: "Badge Green",     group: "colors.accent",  type: "color" },

  // ─── Typography — family ───────────────────────────────────────────────
  {
    key: "theme.font.body",
    cssVar: "--font-body-stack",
    default: "var(--font-hind-siliguri), 'Hind Siliguri', system-ui, sans-serif",
    label: "Body Font",
    group: "typography.family",
    type: "font",
    options: FONT_OPTIONS,
  },
  {
    key: "theme.font.heading",
    cssVar: "--font-heading-stack",
    default: "var(--font-bricolage), 'Bricolage Grotesque', system-ui, sans-serif",
    label: "Heading Font",
    group: "typography.family",
    type: "font",
    options: FONT_OPTIONS,
  },

  // ─── Typography — size ─────────────────────────────────────────────────
  { key: "theme.font.size_base", cssVar: "--font-size-base", default: "16",  label: "Base Font Size",   group: "typography.size", type: "size", min: 13, max: 20, unit: "px" },
  { key: "theme.font.line_height", cssVar: "--line-height-base", default: "1.6", label: "Line Height",   group: "typography.size", type: "size", min: 1.2, max: 2.0, unit: "" },

  // ─── Layout ────────────────────────────────────────────────────────────
  { key: "theme.radius.sm", cssVar: "--radius-sm", default: "6",  label: "Radius — Small",  group: "layout.radius",  type: "size", min: 0, max: 24, unit: "px" },
  { key: "theme.radius.md", cssVar: "--radius-md", default: "12", label: "Radius — Medium", group: "layout.radius",  type: "size", min: 0, max: 32, unit: "px" },
  { key: "theme.radius.lg", cssVar: "--radius-lg", default: "16", label: "Radius — Large",  group: "layout.radius",  type: "size", min: 0, max: 48, unit: "px" },
  { key: "theme.radius.xl", cssVar: "--radius-xl", default: "24", label: "Radius — XLarge", group: "layout.radius",  type: "size", min: 0, max: 64, unit: "px" },

  { key: "theme.container.max_width", cssVar: "--container-max", default: "1280", label: "Container Max Width", group: "layout.spacing", type: "size", min: 1024, max: 1600, unit: "px" },
  { key: "theme.spacing.section_y",   cssVar: "--section-y",     default: "80",   label: "Section Vertical Spacing", group: "layout.spacing", type: "size", min: 32, max: 160, unit: "px" },
];

/** Lookup a token def by key. */
export const TOKENS_BY_KEY: Record<string, TokenDef> = Object.fromEntries(TOKENS.map((t) => [t.key, t]));

/** All token keys (used by the GET endpoint to know which to load). */
export const TOKEN_KEYS = TOKENS.map((t) => t.key);

/**
 * Build the `:root { --x: y; ... }` CSS string from a settings record.
 * Values not present fall back to defaults so the site always renders correctly.
 */
export function buildThemeCss(settings: Record<string, string | null | undefined>): string {
  const rules = TOKENS.map((t) => {
    const raw = settings[t.key];
    const value = (raw ?? "").trim() || t.default;
    // Append unit for size tokens that aren't unitless (line-height has unit "")
    const finalValue = t.type === "size" && t.unit ? `${value}${t.unit}` : value;
    return `  ${t.cssVar}: ${finalValue};`;
  }).join("\n");
  return `:root {\n${rules}\n}`;
}

/** Snapshot of all tokens with their effective values (DB or default). Used for the customizer initial state. */
export function snapshotTokens(settings: Record<string, string | null | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of TOKENS) {
    const raw = settings[t.key];
    out[t.key] = (raw ?? "").trim() || t.default;
  }
  return out;
}
