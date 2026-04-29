"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LanguageContext";
import { FiArrowLeft, FiExternalLink, FiCopy, FiCheck, FiSmartphone, FiMonitor, FiTablet, FiGlobe } from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

/**
 * Measures container width with ResizeObserver and renders the chart with
 * numeric width/height. Avoids Recharts <ResponsiveContainer> entirely —
 * its first-render dimension state defaults to -1 and logs a warning.
 */
function MeasuredChart({
  height = 256,
  children,
}: {
  height?: number;
  children: (width: number, height: number) => React.ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    if (typeof ResizeObserver === "undefined") {
      setWidth(node.clientWidth || 0);
      return;
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (w > 0) setWidth(w);
      }
    });
    ro.observe(node);
  }, []);
  return (
    <div ref={containerRef} style={{ width: "100%", height, minWidth: 0 }}>
      {width > 0 ? children(width, height) : null}
    </div>
  );
}

interface Bucket { key: string; count: number }
interface RecentClick {
  id: number;
  createdAt: string;
  source: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referer: string | null;
  utmCampaign: string | null;
}

interface AnalyticsResponse {
  link: { id: number; slug: string; targetUrl: string; createdAt: string };
  range: { days: number | null; label: string };
  summary: {
    total: number;
    unique: number;
    lastClick: string | null;
    topSource: string | null;
    topCountry: string | null;
    topDevice: string | null;
  };
  timeline: { date: string; count: number }[];
  sources: Bucket[];
  countries: Bucket[];
  browsers: Bucket[];
  oses: Bucket[];
  devices: Bucket[];
  referers: Bucket[];
  utmCampaigns: Bucket[];
  utmMediums: Bucket[];
  recent: RecentClick[];
}

export default function ShortlinkAnalyticsClient({
  id,
  slug,
  targetUrl,
}: {
  id: number;
  slug: string;
  targetUrl: string;
}) {
  const { lang } = useLang();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7" | "30" | "90" | "all">("30");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/v1/admin/shortlinks/${id}/analytics?range=${range}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setData(j?.data || null);
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, range]);

  const fullUrl = `${origin}/${slug}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-5">
      {/* Header */}
      <div>
        <Link href="/dashboard/shortlinks" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <FiArrowLeft className="w-4 h-4" />
          {lang === "en" ? "Back to shortlinks" : "শর্টলিঙ্কে ফিরুন"}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 font-mono truncate">/{slug}</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1 break-all line-clamp-2">→ {targetUrl}</p>
          </div>
          {/* Buttons compress to icons on phones to save horizontal space.
              Labels reappear from sm: breakpoint up. */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={copy} className="px-2.5 sm:px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5">
              {copied ? <FiCheck className="w-3.5 h-3.5 text-green-600" /> : <FiCopy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{lang === "en" ? "Copy URL" : "URL কপি"}</span>
            </button>
            <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="px-2.5 sm:px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5">
              <FiExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === "en" ? "Open" : "খুলুন"}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Range filter — wraps on small screens, compact labels on mobile so
          all four pills fit the viewport without horizontal scroll. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(["7", "30", "90", "all"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap ${
              range === r
                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {r === "all" ? (
              lang === "en" ? "All time" : "সব সময়"
            ) : (
              <>
                <span className="sm:hidden">
                  {lang === "en" ? `${r}d` : `${r} দিন`}
                </span>
                <span className="hidden sm:inline">
                  {lang === "en" ? `Last ${r} days` : `গত ${r} দিন`}
                </span>
              </>
            )}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          {lang === "en" ? "Loading…" : "লোড হচ্ছে…"}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label={lang === "en" ? "Total Clicks" : "মোট ক্লিক"}
              value={String(data.summary.total)}
              accent="green"
            />
            <SummaryCard
              label={lang === "en" ? "Unique Networks" : "ইউনিক নেটওয়ার্ক"}
              value={String(data.summary.unique)}
              accent="blue"
            />
            <SummaryCard
              label={lang === "en" ? "Top Source" : "শীর্ষ সোর্স"}
              value={data.summary.topSource || "—"}
              accent="purple"
            />
            <SummaryCard
              label={lang === "en" ? "Top Country" : "শীর্ষ দেশ"}
              value={data.summary.topCountry || "—"}
              accent="orange"
            />
          </div>

          {/* Timeline chart — shorter on phones (h-48) to leave room for the
              breakdown panels below in a single viewport. */}
          <div className="bg-white rounded-2xl border border-gray-100 p-3 md:p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {lang === "en" ? "Clicks Over Time" : "সময়ের সাথে ক্লিক"}
            </h2>
            {data.timeline.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                {lang === "en" ? "No clicks in this range" : "এই রেঞ্জে কোনো ক্লিক নেই"}
              </p>
            ) : (
              <MeasuredChart height={typeof window !== "undefined" && window.innerWidth >= 768 ? 256 : 192}>
                {(w, h) => (
                  <BarChart width={w} height={h} data={data.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#888" }}
                      interval="preserveStartEnd"
                      minTickGap={20}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#888" }} allowDecimals={false} width={28} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #eee", fontSize: 12 }}
                      labelStyle={{ color: "#333", fontWeight: 600 }}
                    />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </MeasuredChart>
            )}
          </div>

          {/* Breakdown grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BreakdownTable
              title={lang === "en" ? "Sources" : "সোর্স"}
              rows={data.sources}
              total={data.summary.total}
              icon={<FiGlobe className="w-4 h-4" />}
            />
            <BreakdownTable
              title={lang === "en" ? "Countries" : "দেশ"}
              rows={data.countries}
              total={data.summary.total}
              icon={<FiGlobe className="w-4 h-4" />}
              empty={lang === "en" ? "Country data needs a Cloudflare proxy in front of the site." : "দেশের ডেটার জন্য Cloudflare প্রক্সি দরকার।"}
            />
            <BreakdownTable
              title={lang === "en" ? "Devices" : "ডিভাইস"}
              rows={data.devices}
              total={data.summary.total}
              icon={<DeviceIcon />}
            />
            <BreakdownTable
              title={lang === "en" ? "Browsers" : "ব্রাউজার"}
              rows={data.browsers}
              total={data.summary.total}
            />
            <BreakdownTable
              title={lang === "en" ? "Operating Systems" : "অপারেটিং সিস্টেম"}
              rows={data.oses}
              total={data.summary.total}
            />
            <BreakdownTable
              title={lang === "en" ? "Top Referers" : "শীর্ষ রেফারার"}
              rows={data.referers}
              total={data.summary.total}
              keyTruncate
            />
            {data.utmCampaigns.length > 0 && (
              <BreakdownTable
                title={lang === "en" ? "UTM Campaigns" : "UTM ক্যাম্পেইন"}
                rows={data.utmCampaigns}
                total={data.summary.total}
              />
            )}
            {data.utmMediums.length > 0 && (
              <BreakdownTable
                title={lang === "en" ? "UTM Mediums" : "UTM মিডিয়াম"}
                rows={data.utmMediums}
                total={data.summary.total}
              />
            )}
          </div>

          {/* Recent clicks */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                {lang === "en" ? `Recent Clicks (last ${data.recent.length})` : `সাম্প্রতিক ক্লিক (শেষ ${data.recent.length})`}
              </h2>
            </div>
            {data.recent.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                {lang === "en" ? "No clicks yet." : "এখনো কোনো ক্লিক নেই।"}
              </p>
            ) : (
              <>
                {/* Mobile cards — table is too wide for phones. Mirrors the
                    orders page convention: 5-col table → stacked card with
                    primary line + meta chips. */}
                <div className="md:hidden divide-y divide-gray-100">
                  {data.recent.map((c) => (
                    <div key={c.id} className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-700">
                          {new Date(c.createdAt).toLocaleString(lang === "en" ? "en-US" : "bn-BD", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          {c.source || "direct"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                        {c.country && (
                          <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">{c.country}</span>
                        )}
                        {c.device && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 capitalize">{c.device}</span>
                        )}
                        <span className="text-gray-400">{c.browser || "—"} · {c.os || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">{lang === "en" ? "When" : "কখন"}</th>
                        <th className="px-3 py-2 text-left font-medium">{lang === "en" ? "Source" : "সোর্স"}</th>
                        <th className="px-3 py-2 text-left font-medium">{lang === "en" ? "Country" : "দেশ"}</th>
                        <th className="px-3 py-2 text-left font-medium">{lang === "en" ? "Device" : "ডিভাইস"}</th>
                        <th className="px-3 py-2 text-left font-medium">{lang === "en" ? "Browser / OS" : "ব্রাউজার / OS"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.recent.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleString(lang === "en" ? "en-US" : "bn-BD")}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{c.source || "direct"}</span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">{c.country || "—"}</td>
                          <td className="px-3 py-2 text-xs text-gray-600 capitalize">{c.device || "—"}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {c.browser || "—"} / {c.os || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: "green" | "blue" | "purple" | "orange" }) {
  const accents = {
    green: "from-green-500 to-emerald-600",
    blue: "from-blue-500 to-indigo-600",
    purple: "from-purple-500 to-fuchsia-600",
    orange: "from-orange-500 to-amber-600",
  };
  return (
    <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 p-3 md:p-4">
      <p className="text-[10px] md:text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg md:text-xl font-bold bg-gradient-to-r ${accents[accent]} bg-clip-text text-transparent truncate`}>{value}</p>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  total,
  icon,
  empty,
  keyTruncate,
}: {
  title: string;
  rows: Bucket[];
  total: number;
  icon?: React.ReactNode;
  empty?: string;
  keyTruncate?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 p-3 md:p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
        {icon}
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">{empty || "No data."}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const pct = total > 0 ? (r.count / total) * 100 : 0;
            return (
              <div key={r.key} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`text-gray-700 ${keyTruncate ? "truncate max-w-[70%]" : ""}`} title={r.key}>{r.key}</span>
                  <span className="text-gray-500 tabular-nums">{r.count} · {pct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeviceIcon() {
  return (
    <span className="inline-flex">
      <FiSmartphone className="w-3.5 h-3.5" />
      <FiTablet className="w-3.5 h-3.5 -ml-1" />
      <FiMonitor className="w-3.5 h-3.5 -ml-1" />
    </span>
  );
}
