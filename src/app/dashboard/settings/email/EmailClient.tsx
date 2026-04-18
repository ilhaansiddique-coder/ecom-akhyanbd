"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSave, FiMail, FiCheckCircle, FiXCircle, FiSend } from "react-icons/fi";
import { FormSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/LanguageContext";

const inputCls = theme.input;
const labelCls = theme.label;

interface EmailSettings {
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from?: string;
  smtp_admin_email?: string;
}

const defaults: EmailSettings = {
  smtp_host: "smtp.gmail.com",
  smtp_port: "587",
  smtp_user: "",
  smtp_pass: "",
  smtp_from: "",
  smtp_admin_email: "",
};

export default function EmailClient({ initialData }: { initialData?: Record<string, string> }) {
  const { lang } = useLang();
  const [form, setForm] = useState<EmailSettings>(initialData ? { ...defaults, ...initialData } : defaults);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.updateSettings(form as Record<string, unknown>);
      showToast(lang === "en" ? "Email settings saved!" : "ইমেইল সেটিংস সংরক্ষিত হয়েছে!");
    } catch {
      showToast(lang === "en" ? "Save failed" : "সংরক্ষণ করতে সমস্যা", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/v1/admin/email-test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          host: form.smtp_host,
          port: Number(form.smtp_port),
          user: form.smtp_user,
          pass: form.smtp_pass,
          from: form.smtp_from || form.smtp_user,
        }),
      }).then(r => r.json());

      setTestResult(res);
      if (res.success) {
        showToast(lang === "en" ? "SMTP connection successful!" : "SMTP সংযোগ সফল!");
      } else {
        showToast(res.error || (lang === "en" ? "Connection failed" : "সংযোগ ব্যর্থ"), "error");
      }
    } catch {
      setTestResult({ success: false, error: "Connection failed" });
      showToast(lang === "en" ? "Connection failed" : "সংযোগ ব্যর্থ", "error");
    } finally {
      setTesting(false);
    }
  };

  const set = (key: keyof EmailSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <DashboardLayout title={lang === "en" ? "Email Settings" : "ইমেইল সেটিংস"}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      {loading ? <FormSkeleton /> : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* SMTP Configuration */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiMail className="w-5 h-5 text-[var(--primary)]" />
              <h3 className="text-sm font-bold text-gray-700">{lang === "en" ? "SMTP Mail Server" : "SMTP মেইল সার্ভার"}</h3>
              {testResult && (
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${testResult.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {testResult.success ? <><FiCheckCircle className="w-3 h-3" /> Connected</> : <><FiXCircle className="w-3 h-3" /> Failed</>}
                </span>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{lang === "en" ? "SMTP Host" : "SMTP হোস্ট"}</label>
                  <input value={form.smtp_host || ""} onChange={set("smtp_host")} className={inputCls} placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <label className={labelCls}>{lang === "en" ? "SMTP Port" : "SMTP পোর্ট"}</label>
                  <input type="number" value={form.smtp_port || ""} onChange={set("smtp_port")} className={inputCls} placeholder="587" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{lang === "en" ? "Username / Email" : "ইউজারনেম / ইমেইল"}</label>
                  <input value={form.smtp_user || ""} onChange={set("smtp_user")} className={inputCls} placeholder="your@gmail.com" />
                </div>
                <div>
                  <label className={labelCls}>{lang === "en" ? "Password / App Password" : "পাসওয়ার্ড / অ্যাপ পাসওয়ার্ড"}</label>
                  <input type="password" value={form.smtp_pass || ""} onChange={set("smtp_pass")} className={inputCls} placeholder="••••••••••••" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{lang === "en" ? "From Email Address" : "প্রেরকের ইমেইল"}</label>
                <input value={form.smtp_from || ""} onChange={set("smtp_from")} className={inputCls} placeholder="info@example.com" />
                <p className="text-[10px] text-gray-400 mt-1">{lang === "en" ? "The email address that appears in the 'From' field" : "ইমেইলে 'From' হিসেবে যে ঠিকানা দেখাবে"}</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={handleTest} disabled={testing || !form.smtp_user || !form.smtp_pass}
                  className="flex items-center gap-2 px-4 py-2 border border-[var(--primary)] text-[var(--primary)] rounded-xl text-sm font-medium hover:bg-[var(--primary)] hover:text-white transition-colors disabled:opacity-50">
                  <FiSend className="w-4 h-4" />
                  {testing ? (lang === "en" ? "Testing..." : "টেস্ট হচ্ছে...") : (lang === "en" ? "Test Connection" : "সংযোগ টেস্ট")}
                </button>
              </div>

              {testResult && !testResult.success && testResult.error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs">{testResult.error}</div>
              )}

              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-700 font-medium mb-1">💡 {lang === "en" ? "Gmail Setup" : "জিমেইল সেটআপ"}:</p>
                <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                  <li>Host: smtp.gmail.com, Port: 587</li>
                  <li>{lang === "en" ? "Enable 2-Step Verification on your Google Account" : "আপনার Google অ্যাকাউন্টে 2-Step Verification চালু করুন"}</li>
                  <li>{lang === "en" ? "Create an App Password at" : "App Password তৈরি করুন"}: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">myaccount.google.com/apppasswords</a></li>
                  <li>{lang === "en" ? "Use the generated 16-character password above" : "তৈরি হওয়া 16-character পাসওয়ার্ড উপরে ব্যবহার করুন"}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Admin Notification */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">{lang === "en" ? "Admin Notification" : "অ্যাডমিন নোটিফিকেশন"}</h3>
            <div>
              <label className={labelCls}>{lang === "en" ? "Admin Email (Order Notifications)" : "অ্যাডমিন ইমেইল (অর্ডার নোটিফিকেশন)"}</label>
              <input value={form.smtp_admin_email || ""} onChange={set("smtp_admin_email")} className={inputCls} placeholder="admin@example.com" />
              <p className="text-[10px] text-gray-400 mt-1">{lang === "en" ? "New order notifications will be sent to this email. Leave empty to use the From address." : "নতুন অর্ডারের নোটিফিকেশন এই ইমেইলে পাঠানো হবে। খালি রাখলে From ঠিকানায় যাবে।"}</p>
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
