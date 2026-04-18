"use client";

/**
 * Theme customizer — WordPress-style two-pane editor.
 *
 *   ┌──────────────┬──────────────────────┐
 *   │ control      │  live preview iframe │
 *   │ panel (left) │  (right)             │
 *   └──────────────┴──────────────────────┘
 *
 * Two kinds of editable state:
 *   - TOKENS  → CSS variables (theme-tokens.ts). Pushed via `customizer:tokens`
 *               messages, applied as a <style> tag in the iframe (no React render).
 *   - OPTIONS → Non-CSS settings (theme-options.ts). Pushed via `customizer:options`
 *               messages into SiteSettingsContext so components re-render.
 *
 * Save sends the diff for BOTH to /api/v1/admin/settings (one round-trip,
 * upserts each row).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiMonitor, FiTablet, FiSmartphone, FiSave, FiRotateCcw, FiChevronDown, FiChevronRight, FiCheck, FiArrowUp, FiArrowDown, FiEye, FiEyeOff, FiPlus, FiTrash2, FiDownload, FiUpload, FiStar, FiTag, FiDroplet, FiType, FiLayout, FiSquare, FiGrid, FiAlignJustify, FiAlignLeft, FiMessageCircle, FiLayers, FiFileText } from "react-icons/fi";
import type { IconType } from "react-icons";
import { TOKENS, TOKENS_BY_KEY, type TokenDef, type TokenGroup, snapshotTokens } from "@/lib/theme-tokens";
import { useSiteSettingsInternal } from "@/lib/SiteSettingsContext";
import { OPTIONS, type OptionDef, type OptionGroup, snapshotOptions } from "@/lib/theme-options";
import { HOME_SECTIONS, HOME_SECTION_KEY, type SectionDef, type SectionState, defaultSectionState } from "@/lib/page-sections";
import {
  HOMEPAGE_CONTENT_KEY,
  HERO_FIELDS,
  REVIEWS_FIELDS,
  FEATURE_ICONS,
  DEFAULT_FEATURE,
  DEFAULT_HOMEPAGE_CONTENT,
  type HomepageContent,
  type HeroContent,
  type ReviewsContent,
  type FeatureContent,
} from "@/lib/page-content";
import { THEME_PRESETS, type ThemePreset } from "@/lib/theme-presets";
import { BRANDING_FIELDS, type BrandingField, type BrandingGroup } from "@/lib/site-branding";
import { api } from "@/lib/api";

type StringMap = Record<string, string>;

// ────────────────────────────────────────────────────────────────────────────
// Panel structure
// ────────────────────────────────────────────────────────────────────────────
type PanelSection =
  | { kind: "tokens"; label: string; group: TokenGroup }
  | { kind: "options"; label: string; group: OptionGroup }
  | { kind: "sections"; label: string; pageId: SectionsPageId; previewPath: string }
  | { kind: "content"; label: string; pageId: ContentPageId; block: ContentBlock; previewPath: string }
  | { kind: "presets"; label: string }
  | { kind: "io"; label: string }
  | { kind: "branding"; label: string; group: BrandingGroup };

type SectionsPageId = "home";
type ContentPageId  = "home";
type ContentBlock   = "hero" | "features" | "reviews";

const SECTION_CATALOG: Record<SectionsPageId, { catalog: SectionDef[]; storageKey: string; previewPath: string }> = {
  home: { catalog: HOME_SECTIONS, storageKey: HOME_SECTION_KEY, previewPath: "/" },
};

interface PanelDef {
  id: string;
  label: string;
  description: string;
  icon: IconType;
  sections: PanelSection[];
}

const PANELS: PanelDef[] = [
  {
    id: "branding",
    label: "Site Identity",
    description: "Name, logo, contact details, social links",
    icon: FiTag,
    sections: [
      { kind: "branding", label: "Identity", group: "identity" },
      { kind: "branding", label: "Media",    group: "media"    },
      { kind: "branding", label: "Contact",  group: "contact"  },
      { kind: "branding", label: "Social",   group: "social"   },
    ],
  },
  {
    id: "colors",
    label: "Colors",
    description: "Brand, surface, text and accent palettes",
    icon: FiDroplet,
    sections: [
      { kind: "tokens", label: "Brand",   group: "colors.brand"   },
      { kind: "tokens", label: "Surface", group: "colors.surface" },
      { kind: "tokens", label: "Text",    group: "colors.text"    },
      { kind: "tokens", label: "Accent",  group: "colors.accent"  },
    ],
  },
  {
    id: "typography",
    label: "Typography",
    description: "Font families and sizes",
    icon: FiType,
    sections: [
      { kind: "tokens", label: "Font Family", group: "typography.family" },
      { kind: "tokens", label: "Font Size",   group: "typography.size"   },
    ],
  },
  {
    id: "layout",
    label: "Layout",
    description: "Border radius and spacing scale",
    icon: FiLayout,
    sections: [
      { kind: "tokens", label: "Border Radius", group: "layout.radius"  },
      { kind: "tokens", label: "Spacing",       group: "layout.spacing" },
    ],
  },
  {
    id: "buttons",
    label: "Buttons",
    description: "Style and shape across the site",
    icon: FiSquare,
    sections: [
      { kind: "options", label: "Buttons", group: "buttons" },
    ],
  },
  {
    id: "card",
    label: "Product Cards",
    description: "Card style and what to display",
    icon: FiGrid,
    sections: [
      { kind: "options", label: "Card Style",  group: "card"      },
      { kind: "options", label: "Show / Hide", group: "card.show" },
    ],
  },
  {
    id: "header",
    label: "Header",
    description: "Navbar layout and visible elements",
    icon: FiAlignJustify,
    sections: [
      { kind: "options", label: "Layout",      group: "header"      },
      { kind: "options", label: "Show / Hide", group: "header.show" },
    ],
  },
  {
    id: "footer",
    label: "Footer",
    description: "Footer layout and modules",
    icon: FiAlignLeft,
    sections: [
      { kind: "options", label: "Footer", group: "footer" },
    ],
  },
  {
    id: "widgets",
    label: "Floating Widgets",
    description: "WhatsApp / phone / messenger bubbles",
    icon: FiMessageCircle,
    sections: [
      { kind: "options", label: "Floating Widgets", group: "widgets" },
    ],
  },
  {
    id: "sections",
    label: "Page Sections",
    description: "Reorder and toggle homepage blocks",
    icon: FiLayers,
    sections: [
      { kind: "sections", label: "Homepage Sections", pageId: "home", previewPath: "/" },
    ],
  },
  {
    id: "content",
    label: "Content",
    description: "Hero, features and reviews copy",
    icon: FiFileText,
    sections: [
      { kind: "content", label: "Hero",     pageId: "home", block: "hero",     previewPath: "/" },
      { kind: "content", label: "Features", pageId: "home", block: "features", previewPath: "/" },
      { kind: "content", label: "Reviews",  pageId: "home", block: "reviews",  previewPath: "/" },
    ],
  },
  {
    id: "presets",
    label: "Presets & Backup",
    description: "One-click themes, export and import",
    icon: FiStar,
    sections: [
      { kind: "presets", label: "Theme Presets" },
      { kind: "io",      label: "Backup / Restore" },
    ],
  },
];

const PREVIEW_PAGES = [
  { label: "Home", path: "/" },
  { label: "Shop", path: "/shop" },
  { label: "Cart", path: "/cart" },
  { label: "Checkout", path: "/checkout" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

const VIEWPORTS = {
  desktop: { w: "100%", icon: FiMonitor, label: "Desktop" },
  tablet:  { w: "768px", icon: FiTablet, label: "Tablet" },
  mobile:  { w: "390px", icon: FiSmartphone, label: "Mobile" },
} as const;
type ViewportKey = keyof typeof VIEWPORTS;

// ────────────────────────────────────────────────────────────────────────────
// Token controls
// ────────────────────────────────────────────────────────────────────────────

function ColorControl({ def, value, onChange }: { def: TokenDef; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex-1 text-sm text-gray-700">{def.label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1">
        <input
          type="color"
          value={normalizeColor(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label={def.label}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 bg-transparent text-xs text-gray-700 focus:outline-none"
        />
      </div>
    </div>
  );
}

function SizeControl({ def, value, onChange }: { def: TokenDef; value: string; onChange: (v: string) => void }) {
  const num = parseFloat(value) || 0;
  const min = def.min ?? 0;
  const max = def.max ?? 100;
  const step = max - min < 5 ? 0.05 : 1;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700">{def.label}</label>
        <span className="text-xs font-medium text-gray-500">{value}{def.unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={num}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-[var(--primary)]"
      />
    </div>
  );
}

function FontControl({ def, value, onChange }: { def: TokenDef; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-gray-700">{def.label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[var(--primary)] focus:outline-none"
      >
        {def.options?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-base" style={{ fontFamily: value }}>
        Aa Bb Cc 123 — অআকখ ১২৩
      </div>
    </div>
  );
}

function renderTokenControl(def: TokenDef, value: string, onChange: (v: string) => void) {
  switch (def.type) {
    case "color": return <ColorControl def={def} value={value} onChange={onChange} />;
    case "size":  return <SizeControl def={def} value={value} onChange={onChange} />;
    case "font":  return <FontControl def={def} value={value} onChange={onChange} />;
    default:      return null;
  }
}

function normalizeColor(v: string): string {
  if (!v) return "#000000";
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1], g = v[2], b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#000000";
}

// ────────────────────────────────────────────────────────────────────────────
// Option controls
// ────────────────────────────────────────────────────────────────────────────

function ToggleControl({ def, value, onChange }: { def: OptionDef; value: string; onChange: (v: string) => void }) {
  const on = /^(1|true|on|yes)$/i.test(value);
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="flex-1">
        <label className="block text-sm text-gray-700">{def.label}</label>
        {def.hint && <p className="mt-0.5 text-[11px] text-gray-400">{def.hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => onChange(on ? "0" : "1")}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${on ? "bg-[var(--primary)]" : "bg-gray-300"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function ChoiceControl({ def, value, onChange }: { def: OptionDef; value: string; onChange: (v: string) => void }) {
  const choices = def.choices ?? [];
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-gray-700">{def.label}</label>
      {def.hint && <p className="text-[11px] text-gray-400">{def.hint}</p>}
      <div className="grid grid-cols-2 gap-1.5">
        {choices.map((c) => (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
              value === c.value
                ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] font-semibold"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextControl({ def, value, onChange }: { def: OptionDef; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-gray-700">{def.label}</label>
      {def.hint && <p className="text-[11px] text-gray-400">{def.hint}</p>}
      <input
        type="text"
        value={value}
        placeholder={def.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[var(--primary)] focus:outline-none"
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sections control — toggle visibility + reorder homepage blocks
// ────────────────────────────────────────────────────────────────────────────

function SectionsControl({
  catalog,
  state,
  onChange,
}: {
  catalog: SectionDef[];
  state: SectionState[];
  onChange: (next: SectionState[]) => void;
}) {
  const byId = new Map(catalog.map((s) => [s.id, s]));

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= state.length) return;
    const next = state.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const toggle = (idx: number) => {
    const def = byId.get(state[idx].id);
    if (def?.required) return;
    const next = state.slice();
    next[idx] = { ...next[idx], enabled: !next[idx].enabled };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500">
        Drag-style reorder via the arrow buttons. Save to apply to the live page.
      </p>
      {state.map((s, idx) => {
        const def = byId.get(s.id);
        if (!def) return null;
        return (
          <div
            key={s.id}
            className={`flex items-center gap-2 rounded-lg border bg-white p-2.5 transition ${
              s.enabled ? "border-gray-200" : "border-gray-200 opacity-60"
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                title="Move up"
              >
                <FiArrowUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => move(idx, 1)}
                disabled={idx === state.length - 1}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                title="Move down"
              >
                <FiArrowDown className="h-3 w-3" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-800 truncate">{def.label}</span>
                {def.required && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">
                    Required
                  </span>
                )}
              </div>
              {def.description && (
                <p className="mt-0.5 text-[11px] text-gray-400 truncate">{def.description}</p>
              )}
            </div>
            <button
              onClick={() => toggle(idx)}
              disabled={def.required}
              className={`flex-shrink-0 rounded-lg p-1.5 transition ${
                s.enabled ? "text-[var(--primary)] hover:bg-[var(--primary)]/10" : "text-gray-400 hover:bg-gray-100"
              } ${def.required ? "cursor-not-allowed opacity-40" : ""}`}
              title={s.enabled ? "Hide section" : "Show section"}
            >
              {s.enabled ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Content controls — text/textarea fields and the Features repeater
// ────────────────────────────────────────────────────────────────────────────

function FieldText({ label, value, onChange, placeholder, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[var(--primary)] focus:outline-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[var(--primary)] focus:outline-none"
        />
      )}
    </div>
  );
}

function HeroContentEditor({ value, onChange }: { value: HeroContent; onChange: (v: HeroContent) => void }) {
  return (
    <div className="space-y-3">
      {HERO_FIELDS.map((f) => (
        <FieldText
          key={f.key}
          label={f.label}
          placeholder={f.placeholder}
          multiline={f.type === "textarea"}
          value={value[f.key] ?? ""}
          onChange={(v) => onChange({ ...value, [f.key]: v })}
        />
      ))}
      <ImagePicker
        label="Hero Logo / Image"
        value={value.hero_logo ?? ""}
        onChange={(v) => onChange({ ...value, hero_logo: v })}
        hint="Shown inside the circular badge on the hero section. Leave blank to use the site logo."
      />
    </div>
  );
}

function ReviewsContentEditor({ value, onChange }: { value: ReviewsContent; onChange: (v: ReviewsContent) => void }) {
  return (
    <div className="space-y-3">
      {REVIEWS_FIELDS.map((f) => (
        <FieldText
          key={f.key}
          label={f.label}
          placeholder={f.placeholder}
          multiline={f.type === "textarea"}
          value={value[f.key] ?? ""}
          onChange={(v) => onChange({ ...value, [f.key]: v })}
        />
      ))}
    </div>
  );
}

function FeaturesEditor({ value, onChange }: { value: FeatureContent[]; onChange: (v: FeatureContent[]) => void }) {
  const update = (idx: number, patch: Partial<FeatureContent>) => {
    const next = value.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= value.length) return;
    const next = value.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };
  const add = () => onChange([...value, { ...DEFAULT_FEATURE }]);

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500">
        Override the default 4 feature cards. Leave empty to use translated defaults.
      </p>
      {value.map((feature, idx) => (
        <div key={idx} className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="flex-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Feature {idx + 1}
            </span>
            <button
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
              title="Move up"
            >
              <FiArrowUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => move(idx, 1)}
              disabled={idx === value.length - 1}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
              title="Move down"
            >
              <FiArrowDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => remove(idx)}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="Remove"
            >
              <FiTrash2 className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Icon</label>
            <select
              value={feature.icon}
              onChange={(e) => update(idx, { icon: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[var(--primary)] focus:outline-none"
            >
              {FEATURE_ICONS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>
          <FieldText
            label="Title"
            value={feature.title}
            onChange={(v) => update(idx, { title: v })}
            placeholder="Free Delivery"
          />
          <FieldText
            label="Description"
            value={feature.description}
            onChange={(v) => update(idx, { description: v })}
            placeholder="Delivered to your door"
            multiline
          />
        </div>
      ))}
      <button
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:border-[var(--primary)] hover:text-[var(--primary)]"
      >
        <FiPlus className="h-3.5 w-3.5" />
        Add Feature
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Presets — one-click theme combinations
// ────────────────────────────────────────────────────────────────────────────

function PresetsControl({ onApply }: { onApply: (preset: ThemePreset) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500">
        Click a preset to apply its colors and component styles. Save to keep changes.
      </p>
      {THEME_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onApply(preset)}
          className="group flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 text-left hover:border-[var(--primary)] hover:shadow-sm transition"
        >
          <div className="flex flex-shrink-0 gap-0.5">
            {preset.swatches.map((c, i) => (
              <span
                key={i}
                className="h-8 w-3 rounded-sm border border-black/5"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 group-hover:text-[var(--primary)]">{preset.label}</div>
            <p className="mt-0.5 text-[11px] text-gray-500 truncate">{preset.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Import / Export — back up and restore the full customizer config
// ────────────────────────────────────────────────────────────────────────────

interface ExportPayload {
  version: 1;
  exportedAt: string;
  tokens: Record<string, string>;
  options: Record<string, string>;
  sections: Record<string, unknown>;
  content: Record<string, unknown>;
}

function IoControl({ onExport, onImport }: { onExport: () => void; onImport: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500">
        Download the full theme config as a JSON file, or restore one. Imports go into preview — click Save to commit.
      </p>
      <button
        onClick={onExport}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
      >
        <FiDownload className="h-4 w-4" />
        Export Theme JSON
      </button>
      <button
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
      >
        <FiUpload className="h-4 w-4" />
        Import Theme JSON
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Image picker — file upload + URL field + thumbnail preview
// ────────────────────────────────────────────────────────────────────────────

function ImagePicker({
  label,
  value,
  onChange,
  hint,
  placeholder = "/uploads/your-image.png or full URL",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const res = await api.admin.upload(file);
      const url = (res?.url as string) || (res?.data?.url as string) || "";
      if (!url) throw new Error("Upload returned no URL");
      onChange(url);
    } catch (err) {
      console.error("Upload failed", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
      <div className="flex items-start gap-2">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {value ? (
            // Plain <img> — preview is admin-only, doesn't need optimization
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="preview" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-gray-400">No image</span>
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-[var(--primary)] focus:outline-none"
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex flex-1 items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
            >
              <FiUpload className="h-3 w-3" />
              {uploading ? "Uploading…" : "Upload"}
            </button>
            {value && (
              <button
                onClick={() => onChange("")}
                className="flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-500 hover:border-red-300 hover:text-red-600"
                title="Clear"
              >
                <FiTrash2 className="h-3 w-3" />
              </button>
            )}
          </div>
          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function BrandingFieldControl({
  field,
  value,
  onChange,
}: {
  field: BrandingField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.kind === "image") {
    return (
      <ImagePicker
        label={field.label}
        value={value}
        onChange={onChange}
        hint={field.hint}
        placeholder={field.placeholder}
      />
    );
  }
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{field.label}</label>
      {field.hint && <p className="text-[11px] text-gray-400">{field.hint}</p>}
      {field.kind === "textarea" ? (
        <textarea
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[var(--primary)] focus:outline-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[var(--primary)] focus:outline-none"
        />
      )}
    </div>
  );
}

function renderOptionControl(def: OptionDef, value: string, onChange: (v: string) => void) {
  switch (def.type) {
    case "toggle": return <ToggleControl def={def} value={value} onChange={onChange} />;
    case "select": return <ChoiceControl def={def} value={value} onChange={onChange} />;
    case "text":   return <TextControl   def={def} value={value} onChange={onChange} />;
    default: return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Main customizer
// ────────────────────────────────────────────────────────────────────────────

type SectionsMap = Record<SectionsPageId, SectionState[]>;
type ContentMap  = Record<ContentPageId, HomepageContent>;

export default function CustomizerClient({
  initialTokens,
  initialOptions,
  initialSections,
  initialContent,
  initialBranding,
}: {
  initialTokens: StringMap;
  initialOptions: StringMap;
  initialSections: SectionsMap;
  initialContent: ContentMap;
  initialBranding: StringMap;
}) {
  const [tokens, setTokens]     = useState<StringMap>(initialTokens);
  const [options, setOptions]   = useState<StringMap>(initialOptions);
  const [sections, setSections] = useState<SectionsMap>(initialSections);
  const [content, setContent]   = useState<ContentMap>(initialContent);
  const [branding, setBranding] = useState<StringMap>(initialBranding);
  const [savedTokens, setSavedTokens]     = useState<StringMap>(initialTokens);
  const [savedOptions, setSavedOptions]   = useState<StringMap>(initialOptions);
  const [savedSections, setSavedSections] = useState<SectionsMap>(initialSections);
  const [savedContent, setSavedContent]   = useState<ContentMap>(initialContent);
  const [savedBranding, setSavedBranding] = useState<StringMap>(initialBranding);
  // null → show the menu list. Otherwise → show the chosen panel's settings.
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string>("/");
  const [viewport, setViewport] = useState<ViewportKey>("desktop");
  const [saving, setSaving] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Push saved tokens/branding into our OWN parent provider so the dashboard
  // chrome (sidebar, headers — anything outside the preview iframe) re-skins
  // immediately after a save. Without this, admin would have to hard-reload.
  const { setPreviewOverrides } = useSiteSettingsInternal();

  // Track readiness so we don't post messages before the iframe mounts the bridge
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { type?: string })?.type === "customizer:ready") {
        setIframeReady(true);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Reset readiness when navigating to a new preview page
  useEffect(() => { setIframeReady(false); }, [previewPath]);

  // Debounced postMessage for tokens (CSS — cheap to apply on every keystroke)
  useEffect(() => {
    if (!iframeReady) return;
    const handle = window.setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "customizer:tokens", tokens },
        window.location.origin
      );
    }, 80);
    return () => window.clearTimeout(handle);
  }, [tokens, iframeReady]);

  // Debounced postMessage for options (triggers React re-renders inside iframe)
  useEffect(() => {
    if (!iframeReady) return;
    const handle = window.setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "customizer:options", options },
        window.location.origin
      );
    }, 80);
    return () => window.clearTimeout(handle);
  }, [options, iframeReady]);

  // Debounced postMessage for branding (site name, logos, contact, social).
  // Branding lives in the same settings map as options, so PreviewBridge
  // merges it into the SiteSettingsContext overrides for live re-render.
  useEffect(() => {
    if (!iframeReady) return;
    const handle = window.setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "customizer:branding", branding },
        window.location.origin
      );
    }, 80);
    return () => window.clearTimeout(handle);
  }, [branding, iframeReady]);

  // Push the freshly-loaded state to the iframe immediately when it becomes ready
  useEffect(() => {
    if (!iframeReady) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "customizer:tokens",   tokens   }, window.location.origin);
    iframeRef.current?.contentWindow?.postMessage({ type: "customizer:options",  options  }, window.location.origin);
    iframeRef.current?.contentWindow?.postMessage({ type: "customizer:branding", branding }, window.location.origin);
  }, [iframeReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const setToken  = (key: string, value: string) => setTokens((prev)  => ({ ...prev, [key]: value }));
  const setOption = (key: string, value: string) => setOptions((prev) => ({ ...prev, [key]: value }));
  const setPageSections = (pageId: SectionsPageId, next: SectionState[]) =>
    setSections((prev) => ({ ...prev, [pageId]: next }));
  const setPageContent = (pageId: ContentPageId, next: HomepageContent) =>
    setContent((prev) => ({ ...prev, [pageId]: next }));
  const setBrandingField = (key: string, value: string) =>
    setBranding((prev) => ({ ...prev, [key]: value }));

  const isDirty = useMemo(() => {
    if (Object.keys(tokens).some((k) => tokens[k] !== savedTokens[k])) return true;
    if (Object.keys(options).some((k) => options[k] !== savedOptions[k])) return true;
    if (Object.keys(branding).some((k) => branding[k] !== savedBranding[k])) return true;
    for (const pid of Object.keys(sections) as SectionsPageId[]) {
      if (JSON.stringify(sections[pid]) !== JSON.stringify(savedSections[pid])) return true;
    }
    for (const pid of Object.keys(content) as ContentPageId[]) {
      if (JSON.stringify(content[pid]) !== JSON.stringify(savedContent[pid])) return true;
    }
    return false;
  }, [tokens, options, branding, sections, content, savedTokens, savedOptions, savedBranding, savedSections, savedContent]);

  async function handleSave() {
    setSaving(true);
    try {
      const diff: StringMap = {};
      for (const k of Object.keys(tokens))   if (tokens[k]   !== savedTokens[k])   diff[k] = tokens[k];
      for (const k of Object.keys(options))  if (options[k]  !== savedOptions[k])  diff[k] = options[k];
      for (const k of Object.keys(branding)) if (branding[k] !== savedBranding[k]) diff[k] = branding[k];

      // Section configs are stored per page as JSON-serialized state arrays.
      let needsReload = false;
      for (const pid of Object.keys(sections) as SectionsPageId[]) {
        const current = JSON.stringify(sections[pid]);
        const saved = JSON.stringify(savedSections[pid]);
        if (current !== saved) {
          diff[SECTION_CATALOG[pid].storageKey] = current;
          needsReload = true;
        }
      }

      // Page content is stored as a single JSON blob per page.
      for (const pid of Object.keys(content) as ContentPageId[]) {
        const current = JSON.stringify(content[pid]);
        const saved = JSON.stringify(savedContent[pid]);
        if (current !== saved) {
          // Currently only the homepage uses HOMEPAGE_CONTENT_KEY.
          diff[HOMEPAGE_CONTENT_KEY] = current;
          needsReload = true;
        }
      }

      // Branding now updates live via postMessage too — no iframe reload needed.

      await api.admin.updateSettings(diff);
      // Reflect the saved diff in the parent SiteSettingsContext so the
      // dashboard's own chrome (which reads var(--primary) etc.) updates
      // without waiting for a full reload. ThemeStyleSync rewrites the
      // <style id="theme-tokens"> block when tokens change.
      if (Object.keys(diff).length > 0) setPreviewOverrides(diff);
      setSavedTokens({ ...tokens });
      setSavedOptions({ ...options });
      setSavedBranding({ ...branding });
      setSavedSections(JSON.parse(JSON.stringify(sections)));
      setSavedContent(JSON.parse(JSON.stringify(content)));

      // Section/content changes only show up after the iframe re-fetches the SSR page.
      if (needsReload && iframeRef.current) {
        iframeRef.current.src = iframeSrc + `&_t=${Date.now()}`;
      }
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save theme. Check the console.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!confirm("Reset all theme tokens, options, sections, and content to defaults? This won't save until you click Save.")) return;
    setTokens(snapshotTokens({}));
    setOptions(snapshotOptions({}));
    setSections({ home: defaultSectionState(HOME_SECTIONS) });
    setContent({ home: { ...DEFAULT_HOMEPAGE_CONTENT } });
  }

  function handleApplyPreset(preset: ThemePreset) {
    // Sparse merge — preset values override current state, untouched keys remain.
    if (preset.tokens) setTokens((prev) => ({ ...prev, ...preset.tokens }));
    if (preset.options) setOptions((prev) => ({ ...prev, ...preset.options }));
  }

  function handleExport() {
    const payload: ExportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tokens,
      options,
      sections,
      content,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `theme-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<ExportPayload>;
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid file");
      // Defensive merge: only accept known shapes; missing keys keep current state.
      if (parsed.tokens && typeof parsed.tokens === "object") {
        setTokens((prev) => ({ ...prev, ...(parsed.tokens as StringMap) }));
      }
      if (parsed.options && typeof parsed.options === "object") {
        setOptions((prev) => ({ ...prev, ...(parsed.options as StringMap) }));
      }
      if (parsed.sections && typeof parsed.sections === "object") {
        setSections((prev) => ({ ...prev, ...(parsed.sections as SectionsMap) }));
      }
      if (parsed.content && typeof parsed.content === "object") {
        setContent((prev) => ({ ...prev, ...(parsed.content as ContentMap) }));
      }
      alert("Theme imported into preview. Review the changes, then click Save to apply.");
    } catch (err) {
      console.error("Import failed", err);
      alert("Could not parse that file. Make sure it's a valid theme JSON exported from this customizer.");
    }
  }

  const activePanelDef = activePanel ? PANELS.find((p) => p.id === activePanel) ?? null : null;
  const activeSections = activePanelDef?.sections ?? [];
  const iframeSrc = `${previewPath}${previewPath.includes("?") ? "&" : "?"}preview=1`;

  // When user opens the Sections or Content panel, jump preview to the page
  // being edited so they can see what their changes affect after Save.
  useEffect(() => {
    const panel = PANELS.find((p) => p.id === activePanel);
    const targetBlock = panel?.sections.find((s) => s.kind === "sections" || s.kind === "content");
    if (
      targetBlock &&
      (targetBlock.kind === "sections" || targetBlock.kind === "content") &&
      previewPath !== targetBlock.previewPath
    ) {
      setPreviewPath(targetBlock.previewPath);
    }
  }, [activePanel]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
        <Link href="/dashboard" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
          <FiArrowLeft className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>
        <div className="h-5 w-px bg-gray-200" />
        <h1 className="text-sm font-semibold text-gray-800">Theme Customizer</h1>

        {/* Page navigator */}
        <div className="relative ml-4">
          <button
            onClick={() => setPageMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-gray-300"
          >
            <span className="text-gray-400">Previewing:</span>
            <span className="font-medium">{PREVIEW_PAGES.find((p) => p.path === previewPath)?.label ?? previewPath}</span>
            <FiChevronDown className="h-3 w-3" />
          </button>
          {pageMenuOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {PREVIEW_PAGES.map((p) => (
                <button
                  key={p.path}
                  onClick={() => { setPreviewPath(p.path); setPageMenuOpen(false); }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <span>{p.label}</span>
                  {previewPath === p.path && <FiCheck className="h-3 w-3 text-[var(--primary)]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Viewport switcher */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {(Object.keys(VIEWPORTS) as ViewportKey[]).map((v) => {
            const Vp = VIEWPORTS[v];
            const Icon = Vp.icon;
            return (
              <button
                key={v}
                onClick={() => setViewport(v)}
                title={Vp.label}
                className={`rounded-md px-2 py-1 transition ${viewport === v ? "bg-white text-[var(--primary)] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          <FiRotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiSave className="h-3.5 w-3.5" />
          {saving ? "Saving…" : isDirty ? "Save Changes" : "Saved"}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: control panel — WordPress-style drill-down nav */}
        <aside className="flex w-80 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
          {/* Header strip — either the menu title, or a Back button + panel name */}
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
            {activePanelDef ? (
              <>
                <button
                  onClick={() => setActivePanel(null)}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  title="Back to menu"
                >
                  <FiArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <div className="ml-1 flex items-center gap-2 min-w-0">
                  {(() => {
                    const Icon = activePanelDef.icon;
                    return <Icon className="h-4 w-4 text-[var(--primary)] flex-shrink-0" />;
                  })()}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{activePanelDef.label}</div>
                    <div className="text-[10.5px] text-gray-400 truncate">{activePanelDef.description}</div>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="text-sm font-semibold text-gray-800">Customize</div>
                <div className="text-[10.5px] text-gray-400">Pick a section to edit. Changes preview live.</div>
              </div>
            )}
          </div>

          {/* Body — either the menu list, or the active panel's sections */}
          <div className="flex-1 overflow-y-auto">
            {!activePanelDef && (
              <nav className="py-1">
                {PANELS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setActivePanel(p.id)}
                      className="group flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50"
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/8 text-[var(--primary)] group-hover:bg-[var(--primary)]/12">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-gray-800">{p.label}</span>
                        <span className="block text-[11px] text-gray-500 truncate">{p.description}</span>
                      </span>
                      <FiChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-gray-500" />
                    </button>
                  );
                })}
              </nav>
            )}

            {activePanelDef && (
              <div className="px-4 py-4">
            {activeSections.map((section) => {
              if (section.kind === "tokens") {
                const items = TOKENS.filter((t) => t.group === section.group);
                if (items.length === 0) return null;
                return (
                  <section key={section.group} className="mb-6 last:mb-0">
                    <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{section.label}</h3>
                    <div className="space-y-3">
                      {items.map((def) => (
                        <div key={def.key}>
                          {renderTokenControl(def, tokens[def.key] ?? def.default, (v) => setToken(def.key, v))}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }
              if (section.kind === "options") {
                const items = OPTIONS.filter((o) => o.group === section.group);
                if (items.length === 0) return null;
                return (
                  <section key={section.group} className="mb-6 last:mb-0">
                    <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{section.label}</h3>
                    <div className="space-y-3">
                      {items.map((def) => (
                        <div key={def.key}>
                          {renderOptionControl(def, options[def.key] ?? String(def.default), (v) => setOption(def.key, v))}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }
              if (section.kind === "branding") {
                const items = BRANDING_FIELDS.filter((f) => f.group === section.group);
                if (items.length === 0) return null;
                return (
                  <section key={`branding-${section.group}`} className="mb-6 last:mb-0">
                    <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{section.label}</h3>
                    <div className="space-y-3">
                      {items.map((field) => (
                        <BrandingFieldControl
                          key={field.key}
                          field={field}
                          value={branding[field.key] ?? ""}
                          onChange={(v) => setBrandingField(field.key, v)}
                        />
                      ))}
                    </div>
                  </section>
                );
              }
              if (section.kind === "presets") {
                return (
                  <section key="presets" className="mb-6 last:mb-0">
                    <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{section.label}</h3>
                    <PresetsControl onApply={handleApplyPreset} />
                  </section>
                );
              }
              if (section.kind === "io") {
                return (
                  <section key="io" className="mb-6 last:mb-0">
                    <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{section.label}</h3>
                    <IoControl onExport={handleExport} onImport={handleImport} />
                  </section>
                );
              }
              if (section.kind === "sections") {
                const cfg = SECTION_CATALOG[section.pageId];
                return (
                  <section key={section.pageId} className="mb-6 last:mb-0">
                    <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{section.label}</h3>
                    <SectionsControl
                      catalog={cfg.catalog}
                      state={sections[section.pageId]}
                      onChange={(next) => setPageSections(section.pageId, next)}
                    />
                  </section>
                );
              }
              // section.kind === "content"
              const pageContent = content[section.pageId];
              return (
                <section key={`${section.pageId}-${section.block}`} className="mb-6 last:mb-0">
                  <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{section.label}</h3>
                  {section.block === "hero" && (
                    <HeroContentEditor
                      value={pageContent.hero ?? {}}
                      onChange={(v) => setPageContent(section.pageId, { ...pageContent, hero: v })}
                    />
                  )}
                  {section.block === "features" && (
                    <FeaturesEditor
                      value={pageContent.features ?? []}
                      onChange={(v) => setPageContent(section.pageId, { ...pageContent, features: v })}
                    />
                  )}
                  {section.block === "reviews" && (
                    <ReviewsContentEditor
                      value={pageContent.reviews ?? {}}
                      onChange={(v) => setPageContent(section.pageId, { ...pageContent, reviews: v })}
                    />
                  )}
                </section>
              );
            })}
              </div>
            )}
          </div>

          <footer className="border-t border-gray-200 px-4 py-2.5 text-[11px] text-gray-400">
            {Object.keys(TOKENS_BY_KEY).length + OPTIONS.length} controls · {isDirty ? "Unsaved changes" : "All saved"}
          </footer>
        </aside>

        {/* Right: live preview */}
        <main className="flex flex-1 items-start justify-center overflow-auto bg-gray-200 p-4">
          <div
            className="h-full bg-white shadow-xl transition-all"
            style={{ width: VIEWPORTS[viewport].w, maxWidth: "100%" }}
          >
            <iframe
              key={previewPath}
              ref={iframeRef}
              src={iframeSrc}
              className="h-full w-full border-0"
              title="Live preview"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
