"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { theme } from "@/lib/theme";
import type { Bilingual } from "@/lib/bilingual";
import { FiSave } from "react-icons/fi";

export interface ShopContent {
  heroBadge: Bilingual;
  heroTitle: Bilingual;
  heroSubtitle: Bilingual;
  filtersTitle: Bilingual;
  categoryLabel: Bilingual;
  brandLabel: Bilingual;
  priceLabel: Bilingual;
  sortLabel: Bilingual;
  emptyTitle: Bilingual;
  emptyDescription: Bilingual;
  loadMoreText: Bilingual;
}

function BiInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Bilingual;
  onChange: (v: Bilingual) => void;
}) {
  return (
    <div>
      <label className={theme.label}>{label}</label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">English</label>
          <input value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} className={theme.input} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">বাংলা</label>
          <input value={value.bn} onChange={(e) => onChange({ ...value, bn: e.target.value })} className={theme.input} dir="auto" />
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
}: {
  label: string;
  value: Bilingual;
  onChange: (v: Bilingual) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className={theme.label}>{label}</label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">English</label>
          <textarea value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} className={theme.textarea} rows={rows} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">বাংলা</label>
          <textarea value={value.bn} onChange={(e) => onChange({ ...value, bn: e.target.value })} className={theme.textarea} rows={rows} dir="auto" />
        </div>
      </div>
    </div>
  );
}

interface Props {
  initialData: ShopContent;
}

export default function ShopPageEditor({ initialData }: Props) {
  const [content, setContent] = useState<ShopContent>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.admin.updateSettings({ page_shop: JSON.stringify(content) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* */ }
    setSaving(false);
  };

  const setField = <K extends keyof ShopContent>(key: K, val: ShopContent[K]) =>
    setContent((prev) => ({ ...prev, [key]: val }));

  return (
    <DashboardLayout title="Shop Page">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className={theme.btn.primary + " flex items-center gap-2"}>
            <FiSave className="w-4 h-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Hero */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Hero</h3>
          <BiInput label="Badge" value={content.heroBadge} onChange={(v) => setField("heroBadge", v)} />
          <BiInput label="Title" value={content.heroTitle} onChange={(v) => setField("heroTitle", v)} />
          <BiTextarea label="Subtitle" value={content.heroSubtitle} onChange={(v) => setField("heroSubtitle", v)} rows={2} />
        </div>

        {/* Filter Labels */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Filter Labels</h3>
          <BiInput label="Filters Title" value={content.filtersTitle} onChange={(v) => setField("filtersTitle", v)} />
          <BiInput label="Category Label" value={content.categoryLabel} onChange={(v) => setField("categoryLabel", v)} />
          <BiInput label="Brand Label" value={content.brandLabel} onChange={(v) => setField("brandLabel", v)} />
          <BiInput label="Price Label" value={content.priceLabel} onChange={(v) => setField("priceLabel", v)} />
          <BiInput label="Sort Label" value={content.sortLabel} onChange={(v) => setField("sortLabel", v)} />
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Empty State</h3>
          <BiInput label="Title" value={content.emptyTitle} onChange={(v) => setField("emptyTitle", v)} />
          <BiTextarea label="Description" value={content.emptyDescription} onChange={(v) => setField("emptyDescription", v)} rows={2} />
        </div>

        {/* Pagination */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Pagination</h3>
          <BiInput label="Load More Text" value={content.loadMoreText} onChange={(v) => setField("loadMoreText", v)} />
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
