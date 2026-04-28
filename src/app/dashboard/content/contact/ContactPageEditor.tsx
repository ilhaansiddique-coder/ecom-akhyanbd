"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { theme } from "@/lib/theme";
import type { Bilingual } from "@/lib/bilingual";
import { FiSave } from "react-icons/fi";

export interface ContactContent {
  heroBadge: Bilingual;
  heroTitle: Bilingual;
  heroSubtitle: Bilingual;
  formTitle: Bilingual;
  formNameLabel: Bilingual;
  formEmailLabel: Bilingual;
  formPhoneLabel: Bilingual;
  formSubjectLabel: Bilingual;
  formMessageLabel: Bilingual;
  formSubmitText: Bilingual;
  formSuccessText: Bilingual;
  infoTitle: Bilingual;
  infoSubtitle: Bilingual;
  hoursTitle: Bilingual;
  hoursText: Bilingual;
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
  initialData: ContactContent;
}

export default function ContactPageEditor({ initialData }: Props) {
  const [content, setContent] = useState<ContactContent>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.admin.updateSettings({ page_contact: JSON.stringify(content) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* */ }
    setSaving(false);
  };

  const setField = <K extends keyof ContactContent>(key: K, val: ContactContent[K]) =>
    setContent((prev) => ({ ...prev, [key]: val }));

  return (
    <DashboardLayout title="Contact Page">
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

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Contact Form</h3>
          <BiInput label="Form Title" value={content.formTitle} onChange={(v) => setField("formTitle", v)} />
          <BiInput label="Name Label" value={content.formNameLabel} onChange={(v) => setField("formNameLabel", v)} />
          <BiInput label="Email Label" value={content.formEmailLabel} onChange={(v) => setField("formEmailLabel", v)} />
          <BiInput label="Phone Label" value={content.formPhoneLabel} onChange={(v) => setField("formPhoneLabel", v)} />
          <BiInput label="Subject Label" value={content.formSubjectLabel} onChange={(v) => setField("formSubjectLabel", v)} />
          <BiInput label="Message Label" value={content.formMessageLabel} onChange={(v) => setField("formMessageLabel", v)} />
          <BiInput label="Submit Button Text" value={content.formSubmitText} onChange={(v) => setField("formSubmitText", v)} />
          <BiTextarea label="Success Message" value={content.formSuccessText} onChange={(v) => setField("formSuccessText", v)} rows={2} />
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Contact Info Section</h3>
          <BiInput label="Info Title" value={content.infoTitle} onChange={(v) => setField("infoTitle", v)} />
          <BiInput label="Info Subtitle" value={content.infoSubtitle} onChange={(v) => setField("infoSubtitle", v)} />
        </div>

        {/* Business Hours */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Business Hours</h3>
          <BiInput label="Title" value={content.hoursTitle} onChange={(v) => setField("hoursTitle", v)} />
          <BiTextarea label="Hours Text" value={content.hoursText} onChange={(v) => setField("hoursText", v)} rows={4} />
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
