"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSave, FiTruck, FiCheckCircle, FiXCircle, FiRefreshCw } from "react-icons/fi";
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
  // Pathao
  pathao_enabled?: string;
  pathao_environment?: string;
  pathao_client_id?: string;
  pathao_client_secret?: string;
  pathao_username?: string;
  pathao_password?: string;
  pathao_store_id?: string;
  pathao_default_city_id?: string;
  pathao_default_zone_id?: string;
  pathao_default_area_id?: string;
  pathao_default_delivery_type?: string;
  pathao_default_item_type?: string;
  pathao_auto_send?: string;
  pathao_include_notes?: string;
}

const defaults: CourierSettings = {
  steadfast_api_key: "",
  steadfast_secret_key: "",
  steadfast_enabled: "true",
  steadfast_auto_send: "false",
  steadfast_include_notes: "true",
  pathao_enabled: "false",
  pathao_environment: "production",
  pathao_client_id: "",
  pathao_client_secret: "",
  pathao_username: "",
  pathao_password: "",
  pathao_store_id: "",
  pathao_default_city_id: "",
  pathao_default_zone_id: "",
  pathao_default_area_id: "",
  pathao_default_delivery_type: "48",
  pathao_default_item_type: "2",
  pathao_auto_send: "false",
  pathao_include_notes: "true",
};

interface PathaoListItem {
  city_id?: number; city_name?: string;
  zone_id?: number; zone_name?: string;
  area_id?: number; area_name?: string;
}
interface PathaoStore { store_id: number; store_name: string; }

export default function CourierClient({ initialData }: { initialData?: Record<string, string> }) {
  const { lang } = useLang();
  const [form, setForm] = useState<CourierSettings>(initialData ? { ...defaults, ...initialData } : defaults);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });
  const [courierTest, setCourierTest] = useState<{ loading: boolean; success?: boolean; balance?: number }>({ loading: false });
  const [pathaoTest, setPathaoTest] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });
  const [stores, setStores] = useState<PathaoStore[]>([]);
  const [cities, setCities] = useState<PathaoListItem[]>([]);
  const [zones, setZones] = useState<PathaoListItem[]>([]);
  const [areas, setAreas] = useState<PathaoListItem[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.updateSettings(form as Record<string, unknown>);
      showToast(lang === "en" ? "Settings saved!" : "সেটিংস সংরক্ষিত হয়েছে!");
    } catch {
      showToast(lang === "en" ? "Save failed" : "সংরক্ষণ করতে সমস্যা", "error");
    } finally { setSaving(false); }
  };

  const testConnection = async () => {
    setCourierTest({ loading: true });
    try {
      await api.admin.updateSettings(form as Record<string, unknown>);
      const res = await fetch("/api/v1/admin/courier?action=test", { credentials: "include", headers: { Accept: "application/json" } }).then(r => r.json());
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

  const testPathao = async () => {
    setPathaoTest({ loading: true });
    try {
      await api.admin.updateSettings(form as Record<string, unknown>);
      const res = await fetch("/api/v1/admin/courier/pathao?action=test", { credentials: "include" }).then(r => r.json());
      if (res.success) {
        setPathaoTest({ loading: false, success: true });
        showToast(lang === "en" ? "Pathao connected!" : "Pathao সংযুক্ত!");
        loadStores(); loadCities();
      } else {
        setPathaoTest({ loading: false, success: false, message: res.message });
        showToast(res.message || "Pathao auth failed", "error");
      }
    } catch {
      setPathaoTest({ loading: false, success: false });
      showToast("Pathao connection failed", "error");
    }
  };

  const loadStores = async () => {
    try {
      const r = await fetch("/api/v1/admin/courier/pathao?action=stores", { credentials: "include" }).then(x => x.json());
      setStores(r.items || []);
    } catch {}
  };
  const loadCities = async () => {
    setGeoLoading(true);
    try {
      const r = await fetch("/api/v1/admin/courier/pathao?action=cities", { credentials: "include" }).then(x => x.json());
      setCities(r.items || []);
    } catch {} finally { setGeoLoading(false); }
  };
  const loadZones = async (cityId: number) => {
    setGeoLoading(true);
    try {
      const r = await fetch(`/api/v1/admin/courier/pathao?action=zones&city_id=${cityId}`, { credentials: "include" }).then(x => x.json());
      setZones(r.items || []);
    } catch {} finally { setGeoLoading(false); }
  };
  const loadAreas = async (zoneId: number) => {
    setGeoLoading(true);
    try {
      const r = await fetch(`/api/v1/admin/courier/pathao?action=areas&zone_id=${zoneId}`, { credentials: "include" }).then(x => x.json());
      setAreas(r.items || []);
    } catch {} finally { setGeoLoading(false); }
  };

  // Auto-load if creds were already saved
  useEffect(() => {
    if (form.pathao_client_id && form.pathao_username) {
      loadStores();
      loadCities();
      if (form.pathao_default_city_id) loadZones(Number(form.pathao_default_city_id));
      if (form.pathao_default_zone_id) loadAreas(Number(form.pathao_default_zone_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key: keyof CourierSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <DashboardLayout title={lang === "en" ? "Courier Settings" : "কুরিয়ার সেটিংস"}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      {loading ? <FormSkeleton /> : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* ── STEADFAST ── */}
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
                {lang === "en" ? "Get API keys from" : "API কী পেতে"} <a href="https://portal.packzy.com" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] underline">Steadfast Portal</a>
              </p>
            </div>
          </div>

          {/* ── PATHAO ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiTruck className="w-5 h-5 text-[var(--primary)]" />
              <h3 className="text-sm font-bold text-gray-700">Pathao Courier (Aladdin) API</h3>
            </div>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Environment</label>
                  <select value={form.pathao_environment || "production"} onChange={set("pathao_environment")} className={inputCls}>
                    <option value="production">Production</option>
                    <option value="sandbox">Sandbox</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Client ID</label>
                  <input type="text" value={form.pathao_client_id || ""} onChange={set("pathao_client_id")} className={inputCls} placeholder="OAuth client_id" />
                </div>
                <div>
                  <label className={labelCls}>Client Secret</label>
                  <input type="password" value={form.pathao_client_secret || ""} onChange={set("pathao_client_secret")} className={inputCls} placeholder="OAuth client_secret" />
                </div>
                <div>
                  <label className={labelCls}>Merchant Email</label>
                  <input type="email" value={form.pathao_username || ""} onChange={set("pathao_username")} className={inputCls} placeholder="merchant@example.com" />
                </div>
                <div>
                  <label className={labelCls}>Merchant Password</label>
                  <input type="password" value={form.pathao_password || ""} onChange={set("pathao_password")} className={inputCls} placeholder="Pathao login password" />
                </div>
                <div>
                  <label className={labelCls}>Store</label>
                  <div className="flex gap-2">
                    <select value={form.pathao_store_id || ""} onChange={set("pathao_store_id")} className={inputCls}>
                      <option value="">{stores.length ? "Select store" : "(test connection to load)"}</option>
                      {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
                    </select>
                    <button type="button" onClick={loadStores} className="px-2 border border-gray-200 rounded-xl text-gray-500 hover:text-[var(--primary)]" title="Refresh">
                      <FiRefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Default City</label>
                  <select value={form.pathao_default_city_id || ""} onChange={(e) => {
                    setForm(p => ({ ...p, pathao_default_city_id: e.target.value, pathao_default_zone_id: "", pathao_default_area_id: "" }));
                    setZones([]); setAreas([]);
                    if (e.target.value) loadZones(Number(e.target.value));
                  }} className={inputCls} disabled={geoLoading}>
                    <option value="">{cities.length ? "Select city" : "(test connection)"}</option>
                    {cities.map(c => <option key={c.city_id} value={c.city_id}>{c.city_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Default Zone</label>
                  <select value={form.pathao_default_zone_id || ""} onChange={(e) => {
                    setForm(p => ({ ...p, pathao_default_zone_id: e.target.value, pathao_default_area_id: "" }));
                    setAreas([]);
                    if (e.target.value) loadAreas(Number(e.target.value));
                  }} className={inputCls} disabled={geoLoading || !zones.length}>
                    <option value="">{zones.length ? "Select zone" : "(pick city first)"}</option>
                    {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Default Area (optional)</label>
                  <select value={form.pathao_default_area_id || ""} onChange={set("pathao_default_area_id")} className={inputCls} disabled={geoLoading || !areas.length}>
                    <option value="">{areas.length ? "Select area" : "(pick zone first)"}</option>
                    {areas.map(a => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Delivery Type</label>
                  <select value={form.pathao_default_delivery_type || "48"} onChange={set("pathao_default_delivery_type")} className={inputCls}>
                    <option value="48">Normal (48h)</option>
                    <option value="12">On-Demand (12h)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Item Type</label>
                  <select value={form.pathao_default_item_type || "2"} onChange={set("pathao_default_item_type")} className={inputCls}>
                    <option value="2">Parcel</option>
                    <option value="1">Document</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.pathao_enabled === "true"} onChange={(e) => setForm(p => ({ ...p, pathao_enabled: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                  {lang === "en" ? "Pathao Active" : "Pathao সক্রিয়"}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.pathao_auto_send === "true"} onChange={(e) => setForm(p => ({ ...p, pathao_auto_send: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                  {lang === "en" ? "Auto-send Orders" : "অর্ডার অটো-সেন্ড"}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.pathao_include_notes === "true"} onChange={(e) => setForm(p => ({ ...p, pathao_include_notes: e.target.checked ? "true" : "false" }))} className="w-4 h-4 accent-[var(--primary)]" />
                  {lang === "en" ? "Include Order Notes" : "অর্ডার নোট অন্তর্ভুক্ত"}
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={testPathao} disabled={pathaoTest.loading || !form.pathao_client_id || !form.pathao_password}
                  className="flex items-center gap-2 px-4 py-2 border border-[var(--primary)] text-[var(--primary)] rounded-xl text-sm font-medium hover:bg-[var(--primary)] hover:text-white transition-colors disabled:opacity-50">
                  <FiTruck className="w-4 h-4" />
                  {pathaoTest.loading ? "Checking..." : "Test Connection"}
                </button>
                {pathaoTest.success === true && (
                  <span className="flex items-center gap-1 text-sm text-green-600"><FiCheckCircle className="w-4 h-4" /> Connected</span>
                )}
                {pathaoTest.success === false && (
                  <span className="flex items-center gap-1 text-sm text-red-500"><FiXCircle className="w-4 h-4" /> {pathaoTest.message || "Failed"}</span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Get API credentials from <a href="https://merchant.pathao.com" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] underline">Pathao Merchant Portal</a> → Profile → API Credentials.
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
