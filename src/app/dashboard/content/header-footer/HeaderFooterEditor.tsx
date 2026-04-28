"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { theme } from "@/lib/theme";
import type { Bilingual } from "@/lib/bilingual";
import { FiSave } from "react-icons/fi";

export interface HeaderFooterContent {
  topbar: {
    enabled: boolean;
    text1: Bilingual;
    text2: Bilingual;
  };
  footer: {
    description: Bilingual;
    copyrightText: Bilingual;
    quickLinksTitle: Bilingual;
    contactTitle: Bilingual;
    legalTitle: Bilingual;
    newsletterTitle: Bilingual;
    newsletterSubtitle: Bilingual;
    newsletterPlaceholder: Bilingual;
    newsletterButton: Bilingual;
    developedByText: Bilingual;
  };
}

/**
 * Header display settings — stored as INDIVIDUAL `header.*` rows in
 * `site_settings`, not inside the page_header_footer JSON. Sharing keys with
 * the existing /dashboard/customizer page so both editors stay in sync.
 */
export interface HeaderDisplay {
  layout: "classic" | "centered" | "minimal";
  sticky: boolean;
  showTopbar: boolean;
  showSearch: boolean;
  showCart: boolean;
  showLogin: boolean;
  showBrandText: boolean;   // site name beside logo
  showTagline: boolean;     // tagline under site name
}

function BiInput({
  label,
  value,
  onChange,
  placeholderEn,
  placeholderBn,
}: {
  label: string;
  value: Bilingual;
  onChange: (v: Bilingual) => void;
  placeholderEn?: string;
  placeholderBn?: string;
}) {
  return (
    <div>
      <label className={theme.label}>{label}</label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">English</label>
          <input
            value={value.en}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            className={theme.input}
            placeholder={placeholderEn}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">বাংলা</label>
          <input
            value={value.bn}
            onChange={(e) => onChange({ ...value, bn: e.target.value })}
            className={theme.input}
            placeholder={placeholderBn}
            dir="auto"
          />
        </div>
      </div>
    </div>
  );
}

function BiTextarea({
  label,
  value,
  onChange,
  rows = 4,
  placeholderEn,
  placeholderBn,
}: {
  label: string;
  value: Bilingual;
  onChange: (v: Bilingual) => void;
  rows?: number;
  placeholderEn?: string;
  placeholderBn?: string;
}) {
  return (
    <div>
      <label className={theme.label}>{label}</label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">English</label>
          <textarea
            value={value.en}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            className={theme.textarea}
            rows={rows}
            placeholder={placeholderEn}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">বাংলা</label>
          <textarea
            value={value.bn}
            onChange={(e) => onChange({ ...value, bn: e.target.value })}
            className={theme.textarea}
            rows={rows}
            placeholder={placeholderBn}
            dir="auto"
          />
        </div>
      </div>
    </div>
  );
}

interface Props {
  initialData: HeaderFooterContent;
  initialDisplay: HeaderDisplay;
}

export default function HeaderFooterEditor({ initialData, initialDisplay }: Props) {
  const [content, setContent] = useState<HeaderFooterContent>(initialData);
  const [display, setDisplay] = useState<HeaderDisplay>(initialDisplay);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      // Single API call writes the JSON content + every individual header.* row.
      await api.admin.updateSettings({
        page_header_footer: JSON.stringify(content),
        "header.layout": display.layout,
        "header.sticky": String(display.sticky),
        "header.show_topbar": String(display.showTopbar),
        "header.show_search": String(display.showSearch),
        "header.show_cart": String(display.showCart),
        "header.show_login": String(display.showLogin),
        "header.show_brand_text": String(display.showBrandText),
        "header.show_tagline": String(display.showTagline),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* */ }
    setSaving(false);
  };

  const setTopbar = <K extends keyof HeaderFooterContent["topbar"]>(key: K, val: HeaderFooterContent["topbar"][K]) =>
    setContent((prev) => ({ ...prev, topbar: { ...prev.topbar, [key]: val } }));

  const setFooter = <K extends keyof HeaderFooterContent["footer"]>(key: K, val: HeaderFooterContent["footer"][K]) =>
    setContent((prev) => ({ ...prev, footer: { ...prev.footer, [key]: val } }));

  const setDisplayKey = <K extends keyof HeaderDisplay>(key: K, val: HeaderDisplay[K]) =>
    setDisplay((prev) => ({ ...prev, [key]: val }));

  return (
    <DashboardLayout title="Header & Footer">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className={theme.btn.primary + " flex items-center gap-2"}>
            <FiSave className="w-4 h-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Header — layout & visibility */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Header</h3>
            <p className="text-xs text-gray-400 mt-0.5">Layout, sticky behavior, and which icons to show in the navbar</p>
          </div>

          {/* Layout */}
          <div>
            <label className={theme.label}>Layout</label>
            <div className="grid grid-cols-3 gap-2">
              {(["classic", "centered", "minimal"] as const).map((opt) => {
                const active = display.layout === opt;
                const labels: Record<typeof opt, { title: string; desc: string }> = {
                  classic: { title: "Classic", desc: "Logo left, menu center" },
                  centered: { title: "Centered", desc: "Logo center, menu below" },
                  minimal: { title: "Minimal", desc: "Logo + actions only" },
                };
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDisplayKey("layout", opt)}
                    className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${active ? "text-primary" : "text-gray-800"}`}>
                      {labels[opt].title}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{labels[opt].desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="grid sm:grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={display.sticky} onChange={(e) => setDisplayKey("sticky", e.target.checked)} className={theme.checkbox} />
              Stick to top on scroll
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={display.showTopbar} onChange={(e) => setDisplayKey("showTopbar", e.target.checked)} className={theme.checkbox} />
              Show top bar
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={display.showBrandText} onChange={(e) => setDisplayKey("showBrandText", e.target.checked)} className={theme.checkbox} />
              Show site name beside logo
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={display.showTagline} onChange={(e) => setDisplayKey("showTagline", e.target.checked)} className={theme.checkbox} />
              Show tagline under site name
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={display.showSearch} onChange={(e) => setDisplayKey("showSearch", e.target.checked)} className={theme.checkbox} />
              Show search icon
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={display.showCart} onChange={(e) => setDisplayKey("showCart", e.target.checked)} className={theme.checkbox} />
              Show cart icon
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={display.showLogin} onChange={(e) => setDisplayKey("showLogin", e.target.checked)} className={theme.checkbox} />
              Show login button
            </label>
          </div>
        </div>

        {/* Top Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Top Bar</h3>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={content.topbar.enabled}
              onChange={(e) => setTopbar("enabled", e.target.checked)}
              className={theme.checkbox}
            />
            <span>Show top bar</span>
          </label>
          <BiInput label="Text 1" value={content.topbar.text1} onChange={(v) => setTopbar("text1", v)} />
          <BiInput label="Text 2" value={content.topbar.text2} onChange={(v) => setTopbar("text2", v)} />
        </div>

        {/* Footer */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Footer</h3>
          <BiTextarea label="Description" value={content.footer.description} onChange={(v) => setFooter("description", v)} rows={3} />
          <BiInput label="Quick Links Title" value={content.footer.quickLinksTitle} onChange={(v) => setFooter("quickLinksTitle", v)} />
          <BiInput label="Contact Title" value={content.footer.contactTitle} onChange={(v) => setFooter("contactTitle", v)} />
          <BiInput label="Legal Title" value={content.footer.legalTitle} onChange={(v) => setFooter("legalTitle", v)} />
          <BiInput label="Copyright Text" value={content.footer.copyrightText} onChange={(v) => setFooter("copyrightText", v)} />
          <BiInput label="Developed By Text" value={content.footer.developedByText} onChange={(v) => setFooter("developedByText", v)} />
        </div>

        {/* Newsletter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Newsletter Section</h3>
          <BiInput label="Title" value={content.footer.newsletterTitle} onChange={(v) => setFooter("newsletterTitle", v)} />
          <BiInput label="Subtitle" value={content.footer.newsletterSubtitle} onChange={(v) => setFooter("newsletterSubtitle", v)} />
          <BiInput label="Placeholder" value={content.footer.newsletterPlaceholder} onChange={(v) => setFooter("newsletterPlaceholder", v)} />
          <BiInput label="Button Text" value={content.footer.newsletterButton} onChange={(v) => setFooter("newsletterButton", v)} />
        </div>

        <div className="flex justify-end pb-4">
          <button onClick={save} disabled={saving} className={theme.btn.primary + " flex items-center gap-2"}>
            <FiSave className="w-4 h-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
