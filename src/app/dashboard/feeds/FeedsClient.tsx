"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LanguageContext";
import {
  FiRss, FiCopy, FiCheck, FiExternalLink, FiSettings, FiPackage, FiRefreshCw,
  FiShoppingBag, FiZap, FiX,
} from "react-icons/fi";

interface FeedDefaults {
  brand: string;
  condition: "new" | "refurbished" | "used";
  googleProductCategory: string | null;
  baseUrl: string;
  currency: string;
}

interface FeedStats {
  rowsInFeed: number;
  activeProducts: number;
  totalProducts: number;
  activeFlashSales: number;
  inStock: number;
  outOfStock: number;
  onSale: number;
}

const FEEDS = [
  {
    key: "facebook-xml",
    platform: "Facebook Catalog",
    desc: "For Meta Business Suite → Catalogs → Add Catalog → Use a feed.",
    descBn: "Meta Business Suite → ক্যাটালগ → ক্যাটালগ যোগ করুন → ফিড ব্যবহার করুন।",
    url: "/feed/facebook.xml",
    color: "from-blue-500 to-indigo-600",
  },
  {
    key: "facebook-csv",
    platform: "Facebook Catalog (CSV)",
    desc: "Use this if Facebook rejects the XML feed for any reason.",
    descBn: "যদি Facebook XML ফিড গ্রহণ না করে এটি ব্যবহার করুন।",
    url: "/feed/facebook.csv",
    color: "from-blue-400 to-blue-600",
  },
  {
    key: "google-xml",
    platform: "Google Merchant Center",
    desc: "Merchant Center → Products → Feeds → Add Feed → Scheduled Fetch.",
    descBn: "Merchant Center → পণ্য → ফিড → ফিড যোগ করুন → Scheduled Fetch।",
    url: "/feed/google.xml",
    color: "from-yellow-500 to-orange-600",
  },
  {
    key: "google-csv",
    platform: "Google Merchant Center (CSV)",
    desc: "Alternate format if XML validation fails.",
    descBn: "XML যদি কাজ না করে বিকল্প ফরম্যাট।",
    url: "/feed/google.csv",
    color: "from-yellow-400 to-yellow-600",
  },
  {
    key: "tiktok-csv",
    platform: "TikTok Shop",
    desc: "Seller Center → Catalog → Bulk Import → Upload CSV.",
    descBn: "Seller Center → ক্যাটালগ → Bulk Import → CSV আপলোড।",
    url: "/feed/tiktok.csv",
    color: "from-pink-500 to-rose-600",
  },
] as const;

export default function FeedsClient() {
  const { lang } = useLang();
  const [defaults, setDefaults] = useState<FeedDefaults | null>(null);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/feeds", {
        credentials: "include",
        cache: "no-store",
      });
      const j = await res.json();
      setDefaults(j?.data?.defaults || null);
      setStats(j?.data?.stats || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {}
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiRss className="text-[var(--primary)]" />
            {lang === "en" ? "Product Feeds" : "প্রোডাক্ট ফিড"}
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            {lang === "en"
              ? "Auto-generated catalog feeds for Facebook, Google, and TikTok. Paste a URL once, ads stay in sync as you add or update products."
              : "Facebook, Google এবং TikTok-এর জন্য অটো-জেনারেটেড ক্যাটালগ ফিড। একবার URL পেস্ট করুন, পণ্য যোগ বা আপডেট করলে অ্যাড সিঙ্ক থাকবে।"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={async () => {
              if (refreshing) return;
              setRefreshing(true);
              try {
                const res = await fetch("/api/v1/admin/feeds/revalidate", {
                  method: "POST",
                  credentials: "include",
                });
                if (!res.ok) throw new Error("Failed");
                // Reload stats so admin sees the new row count after a moment.
                setTimeout(() => load(), 500);
                setRefreshMsg(lang === "en" ? "✓ Feeds refreshed" : "✓ ফিড রিফ্রেশ হয়েছে");
                setTimeout(() => setRefreshMsg(""), 3000);
              } catch {
                setRefreshMsg(lang === "en" ? "Refresh failed" : "রিফ্রেশ ব্যর্থ");
                setTimeout(() => setRefreshMsg(""), 3000);
              } finally {
                setRefreshing(false);
              }
            }}
            disabled={refreshing}
            className="px-3 py-2 text-sm rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            title={lang === "en" ? "Force feed cache to rebuild on next request" : "পরবর্তী রিকোয়েস্টে ফিড পুনরায় তৈরি করুন"}
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing
              ? (lang === "en" ? "Refreshing..." : "রিফ্রেশ হচ্ছে...")
              : (lang === "en" ? "Refresh feeds now" : "ফিড রিফ্রেশ করুন")}
          </button>
          {refreshMsg && <span className="text-xs text-green-700 font-medium">{refreshMsg}</span>}
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <FiSettings className="w-4 h-4" />
            {lang === "en" ? "Defaults" : "ডিফল্ট"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<FiPackage />} label={lang === "en" ? "Rows in Feed" : "ফিডে রো"} value={stats.rowsInFeed} accent="green" />
          <StatCard icon={<FiShoppingBag />} label={lang === "en" ? "Active Products" : "চালু পণ্য"} value={stats.activeProducts} accent="blue" />
          <StatCard icon={<FiZap />} label={lang === "en" ? "On Sale" : "সেলে"} value={stats.onSale} accent="purple" />
          <StatCard icon={<FiPackage />} label={lang === "en" ? "Out of Stock" : "স্টক নেই"} value={stats.outOfStock} accent="orange" />
        </div>
      )}

      {/* Feed cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          {lang === "en" ? "Loading…" : "লোড হচ্ছে…"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {FEEDS.map((f) => {
            const fullUrl = `${origin}${f.url}`;
            return (
              <div key={f.key} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-8 rounded-full bg-gradient-to-b ${f.color}`} />
                    <h3 className="font-semibold text-gray-900">{f.platform}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{lang === "en" ? f.desc : f.descBn}</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-xs text-gray-700 break-all">
                  {fullUrl}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copy(f.key, fullUrl)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-[var(--primary)] text-white flex items-center justify-center gap-1.5 hover:opacity-90"
                  >
                    {copiedKey === f.key ? (
                      <><FiCheck className="w-3.5 h-3.5" />{lang === "en" ? "Copied!" : "কপি হয়েছে!"}</>
                    ) : (
                      <><FiCopy className="w-3.5 h-3.5" />{lang === "en" ? "Copy URL" : "URL কপি"}</>
                    )}
                  </button>
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <FiExternalLink className="w-3.5 h-3.5" />
                    {lang === "en" ? "View" : "দেখুন"}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Help / how-to */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-900 space-y-2">
        <p className="font-semibold">{lang === "en" ? "How to use" : "যেভাবে ব্যবহার করবেন"}</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-800 text-xs leading-relaxed">
          {lang === "en" ? (
            <>
              <li>Copy the URL of the feed you need (Facebook, Google, etc.).</li>
              <li>Paste it into the platform&apos;s catalog setup as a &quot;scheduled fetch&quot; / &quot;feed URL&quot;.</li>
              <li>Set fetch frequency to <strong>hourly</strong> on Facebook, <strong>daily</strong> on Google.</li>
              <li>Done — adding/editing products auto-flows to your ads on the next fetch.</li>
            </>
          ) : (
            <>
              <li>আপনি যে ফিড চান তার URL কপি করুন (Facebook, Google, ইত্যাদি)।</li>
              <li>প্ল্যাটফর্মের ক্যাটালগ সেটআপে &quot;scheduled fetch&quot; / &quot;feed URL&quot; হিসাবে পেস্ট করুন।</li>
              <li>Facebook-এ fetch frequency <strong>hourly</strong>, Google-এ <strong>daily</strong> সেট করুন।</li>
              <li>এই-ই — পণ্য যোগ/এডিট করলে পরের fetch-এ অ্যাড অটো-আপডেট হবে।</li>
            </>
          )}
        </ol>
      </div>

      {showSettings && defaults && (
        <SettingsModal
          defaults={defaults}
          onClose={() => setShowSettings(false)}
          onSaved={() => { setShowSettings(false); load(); }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: "green" | "blue" | "purple" | "orange";
}) {
  const accents = {
    green: "from-green-500 to-emerald-600",
    blue: "from-blue-500 to-indigo-600",
    purple: "from-purple-500 to-fuchsia-600",
    orange: "from-orange-500 to-amber-600",
  };
  return (
    <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 p-3 md:p-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
        {icon}
        {label}
      </div>
      <p className={`text-lg md:text-xl font-bold bg-gradient-to-r ${accents[accent]} bg-clip-text text-transparent`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function SettingsModal({
  defaults,
  onClose,
  onSaved,
}: {
  defaults: FeedDefaults;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLang();
  const [brand, setBrand] = useState(defaults.brand);
  const [condition, setCondition] = useState(defaults.condition);
  const [googleCat, setGoogleCat] = useState(defaults.googleProductCategory || "");
  const [siteUrl, setSiteUrl] = useState(defaults.baseUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/feeds", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand, condition,
          google_product_category: googleCat,
          site_url: siteUrl,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.message || "Failed to save");
        return;
      }
      onSaved();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {lang === "en" ? "Feed Defaults" : "ফিড ডিফল্ট"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {lang === "en"
            ? "Applied to every feed. Per-product overrides can be added later if needed."
            : "প্রতিটি ফিডে প্রযোজ্য। প্রতি-পণ্য ওভাররাইড পরে যোগ করা যাবে।"}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Field
            label={lang === "en" ? "Brand name (sent as g:brand)" : "ব্র্যান্ডের নাম (g:brand হিসাবে পাঠানো হয়)"}
            value={brand} onChange={setBrand} required
          />
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {lang === "en" ? "Condition" : "অবস্থা"}
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as FeedDefaults["condition"])}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="new">new</option>
              <option value="refurbished">refurbished</option>
              <option value="used">used</option>
            </select>
          </div>
          <Field
            label={lang === "en" ? "Google product category (optional, ID or path)" : "Google product category (ঐচ্ছিক)"}
            value={googleCat} onChange={setGoogleCat}
            placeholder="e.g. 187 (Apparel & Accessories)"
          />
          <Field
            label={lang === "en" ? "Site URL (used for product links)" : "সাইটের URL (পণ্যের লিঙ্কে ব্যবহৃত)"}
            value={siteUrl} onChange={setSiteUrl} required
            placeholder="https://akhiyanbd.com"
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
              {lang === "en" ? "Cancel" : "বাতিল"}
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50">
              {saving ? (lang === "en" ? "Saving…" : "সেভ হচ্ছে…") : (lang === "en" ? "Save" : "সেভ")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, required, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[var(--primary)] focus:outline-none"
      />
    </div>
  );
}
