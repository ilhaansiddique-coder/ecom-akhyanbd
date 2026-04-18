"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSave, FiTruck, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { FormSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/LanguageContext";

const inputCls = theme.input;
const labelCls = theme.label;

interface CourierSettings {
  steadfast_api_key?: string;
  steadfast_secret_key?: string;
  steadfast_enabled?: string;
  steadfast_auto_send?: string;
  steadfast_include_notes?: string;
}

const defaults: CourierSettings = {
  steadfast_api_key: "",
  steadfast_secret_key: "",
  steadfast_enabled: "true",
  steadfast_auto_send: "false",
  steadfast_include_notes: "true",
};

export default function CourierClient({ initialData }: { initialData?: Record<string, string> }) {
  const { lang } = useLang();
  const [form, setForm] = useState<CourierSettings>(initialData ? { ...defaults, ...initialData } : defaults);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });
  const [courierTest, setCourierTest] = useState<{ loading: boolean; success?: boolean; balance?: number }>({ loading: false });

  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });


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

  const testConnection = async () => {
    setCourierTest({ loading: true });
    try {
      await api.admin.updateSettings(form as Record<string, unknown>);
      const res = await fetch("/api/v1/admin/courier?action=test", {
        credentials: "include",
        headers: { Accept: "application/json" },
      }).then(r => r.json());
      if (res.success) {
        setCourierTest({ loading: false, success: true, balance: res.balance });
        showToast(lang === "en" ? "Connection successful!" : "কুরিয়ার সংযোগ সফল!");
      } else {
        setCourierTest({ loading: false, success: false });
        showToast(res.message || (lang === "en" ? "Connection failed" : "কুরিয়ার সংযোগ ব্যর্থ"), "error");
      }
    } catch {
      setCourierTest({ loading: false, success: false });
      showToast(lang === "en" ? "Connection failed" : "সংযোগ ব্যর্থ", "error");
    }
  };

  const set = (key: keyof CourierSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <DashboardLayout title={lang === "en" ? "Courier Settings (Steadfast)" : "কুরিয়ার সেটিংস (Steadfast)"}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      {loading ? <FormSkeleton /> : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiTruck className="w-5 h-5 text-[var(--primary)]" />
              <h3 className="text-sm font-bold text-gray-700">Steadfast Courier API</h3>
            </div>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>API Key</label>
                  <input type="password" value={form.steadfast_api_key || ""} onChange={set("steadfast_api_key")} className={inputCls} placeholder="Enter Steadfast API Key" />
                </div>
                <div>
                  <label className={labelCls}>Secret Key</label>
                  <input type="password" value={form.steadfast_secret_key || ""} onChange={set("steadfast_secret_key")} className={inputCls} placeholder="Enter Steadfast Secret Key" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.steadfast_enabled === "true"} onChange={(e) => setForm(p => ({ ...p, steadfast_enabled: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                  {lang === "en" ? "Courier Active" : "কুরিয়ার সক্রিয়"}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.steadfast_auto_send === "true"} onChange={(e) => setForm(p => ({ ...p, steadfast_auto_send: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                  {lang === "en" ? "Auto-send Orders" : "অর্ডার অটো-সেন্ড"}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.steadfast_include_notes === "true"} onChange={(e) => setForm(p => ({ ...p, steadfast_include_notes: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                  {lang === "en" ? "Include Order Notes" : "অর্ডার নোট অন্তর্ভুক্ত"}
                </label>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={testConnection} disabled={courierTest.loading || !form.steadfast_api_key || !form.steadfast_secret_key}
                  className="flex items-center gap-2 px-4 py-2 border border-[var(--primary)] text-[var(--primary)] rounded-xl text-sm font-medium hover:bg-[var(--primary)] hover:text-white transition-colors disabled:opacity-50">
                  <FiTruck className="w-4 h-4" />
                  {courierTest.loading ? (lang === "en" ? "Checking..." : "চেক হচ্ছে...") : "Test Connection"}
                </button>
                {courierTest.success === true && (
                  <span className="flex items-center gap-1 text-sm text-green-600"><FiCheckCircle className="w-4 h-4" /> {lang === "en" ? "Connected" : "সংযুক্ত"} {courierTest.balance !== undefined && `• ৳${courierTest.balance}`}</span>
                )}
                {courierTest.success === false && (
                  <span className="flex items-center gap-1 text-sm text-red-500"><FiXCircle className="w-4 h-4" /> {lang === "en" ? "Failed" : "ব্যর্থ"}</span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {lang === "en" ? "Get API keys from" : "API কী পেতে"} <a href="https://portal.packzy.com" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] underline">Steadfast Portal</a> {lang === "en" ? "" : "এ যান।"}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-50">
              <FiSave className="w-4 h-4" />
              {saving ? (lang === "en" ? "Saving..." : "সংরক্ষণ হচ্ছে...") : (lang === "en" ? "Save Settings" : "সেটিংস সংরক্ষণ করুন")}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
