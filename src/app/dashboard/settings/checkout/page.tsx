"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSave } from "react-icons/fi";
import { FormSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/LanguageContext";

const inputCls = theme.input;
const labelCls = theme.label;

interface CheckoutSettings {
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
}

const defaults: CheckoutSettings = {
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
};

export default function CheckoutSettingsPage() {
  const { t, lang } = useLang();
  const [form, setForm] = useState<CheckoutSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  useEffect(() => {
    api.admin.getSettings()
      .then((res) => {
        const data = res.data || res || {};
        setForm({ ...defaults, ...data });
      })
      .catch(() => showToast(lang === "en" ? "Failed to load" : "লোড করতে সমস্যা", "error"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.updateSettings(form as Record<string, unknown>);
      showToast(lang === "en" ? "Settings saved!" : "সেটিংস সংরক্ষিত হয়েছে!");
    } catch {
      showToast(lang === "en" ? "Save failed" : "সংরক্ষণ করতে সমস্যা", "error");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof CheckoutSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <DashboardLayout title={lang === "en" ? "Checkout Form Customizer" : "চেকআউট ফর্ম কাস্টমাইজার"}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      {loading ? <FormSkeleton /> : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* Form Title & Subtitle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">{lang === "en" ? "Form Layout" : "ফর্ম লেআউট"}</h3>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{lang === "en" ? "Form Title" : "ফর্ম শিরোনাম"}</label>
                  <input value={form.checkout_title || ""} onChange={set("checkout_title")} className={inputCls} placeholder="🛒 আপনার অর্ডার দিন" />
                </div>
                <div>
                  <label className={labelCls}>{lang === "en" ? "Form Subtitle" : "ফর্ম সাবটাইটেল"}</label>
                  <input value={form.checkout_subtitle || ""} onChange={set("checkout_subtitle")} className={inputCls} placeholder="নিচের ফরমটি পূরণ করে অর্ডারটি কনফার্ম করুন।" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{lang === "en" ? "Submit Button Text" : "সাবমিট বাটন টেক্সট"}</label>
                  <input value={form.checkout_btn_text || ""} onChange={set("checkout_btn_text")} className={inputCls} placeholder="✅ অর্ডার কনফার্ম করুন" />
                </div>
                <div>
                  <label className={labelCls}>{lang === "en" ? "Success Message" : "সাফল্য বার্তা"}</label>
                  <input value={form.checkout_success_msg || ""} onChange={set("checkout_success_msg")} className={inputCls} placeholder="আপনার অর্ডার গ্রহণ করা হয়েছে।" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{lang === "en" ? "Guarantee / Trust Text" : "গ্যারান্টি টেক্সট"}</label>
                <input value={form.checkout_guarantee_text || ""} onChange={set("checkout_guarantee_text")} className={inputCls} placeholder="🔒 নিরাপদ অর্ডার • 🚚 দ্রুত ডেলিভারি" />
              </div>
            </div>
          </div>

          {/* Field Toggles */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">{lang === "en" ? "Form Fields" : "ফর্ম ফিল্ড"}</h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.checkout_show_email === "true"} onChange={(e) => setForm(p => ({ ...p, checkout_show_email: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[#0f5931]" />
                {lang === "en" ? "Show Email" : "ইমেইল দেখান"}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.checkout_show_zip === "true"} onChange={(e) => setForm(p => ({ ...p, checkout_show_zip: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[#0f5931]" />
                {lang === "en" ? "Show Zip Code" : "জিপ কোড দেখান"}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.checkout_show_notes !== "false"} onChange={(e) => setForm(p => ({ ...p, checkout_show_notes: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[#0f5931]" />
                {lang === "en" ? "Show Notes" : "নোট দেখান"}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.checkout_show_coupon !== "false"} onChange={(e) => setForm(p => ({ ...p, checkout_show_coupon: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[#0f5931]" />
                {lang === "en" ? "Show Coupon" : "কুপন দেখান"}
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-3">{lang === "en" ? "Shipping zones are managed from the" : "শিপিং জোন পরিচালনা করুন"} <a href="/dashboard/shipping" className="text-[#0f5931] underline">{lang === "en" ? "Shipping page" : "শিপিং পেজ"}</a></p>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">{lang === "en" ? "Payment Methods" : "পেমেন্ট মেথড"}</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.checkout_payment_cod !== "false"} onChange={(e) => setForm(p => ({ ...p, checkout_payment_cod: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[#0f5931]" />
                💵 {lang === "en" ? "Cash on Delivery (COD)" : "ক্যাশ অন ডেলিভারি (COD)"}
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.checkout_payment_bkash === "true"} onChange={(e) => setForm(p => ({ ...p, checkout_payment_bkash: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[#0f5931]" />
                  📱 {lang === "en" ? "bKash" : "বিকাশ (bKash)"}
                </label>
                {form.checkout_payment_bkash === "true" && (
                  <div className="ml-6 space-y-2">
                    <input value={form.checkout_bkash_number || ""} onChange={set("checkout_bkash_number")} className={inputCls} placeholder={lang === "en" ? "bKash Number" : "বিকাশ নম্বর (01XXXXXXXXX)"} />
                    <textarea rows={3} value={form.checkout_bkash_instruction || ""} onChange={set("checkout_bkash_instruction")} className={inputCls + " resize-none"} placeholder={lang === "en" ? "Payment instructions for bKash..." : "বিকাশে পেমেন্ট করার নির্দেশনা..."} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.checkout_payment_nagad === "true"} onChange={(e) => setForm(p => ({ ...p, checkout_payment_nagad: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[#0f5931]" />
                  📲 {lang === "en" ? "Nagad" : "নগদ (Nagad)"}
                </label>
                {form.checkout_payment_nagad === "true" && (
                  <div className="ml-6 space-y-2">
                    <input value={form.checkout_nagad_number || ""} onChange={set("checkout_nagad_number")} className={inputCls} placeholder={lang === "en" ? "Nagad Number" : "নগদ নম্বর (01XXXXXXXXX)"} />
                    <textarea rows={3} value={form.checkout_nagad_instruction || ""} onChange={set("checkout_nagad_instruction")} className={inputCls + " resize-none"} placeholder={lang === "en" ? "Payment instructions for Nagad..." : "নগদে পেমেন্ট করার নির্দেশনা..."} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50">
              <FiSave className="w-4 h-4" />
              {saving ? (lang === "en" ? "Saving..." : "সংরক্ষণ হচ্ছে...") : (lang === "en" ? "Save Settings" : "সেটিংস সংরক্ষণ করুন")}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
