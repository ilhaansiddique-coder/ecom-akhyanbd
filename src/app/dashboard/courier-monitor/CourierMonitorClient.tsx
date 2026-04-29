"use client";

import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { toBn } from "@/utils/toBn";
import { useLang } from "@/lib/LanguageContext";
import { motion } from "framer-motion";
import {
  FiPackage,
  FiClock,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiCheck,
} from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParcelItem {
  productName: string;
  quantity: number;
  variantLabel: string | null;
}
interface CourierParcel {
  id: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string | null;
  total: number;
  status: string;
  courierType: string | null;
  consignmentId: string | null;
  courierStatus: string | null;
  courierScore: string | null;
  courierSentAt: string | null;
  createdAt: string | null;
  items: ParcelItem[];
}
interface MonitorStats {
  total: number;
  delivered: number;
  returned: number;
  inTransit: number;
  pending: number;
}
interface Filters {
  page: number;
  from: string;
  to: string;
  courier: string;
  status: string;
  q: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Map raw courier status string → display badge */
function courierBadge(status: string | null): { label: string; cls: string } {
  if (!status) return { label: "Not Updated", cls: "bg-gray-100 text-gray-500" };
  const s = status.toLowerCase();
  if (s.includes("deliver"))
    return { label: status, cls: "bg-emerald-100 text-emerald-700" };
  if (s.includes("return") || s.includes("cancel") || s.includes("refused"))
    return { label: status, cls: "bg-red-100 text-red-700" };
  if (s.includes("transit") || s.includes("progress") || s === "pickup completed" || s.includes("on_the_way"))
    return { label: status, cls: "bg-blue-100 text-blue-700" };
  return { label: status, cls: "bg-amber-100 text-amber-700" };
}

const ORDER_STATUS_CLS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  confirmed:  "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped:    "bg-purple-100 text-purple-800",
  delivered:  "bg-emerald-100 text-emerald-800",
  cancelled:  "bg-red-100 text-red-800",
};

const EMPTY_STATS: MonitorStats = { total: 0, delivered: 0, returned: 0, inTransit: 0, pending: 0 };
const LIMIT = 20;

// ─── Copy-to-clipboard mini-hook ─────────────────────────────────────────────
function useCopy() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1800);
  };
  return { copiedId, copy };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CourierMonitorClient() {
  const { lang } = useLang();

  // ── Data state ──
  const [parcels,    setParcels]    = useState<CourierParcel[]>([]);
  const [stats,      setStats]      = useState<MonitorStats>(EMPTY_STATS);
  const [totalCount, setTotalCount] = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [fetched,    setFetched]    = useState(false);

  // ── Refresh state ──
  const [refreshingIds, setRefreshingIds] = useState<Set<number>>(new Set());
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);

  // ── Filter state ──
  const [filters, setFilters] = useState<Filters>({
    page: 1, from: "", to: "", courier: "all", status: "all", q: "",
  });
  const [searchInput, setSearchInput] = useState("");

  // Keep a stable ref to current filters for use inside async callbacks
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const { copiedId, copy } = useCopy();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = async (f: Filters) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (f.page > 1)           sp.set("page",    String(f.page));
      if (f.from)               sp.set("from",    f.from);
      if (f.to)                 sp.set("to",      f.to);
      if (f.courier !== "all")  sp.set("courier", f.courier);
      if (f.status  !== "all")  sp.set("status",  f.status);
      if (f.q)                  sp.set("q",       f.q);

      const res  = await fetch(`/api/v1/admin/courier/monitor?${sp}`);
      const data = await res.json();
      setParcels(data.parcels   || []);
      setStats(data.stats       || EMPTY_STATS);
      setTotalCount(data.total  || 0);
      setFetched(true);
    } catch {}
    finally { setLoading(false); }
  };

  // Initial load on first render
  const initialized = useRef(false);
  if (!initialized.current) {
    initialized.current = true;
    // Use setTimeout(0) so state is ready before the first async call
    setTimeout(() => load(filters), 0);
  }

  const applyFilters = (patch: Partial<Filters>) => {
    const next = { ...filtersRef.current, page: 1, ...patch };
    setFilters(next);
    load(next);
  };

  // ── Refresh single parcel ──────────────────────────────────────────────────
  const refreshOne = async (parcel: CourierParcel) => {
    setRefreshingIds((prev) => new Set([...prev, parcel.id]));
    try {
      const endpoint =
        parcel.courierType === "pathao"
          ? "/api/v1/admin/courier/pathao"
          : "/api/v1/admin/courier";
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_status", order_id: parcel.id }),
      });
      await load(filtersRef.current);
    } catch {}
    finally {
      setRefreshingIds((prev) => {
        const s = new Set(prev);
        s.delete(parcel.id);
        return s;
      });
    }
  };

  // ── Refresh all visible parcels ────────────────────────────────────────────
  const refreshAll = async () => {
    if (!parcels.length) return;
    setRefreshingAll(true);
    setRefreshProgress(0);
    for (let i = 0; i < parcels.length; i++) {
      const p = parcels[i];
      try {
        const endpoint =
          p.courierType === "pathao"
            ? "/api/v1/admin/courier/pathao"
            : "/api/v1/admin/courier";
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check_status", order_id: p.id }),
        });
      } catch {}
      setRefreshProgress(Math.round(((i + 1) / parcels.length) * 100));
      await new Promise((r) => setTimeout(r, 400)); // respect rate limits
    }
    await load(filtersRef.current);
    setRefreshingAll(false);
    setRefreshProgress(0);
  };

  const totalPages = Math.ceil(totalCount / LIMIT);
  const lbl = (en: string, bn: string) => (lang === "en" ? en : bn);

  // ── Stat card config ───────────────────────────────────────────────────────
  const statCards = [
    { icon: FiPackage,     label: lbl("Total Sent",    "মোট পাঠানো"),        value: stats.total,     color: "bg-[var(--primary)]" },
    { icon: FiClock,       label: lbl("Pending",       "অপেক্ষমাণ"),         value: stats.pending,   color: "bg-amber-500"        },
    { icon: FiTruck,       label: lbl("In Transit",    "ট্রানজিটে"),          value: stats.inTransit, color: "bg-blue-500"         },
    { icon: FiCheckCircle, label: lbl("Delivered",     "ডেলিভারি হয়েছে"),     value: stats.delivered, color: "bg-emerald-500"      },
    { icon: FiXCircle,     label: lbl("Returned",      "ফেরত এসেছে"),         value: stats.returned,  color: "bg-red-500"          },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title={lbl("Courier Monitor", "কুরিয়ার মনিটর")}>
      <div className="space-y-5">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-gray-800">{toBn(s.value)}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">

            {/* Date range */}
            <DateRangePicker
              from={filters.from}
              to={filters.to}
              onChange={(f, t) => applyFilters({ from: f, to: t })}
            />

            {/* Courier type */}
            <select
              value={filters.courier}
              onChange={(e) => applyFilters({ courier: e.target.value })}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--primary)] bg-white"
            >
              <option value="all">{lbl("All Couriers", "সব কুরিয়ার")}</option>
              <option value="steadfast">Steadfast</option>
              <option value="pathao">Pathao</option>
            </select>

            {/* Courier status group */}
            <select
              value={filters.status}
              onChange={(e) => applyFilters({ status: e.target.value })}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--primary)] bg-white"
            >
              <option value="all">{lbl("All Statuses", "সব স্ট্যাটাস")}</option>
              <option value="pending">{lbl("Pending",    "অপেক্ষমাণ")}</option>
              <option value="in_transit">{lbl("In Transit", "ট্রানজিটে")}</option>
              <option value="delivered">{lbl("Delivered",  "ডেলিভারি হয়েছে")}</option>
              <option value="returned">{lbl("Returned",   "ফেরত")}</option>
            </select>

            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={lbl("Name, phone, consignment ID…", "নাম, ফোন, কনসাইনমেন্ট…")}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyFilters({ q: searchInput });
                  }}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <button
                onClick={() => applyFilters({ q: searchInput })}
                className="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-opacity"
              >
                {lbl("Search", "খুঁজুন")}
              </button>
            </div>

            {/* Refresh All button */}
            <button
              onClick={refreshAll}
              disabled={refreshingAll || !parcels.length}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshingAll ? "animate-spin" : ""}`} />
              {refreshingAll
                ? `${lbl("Refreshing", "আপডেট হচ্ছে")} ${refreshProgress}%`
                : lbl("Refresh All", "সব আপডেট করুন")}
            </button>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Top bar: count + pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <span className="text-sm font-semibold text-gray-700">
              {loading && !fetched
                ? lbl("Loading…", "লোড হচ্ছে…")
                : `${toBn(totalCount)} ${lbl("parcels", "পার্সেল")}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => applyFilters({ page: filters.page - 1 })}
                  disabled={filters.page === 1 || loading}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 px-1">
                  {toBn(filters.page)} / {toBn(totalPages)}
                </span>
                <button
                  onClick={() => applyFilters({ page: filters.page + 1 })}
                  disabled={filters.page >= totalPages || loading}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 px-5 py-4 border-b border-gray-50">
                  {[40, 130, 160, 68, 72, 110, 90, 72].map((w, c) => (
                    <div key={c} className="h-3 bg-gray-100 rounded" style={{ width: w }} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && fetched && parcels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <FiPackage className="w-12 h-12 opacity-25" />
              <p className="text-sm font-medium">
                {lbl("No courier parcels found", "কোনো পার্সেল পাওয়া যায়নি")}
              </p>
              <p className="text-xs text-gray-400">
                {lbl(
                  "Try adjusting your date range or filters",
                  "তারিখ বা ফিল্টার পরিবর্তন করে দেখুন",
                )}
              </p>
            </div>
          )}

          {/* First-load placeholder */}
          {!loading && !fetched && (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              {lbl("Loading parcels…", "পার্সেল লোড হচ্ছে…")}
            </div>
          )}

          {/* Table */}
          {!loading && parcels.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 whitespace-nowrap">#</th>
                    <th className="px-4 py-3 whitespace-nowrap">{lbl("Customer", "গ্রাহক")}</th>
                    <th className="px-4 py-3 whitespace-nowrap hidden md:table-cell">{lbl("Address", "ঠিকানা")}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{lbl("Amount", "পরিমাণ")}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{lbl("Courier", "কুরিয়ার")}</th>
                    <th className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">{lbl("Consignment", "কনসাইনমেন্ট")}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{lbl("Status", "স্ট্যাটাস")}</th>
                    <th className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">{lbl("Sent", "পাঠানো")}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{lbl("Refresh", "আপডেট")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {parcels.map((parcel) => {
                    const cb         = courierBadge(parcel.courierStatus);
                    const orderCls   = ORDER_STATUS_CLS[parcel.status] || "bg-gray-100 text-gray-600";
                    const isRefresh  = refreshingIds.has(parcel.id);
                    const copyKey    = `cid-${parcel.id}`;
                    const isCopied   = copiedId === copyKey;

                    // Compact item list: first 2 items + overflow count
                    const itemLine = parcel.items
                      .slice(0, 2)
                      .map((i) =>
                        `${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ""} ×${i.quantity}`
                      )
                      .join(", ");
                    const itemMore =
                      parcel.items.length > 2
                        ? ` +${parcel.items.length - 2} ${lbl("more", "আরও")}`
                        : "";

                    return (
                      <tr
                        key={parcel.id}
                        className={`hover:bg-gray-50/50 transition-colors ${isRefresh ? "opacity-60" : ""}`}
                      >
                        {/* # Order ID */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[var(--primary)] font-semibold">
                            #{toBn(parcel.id)}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 max-w-[140px] truncate">
                            {parcel.customerName}
                          </div>
                          <a
                            href={`tel:${parcel.customerPhone}`}
                            className="text-xs text-[var(--primary)] hover:underline"
                          >
                            {parcel.customerPhone}
                          </a>
                          {/* Items summary — shown on mobile only (hidden on md+) */}
                          {parcel.items.length > 0 && (
                            <div className="text-[10px] text-gray-400 max-w-[140px] truncate mt-0.5 md:hidden">
                              {itemLine}{itemMore}
                            </div>
                          )}
                        </td>

                        {/* Address (hidden on mobile) */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="max-w-[190px]">
                            <div className="text-xs text-gray-600 leading-snug line-clamp-2">
                              {parcel.customerAddress}
                            </div>
                            {parcel.city && (
                              <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                                {parcel.city}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-800">
                          ৳{toBn(parcel.total)}
                        </td>

                        {/* Courier type badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {parcel.courierType ? (
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                                parcel.courierType === "pathao"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {parcel.courierType === "pathao" ? "Pathao" : "Steadfast"}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* Consignment ID (hidden on tablet) */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {parcel.consignmentId ? (
                            <div className="flex items-center gap-1.5 group">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-700">
                                {parcel.consignmentId}
                              </span>
                              <button
                                onClick={() => copy(parcel.consignmentId!, copyKey)}
                                title={lbl("Copy", "কপি করুন")}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-all"
                              >
                                {isCopied
                                  ? <FiCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  : <FiCopy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* Status (courier + order) */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full w-fit whitespace-nowrap ${cb.cls}`}>
                              {cb.label}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit whitespace-nowrap ${orderCls}`}>
                              {parcel.status}
                            </span>
                          </div>
                        </td>

                        {/* Sent date (hidden on tablet) */}
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap hidden lg:table-cell">
                          {parcel.courierSentAt
                            ? new Date(parcel.courierSentAt).toLocaleDateString(
                                lang === "en" ? "en-GB" : "bn-BD",
                                { day: "2-digit", month: "short", year: "numeric" },
                              )
                            : "—"}
                        </td>

                        {/* Refresh button */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => refreshOne(parcel)}
                            disabled={isRefresh || refreshingAll}
                            title={lbl("Refresh status", "স্ট্যাটাস আপডেট করুন")}
                            className="p-2 rounded-xl text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 transition-colors"
                          >
                            <FiRefreshCw className={`w-4 h-4 ${isRefresh ? "animate-spin" : ""}`} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-xs text-gray-500">
                {lbl(
                  `${((filters.page - 1) * LIMIT) + 1}–${Math.min(filters.page * LIMIT, totalCount)} of ${totalCount}`,
                  `${toBn(((filters.page - 1) * LIMIT) + 1)}–${toBn(Math.min(filters.page * LIMIT, totalCount))} / ${toBn(totalCount)}`,
                )}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => applyFilters({ page: 1 })}
                  disabled={filters.page === 1}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                >
                  «
                </button>
                {Array.from(
                  { length: Math.min(5, totalPages) },
                  (_, i) => Math.max(1, Math.min(totalPages - 4, filters.page - 2)) + i,
                ).map((pn) => (
                  <button
                    key={pn}
                    onClick={() => applyFilters({ page: pn })}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                      pn === filters.page
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {toBn(pn)}
                  </button>
                ))}
                <button
                  onClick={() => applyFilters({ page: totalPages })}
                  disabled={filters.page >= totalPages}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
