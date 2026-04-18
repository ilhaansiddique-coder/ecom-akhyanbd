"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLang } from "@/lib/LanguageContext";
import { api } from "@/lib/api";
import { theme } from "@/lib/theme";
import { FiSave, FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiUpload, FiX, FiImage } from "react-icons/fi";
import Image from "next/image";
import MediaGallery from "@/components/MediaGallery";

interface FloatingTag {
  emoji: string;
  label: string;
}

interface HeroContent {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  cta_primary: string;
  cta_secondary: string;
  trust_1: string;
  trust_2: string;
  trust_3: string;
  hero_logo: string;
  floating_tags: FloatingTag[];
}

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface TestimonialItem {
  name: string;
  rating: number;
  text: string;
  avatar?: string;
  image?: string;
}

interface ReviewsSection {
  title: string;
  subtitle: string;
  testimonials: TestimonialItem[];
}

interface HomepageContent {
  hero: HeroContent;
  features: FeatureItem[];
  reviews: ReviewsSection;
}

const DEFAULT_CONTENT: HomepageContent = {
  hero: {
    badge: "",
    title: "",
    subtitle: "",
    description: "",
    cta_primary: "",
    cta_secondary: "",
    trust_1: "",
    trust_2: "",
    trust_3: "",
    hero_logo: "",
    floating_tags: [
      { emoji: "🌿", label: "" },
      { emoji: "🍵", label: "" },
      { emoji: "❤️", label: "" },
    ],
  },
  features: [
    { icon: "truck", title: "", description: "" },
    { icon: "headphones", title: "", description: "" },
    { icon: "shield", title: "", description: "" },
    { icon: "refresh", title: "", description: "" },
  ],
  reviews: {
    title: "",
    subtitle: "",
    testimonials: [
      { name: "", rating: 5, text: "" },
      { name: "", rating: 5, text: "" },
      { name: "", rating: 5, text: "" },
    ],
  },
};

const ICON_OPTIONS = [
  { value: "truck", label: "🚚 Truck" },
  { value: "headphones", label: "🎧 Headphones" },
  { value: "shield", label: "🛡️ Shield" },
  { value: "refresh", label: "🔄 Refresh" },
  { value: "star", label: "⭐ Star" },
  { value: "heart", label: "❤️ Heart" },
  { value: "check", label: "✅ Check" },
  { value: "gift", label: "🎁 Gift" },
  { value: "clock", label: "⏰ Clock" },
  { value: "leaf", label: "🍃 Leaf" },
];

function SectionHeader({ title, desc, open, toggle }: { title: string; desc: string; open: boolean; toggle: () => void }) {
  return (
    <button onClick={toggle} className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-xl px-5 py-4 transition-colors">
      <div className="text-left">
        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      {open ? <FiChevronUp className="w-4 h-4 text-gray-400" /> : <FiChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
  );
}

export default function HomepageClient({ initialData }: { initialData?: HomepageContent }) {
  const { t } = useLang();
  const [content, setContent] = useState<HomepageContent>(() => {
    const d = initialData ?? DEFAULT_CONTENT;
    return {
      ...d,
      hero: { ...DEFAULT_CONTENT.hero, ...d.hero },
      reviews: { ...DEFAULT_CONTENT.reviews, ...d.reviews },
    };
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openSections, setOpenSections] = useState({ hero: true, features: false, reviews: false });
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);


  const save = async () => {
    setSaving(true);
    try {
      await api.admin.updateSettings({ homepage_content: JSON.stringify(content) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* */ }
    setSaving(false);
  };

  const updateHero = (key: keyof HeroContent, val: string) => {
    setContent(prev => ({ ...prev, hero: { ...prev.hero, [key]: val } }));
  };

  const updateFeature = (idx: number, key: keyof FeatureItem, val: string) => {
    setContent(prev => {
      const features = [...prev.features];
      features[idx] = { ...features[idx], [key]: val };
      return { ...prev, features };
    });
  };

  const addFeature = () => {
    setContent(prev => ({ ...prev, features: [...prev.features, { icon: "star", title: "", description: "" }] }));
  };

  const removeFeature = (idx: number) => {
    setContent(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  };

  const updateReviews = (key: "title" | "subtitle", val: string) => {
    setContent(prev => ({ ...prev, reviews: { ...prev.reviews, [key]: val } }));
  };

  const updateTestimonial = (idx: number, key: keyof TestimonialItem, val: string | number) => {
    setContent(prev => {
      const testimonials = [...prev.reviews.testimonials];
      testimonials[idx] = { ...testimonials[idx], [key]: val };
      return { ...prev, reviews: { ...prev.reviews, testimonials } };
    });
  };

  const addTestimonial = () => {
    setContent(prev => ({
      ...prev,
      reviews: { ...prev.reviews, testimonials: [...prev.reviews.testimonials, { name: "", rating: 5, text: "" }] },
    }));
  };

  const removeTestimonial = (idx: number) => {
    setContent(prev => ({
      ...prev,
      reviews: { ...prev.reviews, testimonials: prev.reviews.testimonials.filter((_, i) => i !== idx) },
    }));
  };

  const toggle = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) return <DashboardLayout title="Homepage Content"><div className="text-center py-12 text-gray-400">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout title={t("dash.homepageContent") || "Homepage Content"}>
      <div className="max-w-3xl space-y-4">

        {/* ─── HERO SECTION ─── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader title="🏠 Hero Section" desc="Main banner — title, subtitle, description, buttons" open={openSections.hero} toggle={() => toggle("hero")} />
          {openSections.hero && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">Leave fields empty to use default translation values.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={theme.label}>Badge Text</label>
                  <input value={content.hero.badge} onChange={e => updateHero("badge", e.target.value)} className={theme.input} placeholder="নরম, আরামদায়ক ও স্টাইলিশ" />
                </div>
                <div>
                  <label className={theme.label}>Title</label>
                  <input value={content.hero.title} onChange={e => updateHero("title", e.target.value)} className={theme.input} placeholder="আপনার সাইটের নাম" />
                </div>
                <div>
                  <label className={theme.label}>Subtitle</label>
                  <input value={content.hero.subtitle} onChange={e => updateHero("subtitle", e.target.value)} className={theme.input} placeholder="শিশুদের ফ্যাশন কালেকশন" />
                </div>
                <div>
                  <label className={theme.label}>Primary Button</label>
                  <input value={content.hero.cta_primary} onChange={e => updateHero("cta_primary", e.target.value)} className={theme.input} placeholder="এখনই কিনুন" />
                </div>
              </div>
              <div>
                <label className={theme.label}>Description</label>
                <textarea value={content.hero.description} onChange={e => updateHero("description", e.target.value)} className={theme.textarea} rows={3} placeholder="আপনার ছোট্ট সোনামণির জন্য ট্রেন্ডিং পোশাক..." />
              </div>
              <div>
                <label className={theme.label}>Secondary Button</label>
                <input value={content.hero.cta_secondary} onChange={e => updateHero("cta_secondary", e.target.value)} className={theme.input} placeholder="সব পোশাক দেখুন" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={theme.label}>Trust Badge 1</label>
                  <input value={content.hero.trust_1} onChange={e => updateHero("trust_1", e.target.value)} className={theme.input} placeholder="ত্বক-বান্ধব ফেব্রিক" />
                </div>
                <div>
                  <label className={theme.label}>Trust Badge 2</label>
                  <input value={content.hero.trust_2} onChange={e => updateHero("trust_2", e.target.value)} className={theme.input} placeholder="দ্রুত ডেলিভারি" />
                </div>
                <div>
                  <label className={theme.label}>Trust Badge 3</label>
                  <input value={content.hero.trust_3} onChange={e => updateHero("trust_3", e.target.value)} className={theme.input} placeholder="সর্বোচ্চ রেটেড" />
                </div>
              </div>

              {/* Center Logo/Image */}
              <div className="border-t border-gray-100 pt-4">
                <label className={theme.label}>Center Image / Logo</label>
                <div className="flex items-center gap-4 mt-2">
                  {content.hero.hero_logo ? (
                    <img src={content.hero.hero_logo} alt="Hero logo" className="w-20 h-20 object-contain rounded-xl border border-gray-100 bg-gray-50" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs text-center">No image</div>
                  )}
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => setMediaPickerOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
                      <FiImage className="w-4 h-4" /> Choose from Gallery
                    </button>
                    {content.hero.hero_logo && (
                      <button type="button" onClick={() => updateHero("hero_logo" as any, "")} className="text-xs text-red-400 hover:text-red-600 text-left px-1">Remove</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating Tags */}
              <div className="border-t border-gray-100 pt-4">
                <label className={theme.label + " mb-3 block"}>Floating Tags (around the image)</label>
                <div className="grid grid-cols-3 gap-3">
                  {(content.hero.floating_tags || []).map((tag, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500">Tag {idx + 1}</p>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Emoji / Icon</label>
                        <input value={tag.emoji} onChange={e => {
                          const tags = [...(content.hero.floating_tags || [])];
                          tags[idx] = { ...tags[idx], emoji: e.target.value };
                          updateHero("floating_tags" as any, tags as any);
                        }} className={theme.input} placeholder="👕" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Label</label>
                        <input value={tag.label} onChange={e => {
                          const tags = [...(content.hero.floating_tags || [])];
                          tags[idx] = { ...tags[idx], label: e.target.value };
                          updateHero("floating_tags" as any, tags as any);
                        }} className={theme.input} placeholder={idx === 0 ? "টি-শার্ট" : idx === 1 ? "রম্পার" : "প্যান্ট ও জগার"} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── FEATURES SECTION ─── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader title="✨ Features / Trust Badges" desc="Bottom bar — delivery, support, secure, returns" open={openSections.features} toggle={() => toggle("features")} />
          {openSections.features && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">Leave fields empty to use defaults. Add/remove as needed.</p>
              {content.features.map((f, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">Feature {idx + 1}</span>
                    {content.features.length > 1 && (
                      <button onClick={() => removeFeature(idx)} className={theme.btn.icon.delete}><FiTrash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className={theme.label}>Icon</label>
                      <select value={f.icon} onChange={e => updateFeature(idx, "icon", e.target.value)} className={theme.select}>
                        {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={theme.label}>Title</label>
                      <input value={f.title} onChange={e => updateFeature(idx, "title", e.target.value)} className={theme.input} placeholder="দ্রুত ডেলিভারি" />
                    </div>
                    <div>
                      <label className={theme.label}>Description</label>
                      <input value={f.description} onChange={e => updateFeature(idx, "description", e.target.value)} className={theme.input} placeholder="সারা বাংলাদেশে..." />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addFeature} className={theme.btn.outline + " text-xs"}><FiPlus className="w-3.5 h-3.5 mr-1" /> Add Feature</button>
            </div>
          )}
        </div>

        {/* ─── REVIEWS SECTION ─── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader title="⭐ Customer Reviews" desc="Section heading + fallback testimonials" open={openSections.reviews} toggle={() => toggle("reviews")} />
          {openSections.reviews && (
            <div className="p-5 space-y-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">Section heading and fallback reviews (shown when no approved reviews exist).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={theme.label}>Section Title</label>
                  <input value={content.reviews.title} onChange={e => updateReviews("title", e.target.value)} className={theme.input} placeholder="গ্রাহকদের মতামত" />
                </div>
                <div>
                  <label className={theme.label}>Section Subtitle</label>
                  <input value={content.reviews.subtitle} onChange={e => updateReviews("subtitle", e.target.value)} className={theme.input} placeholder="আমাদের সম্মানিত গ্রাহকদের মতামত" />
                </div>
              </div>

              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide pt-2">Fallback Testimonials</h4>
              {content.reviews.testimonials.map((t, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">Testimonial {idx + 1}</span>
                    {content.reviews.testimonials.length > 1 && (
                      <button onClick={() => removeTestimonial(idx)} className={theme.btn.icon.delete}><FiTrash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className={theme.label}>Customer Name</label>
                      <input value={t.name} onChange={e => updateTestimonial(idx, "name", e.target.value)} className={theme.input} placeholder="মোঃ বেলাল শেখ" />
                    </div>
                    <div>
                      <label className={theme.label}>Rating (1-5)</label>
                      <select value={t.rating} onChange={e => updateTestimonial(idx, "rating", Number(e.target.value))} className={theme.select}>
                        {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={theme.label}>Review Text</label>
                      <input value={t.text} onChange={e => updateTestimonial(idx, "text", e.target.value)} className={theme.input} placeholder="খুবই ভালো মানের পণ্য..." />
                    </div>
                  </div>
                  {/* Image uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Avatar */}
                    <div>
                      <label className={theme.label}>Customer Photo</label>
                      {t.avatar ? (
                        <div className="flex items-center gap-3">
                          <Image src={t.avatar} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover border" unoptimized />
                          <button onClick={() => updateTestimonial(idx, "avatar", "")} className="text-xs text-red-500 hover:text-red-700"><FiX className="w-3.5 h-3.5 inline mr-1" />Remove</button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[var(--primary)] transition-colors">
                          <FiUpload className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">Upload photo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const res = await api.admin.upload(file);
                              if (res.url) updateTestimonial(idx, "avatar", res.url);
                            } catch { /* */ }
                          }} />
                        </label>
                      )}
                    </div>
                    {/* Review image */}
                    <div>
                      <label className={theme.label}>Review Image (optional)</label>
                      {t.image ? (
                        <div className="flex items-center gap-3">
                          <Image src={t.image} alt="" width={80} height={48} className="h-12 w-auto rounded-lg object-cover border" unoptimized />
                          <button onClick={() => updateTestimonial(idx, "image", "")} className="text-xs text-red-500 hover:text-red-700"><FiX className="w-3.5 h-3.5 inline mr-1" />Remove</button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[var(--primary)] transition-colors">
                          <FiUpload className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">Upload image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const res = await api.admin.upload(file);
                              if (res.url) updateTestimonial(idx, "image", res.url);
                            } catch { /* */ }
                          }} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addTestimonial} className={theme.btn.outline + " text-xs"}><FiPlus className="w-3.5 h-3.5 mr-1" /> Add Testimonial</button>
            </div>
          )}
        </div>

        {/* Media Gallery for hero logo */}
        <MediaGallery
          open={mediaPickerOpen}
          onClose={() => setMediaPickerOpen(false)}
          onSelect={(url) => { updateHero("hero_logo" as any, url); setMediaPickerOpen(false); }}
        />

        {/* Save button */}
        <div className="sticky bottom-4 flex justify-end">
          <button onClick={save} disabled={saving} className={theme.btn.primary + " shadow-lg"}>
            <FiSave className="w-4 h-4 mr-2 inline" />
            {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
