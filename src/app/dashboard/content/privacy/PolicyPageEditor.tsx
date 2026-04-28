"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { theme } from "@/lib/theme";
import type { Bilingual } from "@/lib/bilingual";
import { FiSave, FiPlus, FiTrash2, FiChevronDown, FiChevronUp } from "react-icons/fi";

export interface PolicySection {
  title: Bilingual;
  content: Bilingual;
}

export interface PolicyContent {
  title: Bilingual;
  lastUpdated: Bilingual;
  intro: Bilingual;
  sections: PolicySection[];
}

interface PolicyPageEditorProps {
  initialData: PolicyContent;
  settingKey: string;
  pageLabel: string;
}

/** Side-by-side EN/BN single-line input pair. */
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

/** Side-by-side EN/BN textarea pair. */
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

export default function PolicyPageEditor({ initialData, settingKey, pageLabel }: PolicyPageEditorProps) {
  const [content, setContent] = useState<PolicyContent>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({ 0: true });

  const toggleSection = (idx: number) => {
    setOpenSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.admin.updateSettings({ [settingKey]: JSON.stringify(content) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* */
    }
    setSaving(false);
  };

  const setField = (key: keyof Omit<PolicyContent, "sections">, val: Bilingual) =>
    setContent((prev) => ({ ...prev, [key]: val }));

  const updateSection = (idx: number, key: keyof PolicySection, val: Bilingual) => {
    setContent((prev) => {
      const sections = [...prev.sections];
      sections[idx] = { ...sections[idx], [key]: val };
      return { ...prev, sections };
    });
  };

  const addSection = () => {
    const newIdx = content.sections.length;
    setContent((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        { title: { en: "", bn: "" }, content: { en: "", bn: "" } },
      ],
    }));
    setOpenSections((prev) => ({ ...prev, [newIdx]: true }));
  };

  const removeSection = (idx: number) => {
    setContent((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== idx) }));
    setOpenSections((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const n = parseInt(k);
        if (n < idx) next[n] = v;
        else if (n > idx) next[n - 1] = v;
      });
      return next;
    });
  };

  return (
    <DashboardLayout title={pageLabel}>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Save button row */}
        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className={theme.btn.primary + " flex items-center gap-2"}>
            <FiSave className="w-4 h-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* ── Page Meta ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Page Settings</h3>
          <BiInput
            label="Page Title"
            value={content.title}
            onChange={(v) => setField("title", v)}
            placeholderEn="Privacy Policy"
            placeholderBn="গোপনীয়তা নীতি"
          />
          <BiInput
            label="Last Updated"
            value={content.lastUpdated}
            onChange={(v) => setField("lastUpdated", v)}
            placeholderEn="January 1, 2025"
            placeholderBn="১ জানুয়ারি ২০২৫"
          />
          <BiTextarea
            label="Intro Text"
            value={content.intro}
            onChange={(v) => setField("intro", v)}
          />
        </div>

        {/* ── Sections ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Content Sections</h3>
              <p className="text-xs text-gray-400 mt-0.5">Each section has a title and rich text content</p>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {content.sections.map((section, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Section header */}
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-3">
                  <span className="w-6 h-6 bg-primary text-white rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <button
                    onClick={() => toggleSection(idx)}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {section.title.en || section.title.bn || `Section ${idx + 1}`}
                    </span>
                    {openSections[idx] ? (
                      <FiChevronUp className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                    ) : (
                      <FiChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                    )}
                  </button>
                  <button
                    onClick={() => removeSection(idx)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {openSections[idx] && (
                  <div className="p-4 space-y-3 border-t border-gray-100">
                    <BiInput
                      label="Section Title"
                      value={section.title}
                      onChange={(v) => updateSection(idx, "title", v)}
                      placeholderEn="Section title…"
                      placeholderBn="সেকশনের শিরোনাম…"
                    />
                    <BiTextarea
                      label="Content"
                      value={section.content}
                      onChange={(v) => updateSection(idx, "content", v)}
                      rows={6}
                      placeholderEn="Section content… (supports plain text with newlines)"
                      placeholderBn="সেকশনের বিষয়বস্তু…"
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={addSection}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <FiPlus className="w-4 h-4" /> Add Section
            </button>
          </div>
        </div>

        {/* Bottom save */}
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
