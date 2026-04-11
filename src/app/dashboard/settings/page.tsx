"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSave, FiTruck, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { FormSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";

interface Settings {
  site_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  whatsapp?: string;
  header_text_1?: string;
  header_text_2?: string;
  footer_description?: string;
  copyright_text?: string;
  meta_title?: string;
  meta_description?: string;
  // Courier
  steadfast_api_key?: string;
  steadfast_secret_key?: string;
  steadfast_enabled?: string;
  steadfast_auto_send?: string;
  steadfast_include_notes?: string;
}

const emptySettings: Settings = {
  site_name: "",
  phone: "",
  email: "",
  address: "",
  facebook: "",
  instagram: "",
  youtube: "",
  whatsapp: "",
  header_text_1: "",
  header_text_2: "",
  footer_description: "",
  copyright_text: "",
  meta_title: "",
  meta_description: "",
  steadfast_api_key: "",
  steadfast_secret_key: "",
  steadfast_enabled: "true",
  steadfast_auto_send: "false",
  steadfast_include_notes: "true",
};

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });
  const [courierTest, setCourierTest] = useState<{ loading: boolean; success?: boolean; balance?: number }>({ loading: false });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchSettings = useCallback((background = false) => {
    if (!background) setLoading(true);
    api.admin.getSettings()
      .then((res) => {
        const data = res.data || res || {};
        setForm({ ...emptySettings, ...data });
      })
      .catch(() => { if (!background) showToast("সেটিংস লোড করতে সমস্যা হয়েছে", "error"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.updateSettings(form as Record<string, unknown>);
      showToast("সেটিংস সংরক্ষিত হয়েছে!");
    } catch {
      showToast("সংরক্ষণ করতে সমস্যা হয়েছে", "error");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const testCourierConnection = async () => {
    setCourierTest({ loading: true });
    try {
      // Save keys first, then test
      await api.admin.updateSettings({
        steadfast_api_key: form.steadfast_api_key,
        steadfast_secret_key: form.steadfast_secret_key,
        steadfast_enabled: form.steadfast_enabled,
        steadfast_auto_send: form.steadfast_auto_send,
        steadfast_include_notes: form.steadfast_include_notes,
      });
      // Use test action which clears key cache first
      const res = await fetch("/api/v1/admin/courier?action=test", {
        credentials: "include",
        headers: { Accept: "application/json" },
      }).then(r => r.json());
      if (res.success) {
        setCourierTest({ loading: false, success: true, balance: res.balance });
        showToast("কুরিয়ার সংযোগ সফল!");
      } else {
        setCourierTest({ loading: false, success: false });
        showToast(res.message || "কুরিয়ার সংযোগ ব্যর্থ — API কী চেক করুন", "error");
      }
    } catch {
      setCourierTest({ loading: false, success: false });
      showToast("কুরিয়ার সংযোগ ব্যর্থ", "error");
    }
  };

  const inputCls = theme.input;
  const labelCls = theme.label;

  return (
    <DashboardLayout title="সাইট সেটিংস">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />

      {loading ? (
        <FormSkeleton />
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* সাধারণ তথ্য */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">সাধারণ তথ্য</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>সাইটের নাম</label>
                  <input value={form.site_name || ""} onChange={set("site_name")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>ফোন</label>
                  <input value={form.phone || ""} onChange={set("phone")} className={inputCls} placeholder="+880..." />
                </div>
                <div>
                  <label className={labelCls}>ইমেইল</label>
                  <input type="email" value={form.email || ""} onChange={set("email")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>হোয়াটসঅ্যাপ</label>
                  <input value={form.whatsapp || ""} onChange={set("whatsapp")} className={inputCls} placeholder="+880..." />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>ঠিকানা</label>
                  <input value={form.address || ""} onChange={set("address")} className={inputCls} />
                </div>
              </div>
            </div>

            {/* সোশ্যাল মিডিয়া */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">সোশ্যাল মিডিয়া</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>ফেসবুক</label>
                  <input value={form.facebook || ""} onChange={set("facebook")} className={inputCls} placeholder="https://facebook.com/..." />
                </div>
                <div>
                  <label className={labelCls}>ইনস্টাগ্রাম</label>
                  <input value={form.instagram || ""} onChange={set("instagram")} className={inputCls} placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <label className={labelCls}>ইউটিউব</label>
                  <input value={form.youtube || ""} onChange={set("youtube")} className={inputCls} placeholder="https://youtube.com/..." />
                </div>
              </div>
            </div>

            {/* হেডার ও ফুটার */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">হেডার ও ফুটার</h3>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>হেডার টেক্সট ১</label>
                  <input value={form.header_text_1 || ""} onChange={set("header_text_1")} className={inputCls} placeholder="বিশেষ অফার..." />
                </div>
                <div>
                  <label className={labelCls}>হেডার টেক্সট ২</label>
                  <input value={form.header_text_2 || ""} onChange={set("header_text_2")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>ফুটার বিবরণ</label>
                  <textarea rows={3} value={form.footer_description || ""} onChange={set("footer_description")} className={inputCls + " resize-none"} />
                </div>
                <div>
                  <label className={labelCls}>কপিরাইট টেক্সট</label>
                  <input value={form.copyright_text || ""} onChange={set("copyright_text")} className={inputCls} placeholder="© ২০২৫ সকল অধিকার সংরক্ষিত" />
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">SEO</h3>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>মেটা টাইটেল</label>
                  <input value={form.meta_title || ""} onChange={set("meta_title")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>মেটা ডেসক্রিপশন</label>
                  <textarea rows={3} value={form.meta_description || ""} onChange={set("meta_description")} className={inputCls + " resize-none"} />
                </div>
              </div>
            </div>

            {/* কুরিয়ার সেটিংস (Steadfast) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <FiTruck className="w-5 h-5 text-[#0f5931]" />
                <h3 className="text-sm font-bold text-gray-700">কুরিয়ার সেটিংস (Steadfast)</h3>
                {courierTest.success !== undefined && (
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${courierTest.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {courierTest.success ? <><FiCheckCircle className="w-3 h-3" /> Connected</> : <><FiXCircle className="w-3 h-3" /> Failed</>}
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>API Key</label>
                    <input value={form.steadfast_api_key || ""} onChange={set("steadfast_api_key")} className={inputCls} placeholder="Enter Steadfast API Key" />
                  </div>
                  <div>
                    <label className={labelCls}>Secret Key</label>
                    <input type="password" value={form.steadfast_secret_key || ""} onChange={set("steadfast_secret_key")} className={inputCls} placeholder="Enter Steadfast Secret Key" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.steadfast_enabled === "true"} onChange={(e) => setForm((prev) => ({ ...prev, steadfast_enabled: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[#0f5931]" />
                    কুরিয়ার সক্রিয়
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.steadfast_auto_send === "true"} onChange={(e) => setForm((prev) => ({ ...prev, steadfast_auto_send: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[#0f5931]" />
                    অর্ডার অটো-সেন্ড
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.steadfast_include_notes === "true"} onChange={(e) => setForm((prev) => ({ ...prev, steadfast_include_notes: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[#0f5931]" />
                    অর্ডার নোট অন্তর্ভুক্ত
                  </label>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={testCourierConnection}
                    disabled={courierTest.loading || !form.steadfast_api_key || !form.steadfast_secret_key}
                    className="flex items-center gap-2 px-4 py-2 border border-[#0f5931] text-[#0f5931] rounded-xl text-sm font-medium hover:bg-[#0f5931] hover:text-white transition-colors disabled:opacity-50"
                  >
                    <FiTruck className="w-4 h-4" />
                    {courierTest.loading ? "চেক হচ্ছে..." : "Test Connection"}
                  </button>
                  {courierTest.success && courierTest.balance !== undefined && (
                    <span className="text-sm text-[#0f5931] font-semibold">ব্যালেন্স: ৳{courierTest.balance}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  API কী পেতে <a href="https://portal.packzy.com" target="_blank" rel="noopener noreferrer" className="text-[#0f5931] underline">Steadfast Portal</a> এ যান।
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50"
              >
                <FiSave className="w-4 h-4" />
                {saving ? "সংরক্ষণ হচ্ছে..." : "সেটিংস সংরক্ষণ করুন"}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </DashboardLayout>
  );
}
