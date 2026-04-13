"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSave, FiGlobe, FiMonitor, FiLayout } from "react-icons/fi";
import { FormSkeleton } from "@/components/DashboardSkeleton";
import { useLang } from "@/lib/LanguageContext";

export default function LanguageSettingsPage() {
  const { lang } = useLang();
  const [frontendLang, setFrontendLang] = useState("bn");
  const [dashboardLang, setDashboardLang] = useState("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  useEffect(() => {
    api.admin.getSettings()
      .then((res) => {
        const data = res.data || res || {};
        if (data.site_language) setFrontendLang(data.site_language);
        if (data.dashboard_language) setDashboardLang(data.dashboard_language);
      })
      .catch(() => showToast("Failed to load", "error"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.updateSettings({
        site_language: frontendLang,
        dashboard_language: dashboardLang,
      });
      showToast(lang === "en" ? "Language settings saved!" : "ভাষা সেটিংস সংরক্ষিত!");
      // Reload to apply dashboard language change
      window.location.reload();
    } catch {
      showToast(lang === "en" ? "Save failed" : "সংরক্ষণ করতে সমস্যা", "error");
      setSaving(false);
    }
  };

  const LangOption = ({ value, current, onChange, flag, label, desc }: {
    value: string; current: string; onChange: (v: string) => void;
    flag: string; label: string; desc: string;
  }) => (
    <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${current === value ? "border-[#0f5931] bg-[#0f5931]/5" : "border-gray-100 hover:border-gray-200"}`}>
      <input type="radio" checked={current === value} onChange={() => onChange(value)} className="accent-[#0f5931] w-4 h-4" />
      <div>
        <span className="text-base font-semibold">{flag} {label}</span>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
    </label>
  );

  return (
    <DashboardLayout title={lang === "en" ? "Language Settings" : "ভাষা সেটিংস"}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      {loading ? <FormSkeleton /> : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
          {/* Frontend Language */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiGlobe className="w-5 h-5 text-[#0f5931]" />
              <h3 className="text-sm font-bold text-gray-700">{lang === "en" ? "Website Language (Frontend)" : "ওয়েবসাইটের ভাষা (ফ্রন্টেন্ড)"}</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">{lang === "en" ? "The language visitors see on your store pages" : "ভিজিটররা আপনার দোকানের পেজে যে ভাষা দেখবে"}</p>
            <div className="space-y-2">
              <LangOption value="bn" current={frontendLang} onChange={setFrontendLang}
                flag="🇧🇩" label="বাংলা (Bengali)" desc={lang === "en" ? "Shop, products, checkout in Bengali" : "শপ, পণ্য, চেকআউট বাংলায়"} />
              <LangOption value="en" current={frontendLang} onChange={setFrontendLang}
                flag="🇬🇧" label="English" desc={lang === "en" ? "Shop, products, checkout in English" : "শপ, পণ্য, চেকআউট ইংরেজিতে"} />
            </div>
          </div>

          {/* Dashboard Language */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiLayout className="w-5 h-5 text-[#0f5931]" />
              <h3 className="text-sm font-bold text-gray-700">{lang === "en" ? "Dashboard Language (Admin Panel)" : "ড্যাশবোর্ডের ভাষা (অ্যাডমিন প্যানেল)"}</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">{lang === "en" ? "The language you see in the admin dashboard" : "অ্যাডমিন ড্যাশবোর্ডে আপনি যে ভাষা দেখবেন"}</p>
            <div className="space-y-2">
              <LangOption value="bn" current={dashboardLang} onChange={setDashboardLang}
                flag="🇧🇩" label="বাংলা (Bengali)" desc={lang === "en" ? "Dashboard, orders, settings in Bengali" : "ড্যাশবোর্ড, অর্ডার, সেটিংস বাংলায়"} />
              <LangOption value="en" current={dashboardLang} onChange={setDashboardLang}
                flag="🇬🇧" label="English" desc={lang === "en" ? "Dashboard, orders, settings in English" : "ড্যাশবোর্ড, অর্ডার, সেটিংস ইংরেজিতে"} />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50">
              <FiSave className="w-4 h-4" />
              {saving ? (lang === "en" ? "Saving..." : "সংরক্ষণ হচ্ছে...") : (lang === "en" ? "Save Language Settings" : "ভাষা সংরক্ষণ করুন")}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
