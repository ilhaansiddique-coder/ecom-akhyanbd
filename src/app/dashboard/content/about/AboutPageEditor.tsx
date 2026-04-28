"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLang } from "@/lib/LanguageContext";
import { api } from "@/lib/api";
import { theme } from "@/lib/theme";
import type { Bilingual } from "@/lib/bilingual";
import { FiSave, FiPlus, FiTrash2, FiChevronDown, FiChevronUp } from "react-icons/fi";

interface StatItem {
  value: Bilingual;
  label: Bilingual;
}

interface TimelineItem {
  year: Bilingual;
  event: Bilingual;
}

interface WhyUsItem {
  title: Bilingual;
  desc: Bilingual;
}

interface TeamMember {
  name: Bilingual;
  role: Bilingual;
  initials: string;
}

export interface AboutContent {
  heroBadge: Bilingual;
  heroTitle: Bilingual;
  heroSubtitle: Bilingual;
  missionTitle: Bilingual;
  missionDescription: Bilingual;
  stats: StatItem[];
  storyTitle: Bilingual;
  storyP1: Bilingual;
  storyP2: Bilingual;
  storyP3: Bilingual;
  timeline: TimelineItem[];
  whyUsTitle: Bilingual;
  whyUsSubtitle: Bilingual;
  whyUsItems: WhyUsItem[];
  teamTitle: Bilingual;
  teamSubtitle: Bilingual;
  teamMembers: TeamMember[];
}

function SectionHeader({
  title,
  desc,
  open,
  toggle,
}: {
  title: string;
  desc: string;
  open: boolean;
  toggle: () => void;
}) {
  return (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-xl px-5 py-4 transition-colors"
    >
      <div className="text-left">
        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      {open ? (
        <FiChevronUp className="w-4 h-4 text-gray-400" />
      ) : (
        <FiChevronDown className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}

/** Side-by-side EN/BN single-line input pair. */
function BiInput({
  label,
  value,
  onChange,
  placeholderEn,
  placeholderBn,
  maxLength,
}: {
  label: string;
  value: Bilingual;
  onChange: (v: Bilingual) => void;
  placeholderEn?: string;
  placeholderBn?: string;
  maxLength?: number;
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
            maxLength={maxLength}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">বাংলা</label>
          <input
            value={value.bn}
            onChange={(e) => onChange({ ...value, bn: e.target.value })}
            className={theme.input}
            placeholder={placeholderBn}
            maxLength={maxLength}
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

export default function AboutPageEditor({ initialData }: { initialData: AboutContent }) {
  useLang();
  const [content, setContent] = useState<AboutContent>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openSections, setOpenSections] = useState({
    hero: true,
    mission: false,
    story: false,
    whyUs: false,
    team: false,
  });

  const toggle = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.admin.updateSettings({ page_about: JSON.stringify(content) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* */
    }
    setSaving(false);
  };

  // Generic setter for top-level Bilingual fields
  const setBi = <K extends keyof AboutContent>(key: K, val: Bilingual) =>
    setContent((prev) => ({ ...prev, [key]: val } as AboutContent));

  // Stats
  const updateStat = (idx: number, key: keyof StatItem, val: Bilingual) => {
    setContent((prev) => {
      const stats = [...prev.stats];
      stats[idx] = { ...stats[idx], [key]: val };
      return { ...prev, stats };
    });
  };
  const addStat = () =>
    setContent((prev) => ({
      ...prev,
      stats: [...prev.stats, { value: { en: "", bn: "" }, label: { en: "", bn: "" } }],
    }));
  const removeStat = (idx: number) =>
    setContent((prev) => ({ ...prev, stats: prev.stats.filter((_, i) => i !== idx) }));

  // Timeline
  const updateTimeline = (idx: number, key: keyof TimelineItem, val: Bilingual) => {
    setContent((prev) => {
      const timeline = [...prev.timeline];
      timeline[idx] = { ...timeline[idx], [key]: val };
      return { ...prev, timeline };
    });
  };
  const addTimeline = () =>
    setContent((prev) => ({
      ...prev,
      timeline: [...prev.timeline, { year: { en: "", bn: "" }, event: { en: "", bn: "" } }],
    }));
  const removeTimeline = (idx: number) =>
    setContent((prev) => ({ ...prev, timeline: prev.timeline.filter((_, i) => i !== idx) }));

  // Why Us
  const updateWhyUsItem = (idx: number, key: keyof WhyUsItem, val: Bilingual) => {
    setContent((prev) => {
      const whyUsItems = [...prev.whyUsItems];
      whyUsItems[idx] = { ...whyUsItems[idx], [key]: val };
      return { ...prev, whyUsItems };
    });
  };
  const addWhyUsItem = () =>
    setContent((prev) => ({
      ...prev,
      whyUsItems: [...prev.whyUsItems, { title: { en: "", bn: "" }, desc: { en: "", bn: "" } }],
    }));
  const removeWhyUsItem = (idx: number) =>
    setContent((prev) => ({ ...prev, whyUsItems: prev.whyUsItems.filter((_, i) => i !== idx) }));

  // Team
  const updateMemberBi = (idx: number, key: "name" | "role", val: Bilingual) => {
    setContent((prev) => {
      const teamMembers = [...prev.teamMembers];
      teamMembers[idx] = { ...teamMembers[idx], [key]: val };
      return { ...prev, teamMembers };
    });
  };
  const updateMemberInitials = (idx: number, val: string) => {
    setContent((prev) => {
      const teamMembers = [...prev.teamMembers];
      teamMembers[idx] = { ...teamMembers[idx], initials: val };
      return { ...prev, teamMembers };
    });
  };
  const addMember = () =>
    setContent((prev) => ({
      ...prev,
      teamMembers: [
        ...prev.teamMembers,
        { name: { en: "", bn: "" }, role: { en: "", bn: "" }, initials: "" },
      ],
    }));
  const removeMember = (idx: number) =>
    setContent((prev) => ({ ...prev, teamMembers: prev.teamMembers.filter((_, i) => i !== idx) }));

  return (
    <DashboardLayout title="About Page">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Save button row */}
        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className={theme.btn.primary + " flex items-center gap-2"}>
            <FiSave className="w-4 h-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* ── HERO ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Hero Section"
            desc="Badge, title, subtitle shown at the top of the About page"
            open={openSections.hero}
            toggle={() => toggle("hero")}
          />
          {openSections.hero && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              <BiInput
                label="Hero Badge"
                value={content.heroBadge}
                onChange={(v) => setBi("heroBadge", v)}
                placeholderEn="Best for kids"
                placeholderBn="শিশুদের জন্য সেরা"
              />
              <BiInput
                label="Hero Title"
                value={content.heroTitle}
                onChange={(v) => setBi("heroTitle", v)}
                placeholderEn="About Us"
                placeholderBn="আমাদের সম্পর্কে"
              />
              <BiTextarea
                label="Hero Subtitle"
                value={content.heroSubtitle}
                onChange={(v) => setBi("heroSubtitle", v)}
                placeholderEn="We are a trusted children's fashion brand in Bangladesh."
                placeholderBn="আমরা বাংলাদেশের একটি বিশ্বস্ত শিশু ফ্যাশন ব্র্যান্ড।"
              />
            </div>
          )}
        </div>

        {/* ── MISSION ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Mission Section"
            desc="Mission title, description, and stats cards"
            open={openSections.mission}
            toggle={() => toggle("mission")}
          />
          {openSections.mission && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              <BiInput
                label="Mission Title"
                value={content.missionTitle}
                onChange={(v) => setBi("missionTitle", v)}
                placeholderEn="Our Mission"
                placeholderBn="আমাদের লক্ষ্য"
              />
              <BiTextarea
                label="Mission Description"
                value={content.missionDescription}
                onChange={(v) => setBi("missionDescription", v)}
              />

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className={theme.label + " mb-0"}>Stats Cards</label>
                  <button onClick={addStat} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
                    <FiPlus className="w-3.5 h-3.5" /> Add Stat
                  </button>
                </div>
                <div className="space-y-3">
                  {content.stats.map((stat, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500">Stat {idx + 1}</span>
                        <button onClick={() => removeStat(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <BiInput
                        label="Value"
                        value={stat.value}
                        onChange={(v) => updateStat(idx, "value", v)}
                        placeholderEn="200+"
                        placeholderBn="২০০+"
                      />
                      <BiInput
                        label="Label"
                        value={stat.label}
                        onChange={(v) => updateStat(idx, "label", v)}
                        placeholderEn="Fashion Items"
                        placeholderBn="ফ্যাশন আইটেম"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── STORY ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Story Section"
            desc="Journey narrative and timeline"
            open={openSections.story}
            toggle={() => toggle("story")}
          />
          {openSections.story && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              <BiInput
                label="Story Title"
                value={content.storyTitle}
                onChange={(v) => setBi("storyTitle", v)}
                placeholderEn="How Our Journey Began"
                placeholderBn="কীভাবে শুরু হলো আমাদের যাত্রা"
              />
              <BiTextarea
                label="Paragraph 1"
                value={content.storyP1}
                onChange={(v) => setBi("storyP1", v)}
              />
              <BiTextarea
                label="Paragraph 2"
                value={content.storyP2}
                onChange={(v) => setBi("storyP2", v)}
              />
              <BiTextarea
                label="Paragraph 3"
                value={content.storyP3}
                onChange={(v) => setBi("storyP3", v)}
              />

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className={theme.label + " mb-0"}>Timeline</label>
                  <button onClick={addTimeline} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
                    <FiPlus className="w-3.5 h-3.5" /> Add Entry
                  </button>
                </div>
                <div className="space-y-3">
                  {content.timeline.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500">Entry {idx + 1}</span>
                        <button onClick={() => removeTimeline(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <BiInput
                        label="Year"
                        value={item.year}
                        onChange={(v) => updateTimeline(idx, "year", v)}
                        placeholderEn="2018"
                        placeholderBn="২০১৮"
                      />
                      <BiInput
                        label="Event"
                        value={item.event}
                        onChange={(v) => updateTimeline(idx, "event", v)}
                        placeholderEn="Brand established"
                        placeholderBn="ব্র্যান্ড প্রতিষ্ঠা"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── WHY US ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Why Choose Us Section"
            desc="Title, subtitle, and feature cards"
            open={openSections.whyUs}
            toggle={() => toggle("whyUs")}
          />
          {openSections.whyUs && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              <BiInput
                label="Section Title"
                value={content.whyUsTitle}
                onChange={(v) => setBi("whyUsTitle", v)}
                placeholderEn="Why Choose Us?"
                placeholderBn="কেন আমাদের বেছে নেবেন?"
              />
              <BiInput
                label="Section Subtitle"
                value={content.whyUsSubtitle}
                onChange={(v) => setBi("whyUsSubtitle", v)}
              />

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className={theme.label + " mb-0"}>Feature Cards</label>
                  <button onClick={addWhyUsItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
                    <FiPlus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {content.whyUsItems.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500">Item {idx + 1}</span>
                        <button onClick={() => removeWhyUsItem(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <BiInput
                        label="Title"
                        value={item.title}
                        onChange={(v) => updateWhyUsItem(idx, "title", v)}
                        placeholderEn="Skin-Friendly Fabric"
                        placeholderBn="ত্বক-বান্ধব কাপড়"
                      />
                      <BiTextarea
                        label="Description"
                        value={item.desc}
                        onChange={(v) => updateWhyUsItem(idx, "desc", v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── TEAM ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Team Section"
            desc="Team title, subtitle, and member cards"
            open={openSections.team}
            toggle={() => toggle("team")}
          />
          {openSections.team && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              <BiInput
                label="Team Title"
                value={content.teamTitle}
                onChange={(v) => setBi("teamTitle", v)}
                placeholderEn="Our Team"
                placeholderBn="আমাদের দল"
              />
              <BiInput
                label="Team Subtitle"
                value={content.teamSubtitle}
                onChange={(v) => setBi("teamSubtitle", v)}
              />

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className={theme.label + " mb-0"}>Team Members</label>
                  <button onClick={addMember} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
                    <FiPlus className="w-3.5 h-3.5" /> Add Member
                  </button>
                </div>
                <div className="space-y-3">
                  {content.teamMembers.map((member, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500">Member {idx + 1}</span>
                        <button onClick={() => removeMember(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <BiInput
                        label="Name"
                        value={member.name}
                        onChange={(v) => updateMemberBi(idx, "name", v)}
                        placeholderEn="Rahim Uddin"
                        placeholderBn="রহিম উদ্দিন"
                      />
                      <BiInput
                        label="Role"
                        value={member.role}
                        onChange={(v) => updateMemberBi(idx, "role", v)}
                        placeholderEn="Founder & CEO"
                        placeholderBn="প্রতিষ্ঠাতা ও প্রধান নির্বাহী"
                      />
                      <div>
                        <label className={theme.label}>Initials</label>
                        <input
                          value={member.initials}
                          onChange={(e) => updateMemberInitials(idx, e.target.value)}
                          className={theme.input}
                          placeholder="R"
                          maxLength={3}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
