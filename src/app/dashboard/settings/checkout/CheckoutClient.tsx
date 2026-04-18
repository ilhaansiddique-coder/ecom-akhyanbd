"use client";

import { useState } from "react";
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

export default function CheckoutClient({ initialData }: { initialData?: Record<string, string> }) {
  const { t } = useLang();
  const [form, setForm] = useState<CheckoutSettings>(initialData ? { ...defaults, ...initialData } : defaults);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.updateSettings(form as Record<string, unknown>);
      showToast(t("toast.updated"));
    } catch {
      showToast(t("toast.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof CheckoutSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <DashboardLayout title={t("checkout.customizer")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      {loading ? <FormSkeleton /> : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* Form Title & Subtitle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">{t("checkout.formLayout")}</h3>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("checkout.formTitleLabel")}</label>
                  <input value={form.checkout_title || ""} onChange={set("checkout_title")} className={inputCls} placeholder={t("checkout.formTitlePlaceholder")} />
                </div>
                <div>
                  <label className={labelCls}>{t("checkout.formSubtitle")}</label>
                  <input value={form.checkout_subtitle || ""} onChange={set("checkout_subtitle")} className={inputCls} placeholder={t("checkout.formSubtitlePlaceholder")} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("checkout.submitBtnText")}</label>
                  <input value={form.checkout_btn_text || ""} onChange={set("checkout_btn_text")} className={inputCls} placeholder={t("checkout.submitBtnPlaceholder")} />
                </div>
                <div>
                  <label className={labelCls}>{t("checkout.successMsg")}</label>
                  <input value={form.checkout_success_msg || ""} onChange={set("checkout_success_msg")} className={inputCls} placeholder={t("checkout.successMsgPlaceholder")} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t("checkout.guaranteeText")}</label>
                <input value={form.checkout_guarantee_text || ""} onChange={set("checkout_guarantee_text")} className={inputCls} placeholder={t("checkout.guaranteePlaceholder")} />
              </div>
            </div>
          </div>

          {/* Field Toggles */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">{t("checkout.formFields")}</h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.checkout_show_email === "true"} onChange={(e) => setForm(p => ({ ...p, checkout_show_email: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                {t("checkout.showEmail")}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.checkout_show_zip === "true"} onChange={(e) => setForm(p => ({ ...p, checkout_show_zip: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                {t("checkout.showZip")}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.checkout_show_notes !== "false"} onChange={(e) => setForm(p => ({ ...p, checkout_show_notes: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                {t("checkout.showNotes")}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.checkout_show_coupon !== "false"} onChange={(e) => setForm(p => ({ ...p, checkout_show_coupon: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                {t("checkout.showCoupon")}
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-3">{t("checkout.shippingNote")} <a href="/dashboard/shipping" className="text-[var(--primary)] underline">{t("checkout.shippingPage")}</a></p>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">{t("checkout.paymentMethods")}</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.checkout_payment_cod !== "false"} onChange={(e) => setForm(p => ({ ...p, checkout_payment_cod: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                {t("checkout.cod")}
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.checkout_payment_bkash === "true"} onChange={(e) => setForm(p => ({ ...p, checkout_payment_bkash: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                  {t("checkout.bkash")}
                </label>
                {form.checkout_payment_bkash === "true" && (
                  <div className="ml-6 space-y-2">
                    <input value={form.checkout_bkash_number || ""} onChange={set("checkout_bkash_number")} className={inputCls} placeholder={t("checkout.bkashNum")} />
                    <textarea rows={3} value={form.checkout_bkash_instruction || ""} onChange={set("checkout_bkash_instruction")} className={inputCls + " resize-none"} placeholder={t("checkout.bkashInstructions")} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.checkout_payment_nagad === "true"} onChange={(e) => setForm(p => ({ ...p, checkout_payment_nagad: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                  {t("checkout.nagad")}
                </label>
                {form.checkout_payment_nagad === "true" && (
                  <div className="ml-6 space-y-2">
                    <input value={form.checkout_nagad_number || ""} onChange={set("checkout_nagad_number")} className={inputCls} placeholder={t("checkout.nagadNum")} />
                    <textarea rows={3} value={form.checkout_nagad_instruction || ""} onChange={set("checkout_nagad_instruction")} className={inputCls + " resize-none"} placeholder={t("checkout.nagadInstructions")} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-50">
              <FiSave className="w-4 h-4" />
              {saving ? t("btn.saving") : t("settings.saveBtn")}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
