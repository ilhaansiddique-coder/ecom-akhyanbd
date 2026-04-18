"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSave, FiImage } from "react-icons/fi";
import { FormSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/LanguageContext";
import MediaGallery from "@/components/MediaGallery";

interface Settings {
  site_language?: string;
  site_name?: string;
  site_logo?: string;
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
  // Maps
  map_embed?: string;
  // Facebook Pixel / CAPI
  fb_pixel_id?: string;
  fb_capi_access_token?: string;
  fb_test_event_code?: string;
  fb_domain_verification?: string;
  fb_deferred_purchase?: string;
  gtm_id?: string;
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
  site_logo: "",
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

export default function SettingsClient({ initialData }: { initialData?: Settings }) {
  const { t } = useLang();
  const [form, setForm] = useState<Settings>(initialData ? { ...emptySettings, ...initialData } : emptySettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchSettings = useCallback((background = false) => {
    if (!background) setLoading(true);
    api.admin.getSettings()
      .then((res) => {
        const data = res.data || res || {};
        setForm({ ...emptySettings, ...data });
      })
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));


  const inputCls = theme.input;
  const labelCls = theme.label;

  return (
    <DashboardLayout title={t("dash.siteSettings")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />

      {loading ? (
        <FormSkeleton />
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* General Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">{t("settings.generalInfo")}</h3>

              {/* Site Logo — used globally on header, footer, dashboard */}
              <div className="mb-5">
                <label className={labelCls}>{t("settings.siteLogo") || "Site Logo"}</label>
                <div className="flex items-center gap-4 mt-2">
                  {form.site_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.site_logo} alt="Site logo" className="w-20 h-20 object-contain rounded-xl border border-gray-100 bg-gray-50 p-2" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs text-center">No logo</div>
                  )}
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => setLogoPickerOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
                      <FiImage className="w-4 h-4" /> {t("settings.uploadLogo") || "Choose from Gallery"}
                    </button>
                    {form.site_logo && (
                      <button type="button" onClick={() => setForm((prev) => ({ ...prev, site_logo: "" }))} className="text-xs text-red-400 hover:text-red-600 text-left px-1">{t("btn.remove") || "Remove"}</button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Used in header, footer, and admin sidebar. Falls back to /logo.svg if empty.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("settings.siteName")}</label>
                  <input value={form.site_name || ""} onChange={set("site_name")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("form.phone")}</label>
                  <input value={form.phone || ""} onChange={set("phone")} className={inputCls} placeholder="+880..." />
                </div>
                <div>
                  <label className={labelCls}>{t("form.email")}</label>
                  <input type="email" value={form.email || ""} onChange={set("email")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("settings.whatsapp")}</label>
                  <input value={form.whatsapp || ""} onChange={set("whatsapp")} className={inputCls} placeholder="+880..." />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{t("form.address")}</label>
                  <input value={form.address || ""} onChange={set("address")} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{t("settings.mapEmbed")}</label>
                  <input value={form.map_embed || ""} onChange={set("map_embed")} className={inputCls} placeholder="https://www.google.com/maps/embed?pb=..." />
                  <p className="text-xs text-gray-400 mt-1">{t("settings.mapEmbedHelp")}</p>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">{t("settings.socialMedia")}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("settings.facebook")}</label>
                  <input value={form.facebook || ""} onChange={set("facebook")} className={inputCls} placeholder="https://facebook.com/..." />
                </div>
                <div>
                  <label className={labelCls}>{t("settings.instagram")}</label>
                  <input value={form.instagram || ""} onChange={set("instagram")} className={inputCls} placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <label className={labelCls}>{t("settings.youtube")}</label>
                  <input value={form.youtube || ""} onChange={set("youtube")} className={inputCls} placeholder="https://youtube.com/..." />
                </div>
              </div>
            </div>

            {/* Header & Footer */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">{t("settings.headerFooter")}</h3>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>{t("settings.headerText1")}</label>
                  <input value={form.header_text_1 || ""} onChange={set("header_text_1")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("settings.headerText2")}</label>
                  <input value={form.header_text_2 || ""} onChange={set("header_text_2")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("settings.footerDesc")}</label>
                  <textarea rows={3} value={form.footer_description || ""} onChange={set("footer_description")} className={inputCls + " resize-none"} />
                </div>
                <div>
                  <label className={labelCls}>{t("settings.copyright")}</label>
                  <input value={form.copyright_text || ""} onChange={set("copyright_text")} className={inputCls} />
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">SEO</h3>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>{t("settings.metaTitle")}</label>
                  <input value={form.meta_title || ""} onChange={set("meta_title")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("settings.metaDesc")}</label>
                  <textarea rows={3} value={form.meta_description || ""} onChange={set("meta_description")} className={inputCls + " resize-none"} />
                </div>
              </div>
            </div>


            {/* Tracking (Facebook Pixel) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">{t("settings.tracking")}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("settings.fbPixelId")}</label>
                  <input value={form.fb_pixel_id || ""} onChange={set("fb_pixel_id")} className={inputCls} placeholder="123456789012345" />
                </div>
                <div>
                  <label className={labelCls}>{t("settings.fbCapiToken")}</label>
                  <input type="password" value={form.fb_capi_access_token || ""} onChange={set("fb_capi_access_token")} className={inputCls} placeholder="EAABsbCS..." />
                </div>
                <div>
                  <label className={labelCls}>{t("settings.fbTestCode")}</label>
                  <input value={form.fb_test_event_code || ""} onChange={set("fb_test_event_code")} className={inputCls} placeholder="TEST12345" />
                </div>
                <div>
                  <label className={labelCls}>{t("settings.fbDomainVerification")}</label>
                  <input value={form.fb_domain_verification || ""} onChange={set("fb_domain_verification")} className={inputCls} placeholder="abcdef1234567890..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.fb_deferred_purchase === "true"}
                      onChange={(e) => setForm((prev: any) => ({ ...prev, fb_deferred_purchase: e.target.checked ? "true" : "false" }))}
                      className="w-5 h-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-700">{t("settings.deferredPurchase")}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{t("settings.deferredPurchaseDesc")}</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Google Tag Manager */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-1">{t("settings.gtmSection")}</h3>
              <p className="text-xs text-gray-400 mb-4">{t("settings.gtmSectionDesc")}</p>
              <div className="max-w-sm">
                <label className={labelCls}>{t("settings.gtmId")}</label>
                <input value={form.gtm_id || ""} onChange={set("gtm_id")} className={inputCls} placeholder="GTM-XXXXXXX" />
                <p className="text-xs text-gray-400 mt-1.5">{t("settings.gtmIdHint")}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-50"
              >
                <FiSave className="w-4 h-4" />
                {saving ? t("btn.saving") : t("settings.saveBtn")}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <MediaGallery
        open={logoPickerOpen}
        onClose={() => setLogoPickerOpen(false)}
        onSelect={(url) => { setForm((prev) => ({ ...prev, site_logo: url })); setLogoPickerOpen(false); }}
      />
    </DashboardLayout>
  );
}
