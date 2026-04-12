"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSave } from "react-icons/fi";
import { FormSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";

interface Settings {
  site_language?: string;
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
  // Checkout
  checkout_title?: string;
  checkout_subtitle?: string;
  checkout_show_email?: string;
  checkout_show_zip?: string;
  checkout_show_notes?: string;
  checkout_btn_text?: string;
  checkout_success_msg?: string;
  checkout_guarantee_text?: string;
  checkout_payment_cod?: string;
  checkout_payment_bkash?: string;
  checkout_payment_nagad?: string;
  checkout_bkash_number?: string;
  checkout_bkash_instruction?: string;
  checkout_nagad_number?: string;
  checkout_nagad_instruction?: string;
  checkout_show_coupon?: string;
  // Courier
  steadfast_api_key?: string;
  steadfast_secret_key?: string;
  steadfast_enabled?: string;
  steadfast_auto_send?: string;
  steadfast_include_notes?: string;
}

const emptySettings: Settings = {
  site_language: "bn",
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
  checkout_title: "",
  checkout_subtitle: "",
  checkout_show_email: "false",
  checkout_show_zip: "false",
  checkout_show_notes: "true",
  checkout_btn_text: "",
  checkout_success_msg: "",
  checkout_guarantee_text: "",
  checkout_payment_cod: "true",
  checkout_payment_bkash: "false",
  checkout_payment_nagad: "false",
  checkout_bkash_number: "",
  checkout_bkash_instruction: "",
  checkout_nagad_number: "",
  checkout_nagad_instruction: "",
  checkout_show_coupon: "true",
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
