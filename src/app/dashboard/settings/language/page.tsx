"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSave, FiGlobe } from "react-icons/fi";
import { FormSkeleton } from "@/components/DashboardSkeleton";
import { useLang } from "@/lib/LanguageContext";

export default function LanguageSettingsPage() {
  const { lang } = useLang();
  const [siteLanguage, setSiteLanguage] = useState("bn");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  useEffect(() => {
    api.admin.getSettings()
      .then((res) => {
        const data = res.data || res || {};
        if (data.site_language) setSiteLanguage(data.site_language);
      })
      .catch(() => showToast(lang === "en" ? "Failed to load" : "লোড করতে সমস্যা", "error"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.updateSettings({ site_language: siteLanguage });
      showToast(lang === "en" ? "Language setting saved!" : "ভাষা সেটিংস সংরক্ষিত হয়েছে!");
    } catch {
      showToast(lang === "en" ? "Save failed" : "সংরক্ষণ করতে সমস্যা", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={lang === "en" ? "Language Settings" : "ভাষা সেটিংস"}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      {loading ? <FormSkeleton /> : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <FiGlobe className="w-5 h-5 text-[#0f5931]" />
              <h3 className="text-sm font-bold text-gray-700">{lang === "en" ? "Default Site Language" : "সাইটের ডিফল্ট ভাষা"}</h3>
            </div>

            <div className="space-y-3">
              <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${siteLanguage === "bn" ? "border-[#0f5931] bg-[#0f5931]/5" : "border-gray-100 hover:border-gray-200"}`}>
                <input type="radio" name="lang" value="bn" checked={siteLanguage === "bn"} onChange={() => setSiteLanguage("bn")} className="accent-[#0f5931] w-4 h-4" />
                <div>
                  <span className="text-base font-semibold">🇧🇩 বাংলা (Bengali)</span>
                  <p className="text-xs text-gray-400 mt-0.5">{lang === "en" ? "Site will load in Bengali by default for all new visitors" : "নতুন ভিজিটররা সাইটটি বাংলায় দেখবে"}</p>
                </div>
              </label>

              <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${siteLanguage === "en" ? "border-[#0f5931] bg-[#0f5931]/5" : "border-gray-100 hover:border-gray-200"}`}>
                <input type="radio" name="lang" value="en" checked={siteLanguage === "en"} onChange={() => setSiteLanguage("en")} className="accent-[#0f5931] w-4 h-4" />
                <div>
                  <span className="text-base font-semibold">🇬🇧 English</span>
                  <p className="text-xs text-gray-400 mt-0.5">{lang === "en" ? "Site will load in English by default for all new visitors" : "নতুন ভিজিটররা সাইটটি ইংরেজিতে দেখবে"}</p>
                </div>
              </label>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">
                💡 {lang === "en"
                  ? "This sets the default language for new visitors. Users can still switch languages using the language toggle on the site. Their preference is saved in their browser."
                  : "এটি নতুন ভিজিটরদের জন্য ডিফল্ট ভাষা সেট করে। ব্যবহারকারীরা সাইটের ভাষা টগল ব্যবহার করে ভাষা পরিবর্তন করতে পারবেন। তাদের পছন্দ তাদের ব্রাউজারে সংরক্ষিত থাকবে।"}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50">
              <FiSave className="w-4 h-4" />
              {saving ? (lang === "en" ? "Saving..." : "সংরক্ষণ হচ্ছে...") : (lang === "en" ? "Save Language" : "ভাষা সংরক্ষণ করুন")}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
