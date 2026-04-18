/**
 * Theme presets — curated combinations of token + option overrides that the
 * customizer can apply with a single click.
 *
 * A preset is a sparse Partial<StringMap> per layer; values not specified
 * are left at the user's current state. This makes presets composable —
 * applying "Sunset" only changes colors, leaving fonts/buttons intact.
 */

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  /** Small color swatches shown in the preset card. */
  swatches: string[];
  tokens?: Record<string, string>;
  options?: Record<string, string>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default-green",
    label: "Akhiyan Green",
    description: "Default herbal-green palette with soft shadows.",
    swatches: ["#0f5931", "#12693a", "#0a3d22", "#ffffff"],
    tokens: {
      "theme.color.primary":        "#0f5931",
      "theme.color.primary_light":  "#12693a",
      "theme.color.primary_dark":   "#0a3d22",
      "theme.color.primary_darker": "#072b18",
      "theme.color.background":     "#ffffff",
      "theme.color.background_alt": "#f7f7f7",
      "theme.color.foreground":     "#333333",
    },
    options: {
      "card.style":   "shadowed",
      "button.style": "solid",
      "button.shape": "rounded",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Dark navy & teal with crisp surfaces — moody and modern.",
    swatches: ["#0b1d36", "#1e3a5f", "#14b8a6", "#0f172a"],
    tokens: {
      "theme.color.primary":        "#1e3a5f",
      "theme.color.primary_light":  "#2c5282",
      "theme.color.primary_dark":   "#0b1d36",
      "theme.color.primary_darker": "#060f1e",
      "theme.color.background":     "#0f172a",
      "theme.color.background_alt": "#1e293b",
      "theme.color.border":         "#334155",
      "theme.color.foreground":     "#f1f5f9",
      "theme.color.text_body":      "#cbd5e1",
      "theme.color.text_muted":     "#94a3b8",
      "theme.color.text_light":     "#64748b",
      "theme.color.sale_red":       "#f43f5e",
      "theme.color.badge_green":    "#14b8a6",
    },
    options: {
      "card.style":   "bordered",
      "button.style": "solid",
      "button.shape": "rounded",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm orange and red gradient feel — energetic and bold.",
    swatches: ["#ea580c", "#fb923c", "#9a3412", "#fff7ed"],
    tokens: {
      "theme.color.primary":        "#ea580c",
      "theme.color.primary_light":  "#fb923c",
      "theme.color.primary_dark":   "#c2410c",
      "theme.color.primary_darker": "#9a3412",
      "theme.color.background":     "#fffbf5",
      "theme.color.background_alt": "#fff7ed",
      "theme.color.border":         "#fed7aa",
      "theme.color.foreground":     "#431407",
      "theme.color.sale_red":       "#dc2626",
    },
    options: {
      "card.style":   "shadowed",
      "button.style": "gradient",
      "button.shape": "pill",
    },
  },
  {
    id: "lavender",
    label: "Lavender",
    description: "Soft purple and pink — feminine, calm, premium.",
    swatches: ["#7c3aed", "#a78bfa", "#ec4899", "#faf5ff"],
    tokens: {
      "theme.color.primary":        "#7c3aed",
      "theme.color.primary_light":  "#a78bfa",
      "theme.color.primary_dark":   "#5b21b6",
      "theme.color.primary_darker": "#3b0764",
      "theme.color.background":     "#fdfaff",
      "theme.color.background_alt": "#faf5ff",
      "theme.color.border":         "#e9d5ff",
      "theme.color.foreground":     "#3b0764",
      "theme.color.sale_red":       "#ec4899",
    },
    options: {
      "card.style":   "minimal",
      "button.style": "soft",
      "button.shape": "pill",
    },
  },
  {
    id: "mono",
    label: "Mono",
    description: "Black & white minimalism with thin borders.",
    swatches: ["#000000", "#404040", "#e5e5e5", "#ffffff"],
    tokens: {
      "theme.color.primary":        "#000000",
      "theme.color.primary_light":  "#262626",
      "theme.color.primary_dark":   "#000000",
      "theme.color.primary_darker": "#000000",
      "theme.color.background":     "#ffffff",
      "theme.color.background_alt": "#fafafa",
      "theme.color.border":         "#e5e5e5",
      "theme.color.foreground":     "#0a0a0a",
      "theme.color.text_body":      "#404040",
      "theme.color.text_muted":     "#737373",
      "theme.color.text_light":     "#a3a3a3",
    },
    options: {
      "card.style":   "bordered",
      "button.style": "outline",
      "button.shape": "square",
    },
  },
];

export const THEME_PRESETS_BY_ID: Record<string, ThemePreset> = Object.fromEntries(
  THEME_PRESETS.map((p) => [p.id, p])
);
