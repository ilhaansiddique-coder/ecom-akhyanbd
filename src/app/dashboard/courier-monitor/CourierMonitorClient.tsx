"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import DateRangePicker from "@/components/DateRangePicker";
import InlineSelect from "@/components/InlineSelect";
import { toBn } from "@/utils/toBn";
import { useLang } from "@/lib/LanguageContext";
import { motion } from "framer-motion";
import {
  FiPackage, FiClock, FiTruck, FiCheckCircle, FiXCircle,
  FiRefreshCw, FiSearch, FiChevronLeft, FiChevronRight,
  FiCopy, FiCheck, FiExternalLink, FiDatabase, FiWifi,
  FiArrowLeft, FiDollarSign,
} from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────────────────
type DataSource  = "database" | "pathao" | "steadfast";
type PathaoTab   = "active" | "delivered" | "partial" | "returned_reversed" | "paid_zero";

interface ParcelItem {
  productName: string;
  quantity: number;
  variantLabel: string | null;
}
interface CourierParcel {
  id: number | null;
  consignmentId: string | null;
  merchantOrderId?: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string | null;
  total: number;
  deliveryFee?: number;
  codFee?: number;
  totalFee?: number;
  cashOnDelivery?: boolean;
  status: string | null;
  courierType: string | null;
  courierStatus: string | null;
  courierScore?: string | null;
  billingStatus?: string | null;
  billingDate?: string | null;
  orderType?: string | null;
  subtype?: "returned" | "reversed" | "both" | null;
  reverseConsignmentId?: string | null;
  reverseCourierStatus?: string | null;
  statusColor?: string | null;
  invoiceId?: string | null;
  courierSentAt?: string | null;
  createdAt: string | null;
  items: ParcelItem[];
  source?: DataSource;
}
interface DbFilters {
  page: number; from: string; to: string;
  courier: string; status: string; q: string;
}
interface PathaoFilters {
  tab: PathaoTab;
  archive: string; // "0"=active, "1"=archived
  page: number;
  q: string;
  subFilter: string; // optional status-card filter (e.g. "pending", "in_transit")
  from: string;      // YYYY-MM-DD (BD), inclusive
  to: string;        // YYYY-MM-DD (BD), inclusive
}

// ─── Pathao Tab Config ────────────────────────────────────────────────────────
interface TabDef {
  id: PathaoTab;
  label: string;
  labelBn: string;
  activeClass: string;
  inactiveClass: string;
}
const PATHAO_TABS: TabDef[] = [
  {
    id: "active",
    label: "Active Orders", labelBn: "সক্রিয় অর্ডার",
    activeClass:   "bg-amber-500 text-white shadow",
    inactiveClass: "text-amber-600 hover:bg-amber-50",
  },
  {
    id: "delivered",
    label: "Delivered", labelBn: "ডেলিভারি হয়েছে",
    activeClass:   "bg-emerald-500 text-white shadow",
    inactiveClass: "text-emerald-600 hover:bg-emerald-50",
  },
  {
    id: "partial",
    label: "Partial Orders", labelBn: "আংশিক অর্ডার",
    activeClass:   "bg-amber-500 text-white shadow",
    inactiveClass: "text-amber-600 hover:bg-amber-50",
  },
  {
    id: "returned_reversed",
    label: "Return & Reverse", labelBn: "রিটার্ন ও রিভার্স",
    activeClass:   "bg-red-500 text-white shadow",
    inactiveClass: "text-red-500 hover:bg-red-50",
  },
  {
    id: "paid_zero",
    label: "Paid Parcels", labelBn: "পরিশোধিত পার্সেল",
    activeClass:   "bg-indigo-500 text-white shadow",
    inactiveClass: "text-indigo-600 hover:bg-indigo-50",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function courierBadge(status: string | null): { label: string; cls: string } {
  if (!status) return { label: "Not Updated", cls: "bg-gray-100 text-gray-500" };
  const s = status.toLowerCase();
  if (s.includes("deliver"))
    return { label: status, cls: "bg-emerald-100 text-emerald-700" };
  if (s.includes("return") || s.includes("cancel") || s.includes("refused") || s.includes("sorting hub"))
    return { label: status, cls: "bg-red-100 text-red-700" };
  if (s.includes("transit") || s.includes("progress") || s === "pickup completed" || s.includes("on_the_way") || s.includes("sorting"))
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
// Display label for the local-order status badge. The DB still stores
// "shipped" but the merchant-facing label is "Courier Sent" — map at render
// time so we don't need a data migration.
const ORDER_STATUS_LABEL_EN: Record<string, string> = {
  pending:    "Pending",
  confirmed:  "Confirmed",
  processing: "Processing",
  shipped:    "Courier Sent",
  delivered:  "Delivered",
  cancelled:  "Cancelled",
};
const ORDER_STATUS_LABEL_BN: Record<string, string> = {
  pending:    "অপেক্ষমাণ",
  confirmed:  "নিশ্চিত",
  processing: "প্রসেসিং",
  shipped:    "কুরিয়ার পাঠানো হয়েছে",
  delivered:  "ডেলিভারি",
  cancelled:  "বাতিল",
};
function localStatusLabel(status: string | null | undefined, lang: string): string {
  if (!status) return "";
  const map = lang === "en" ? ORDER_STATUS_LABEL_EN : ORDER_STATUS_LABEL_BN;
  return map[status] ?? status;
}
const BILLING_STATUS_CLS: Record<string, string> = {
  paid:   "bg-emerald-100 text-emerald-700",
  unpaid: "bg-amber-100 text-amber-700",
};

const EMPTY_STATS: Record<string, unknown> = {};
const DB_LIMIT     = 100;
const PATHAO_LIMIT = 100;

function useCopy() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1800);
  };
  return { copiedId, copy };
}

function fmtCurrency(n: number) {
  if (n >= 10_000_000) return `৳${(n / 10_000_000).toFixed(1)} cr`;
  if (n >= 100_000)    return `৳${(n / 100_000).toFixed(1)} L`;
  return `৳${n.toLocaleString("en-BD")}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CourierMonitorClient() {
  const { lang } = useLang();
  const lbl = (en: string, bn: string) => (lang === "en" ? en : bn);

  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  // ── Derive initial state from URL ─────────────────────────────────────────
  const urlSource = (searchParams.get("source") ?? "database") as DataSource;
  const urlTab    = (searchParams.get("tab")    ?? "active")   as PathaoTab;

  // ── Source ──
  const [source, setSource] = useState<DataSource>(urlSource);

  // ── Data state ──
  const [parcels,    setParcels]    = useState<CourierParcel[]>([]);
  const [stats,      setStats]      = useState<Record<string, unknown>>(EMPTY_STATS);
  const [totalCount, setTotalCount] = useState(0);
  const [lastPage,   setLastPage]   = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [fetched,    setFetched]    = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── DB refresh state ──
  const [refreshingIds, setRefreshingIds] = useState<Set<number>>(new Set());
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);

  // ── Filters ──
  const [dbFilters, setDbFilters] = useState<DbFilters>({
    page: 1, from: "", to: "", courier: "all", status: "all", q: "",
  });
  const [pathaoFilters, setPathaoFilters] = useState<PathaoFilters>({
    tab: (urlSource === "pathao" || urlSource === "steadfast") ? urlTab : "active",
    archive: "0", page: 1, q: "", subFilter: "", from: "", to: "",
  });
  const [searchInput, setSearchInput] = useState("");

  const dbFiltersRef     = useRef(dbFilters);
  const pathaoFiltersRef = useRef(pathaoFilters);
  dbFiltersRef.current     = dbFilters;
  pathaoFiltersRef.current = pathaoFilters;

  const { copiedId, copy } = useCopy();

  // ── URL sync helper ───────────────────────────────────────────────────────
  const pushUrl = useCallback((src: DataSource, tab: PathaoTab) => {
    const sp = new URLSearchParams();
    if (src !== "database") sp.set("source", src);
    if ((src === "pathao" || src === "steadfast") && tab !== "active") sp.set("tab", tab);
    const qs = sp.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router, pathname]);

  // ── Fetch DB ──────────────────────────────────────────────────────────────
  const loadDb = async (f: DbFilters) => {
    setLoading(true); setFetchError(null);
    try {
      const sp = new URLSearchParams();
      if (f.page > 1)           sp.set("page",    String(f.page));
      if (f.from)               sp.set("from",    f.from);
      if (f.to)                 sp.set("to",      f.to);
      if (f.courier !== "all")  sp.set("courier", f.courier);
      if (f.status  !== "all")  sp.set("status",  f.status);
      if (f.q)                  sp.set("q",       f.q);

      const res = await fetch(`/api/v1/admin/courier/monitor?${sp}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(e.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setParcels(data.parcels   || []);
      setStats(data.stats       || EMPTY_STATS);
      setTotalCount(data.total  || 0);
      setLastPage(Math.ceil((data.total || 0) / DB_LIMIT) || 1);
      setFetched(true);
    } catch (e) {
      setFetchError((e as Error).message || "Failed to load");
    } finally { setLoading(false); }
  };

  // ── Fetch Pathao or Steadfast (same shape, different endpoint) ───────────
  // The source argument is passed explicitly because `source` state may not
  // have flushed when switchSource calls loadPathao back-to-back with setSource.
  const loadPathao = async (f: PathaoFilters, srcOverride?: DataSource) => {
    setLoading(true); setFetchError(null);
    try {
      const src = srcOverride ?? source;
      const sp = new URLSearchParams();
      sp.set("tab",     f.tab);
      sp.set("page",    String(f.page));
      sp.set("limit",   String(PATHAO_LIMIT));
      sp.set("archive", f.archive);
      if (f.q) sp.set("q", f.q);
      if (f.subFilter) sp.set("subFilter", f.subFilter);
      if (f.from) sp.set("from", f.from);
      if (f.to)   sp.set("to",   f.to);

      const endpoint = src === "steadfast" ? "steadfast-parcels" : "pathao-parcels";
      const res = await fetch(`/api/v1/admin/courier/${endpoint}?${sp}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(e.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // Enforce ≤150 COD filter client-side for paid_zero tab
      const rawList: CourierParcel[] = data.parcels || [];
      const filtered = f.tab === "paid_zero"
        ? rawList.filter((p) => Number(p.total) <= 150)
        : rawList;
      setParcels(filtered);
      setStats(data.stats      || EMPTY_STATS);
      setTotalCount(f.tab === "paid_zero" ? filtered.length : (data.total || 0));
      setLastPage(data.lastPage || 1);
      setFetched(true);
    } catch (e) {
      setFetchError((e as Error).message || "Failed to load Pathao data");
    } finally { setLoading(false); }
  };

  // ── Initial load — honour URL params ─────────────────────────────────────
  useEffect(() => {
    if (urlSource === "pathao" || urlSource === "steadfast") {
      loadPathao(pathaoFiltersRef.current, urlSource);
    } else {
      loadDb(dbFiltersRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Source switching ───────────────────────────────────────────────────────
  const switchSource = (next: DataSource) => {
    if (next === source) return;
    setSource(next); setFetched(false);
    setParcels([]); setStats(EMPTY_STATS); setTotalCount(0); setSearchInput("");
    if (next === "pathao" || next === "steadfast") {
      const reset: PathaoFilters = { tab: "active", archive: "0", page: 1, q: "", subFilter: "", from: "", to: "" };
      setPathaoFilters(reset); pathaoFiltersRef.current = reset;
      pushUrl(next, "active");
      // Pass `next` explicitly — the `source` state hasn't flushed yet.
      setTimeout(() => loadPathao(reset, next), 0);
    } else {
      const reset: DbFilters = { page: 1, from: "", to: "", courier: "all", status: "all", q: "" };
      setDbFilters(reset); dbFiltersRef.current = reset;
      pushUrl("database", "active");
      setTimeout(() => loadDb(reset), 0);
    }
  };

  // ── Pathao tab switching ───────────────────────────────────────────────────
  const switchPathaoTab = (tab: PathaoTab) => {
    if (tab === pathaoFilters.tab) return;
    setFetched(false); setParcels([]); setStats(EMPTY_STATS); setSearchInput("");
    // Reset subFilter on tab switch — old filter keys don't apply to a new tab
    const next: PathaoFilters = { ...pathaoFiltersRef.current, tab, page: 1, q: "", subFilter: "" };
    // Preserve date range across tab switches — merchants typically want
    // the same window when comparing buckets. Reset only if you want fresh.
    setPathaoFilters(next); pathaoFiltersRef.current = next;
    pushUrl("pathao", tab);
    loadPathao(next);
  };

  const applyDbFilters = (patch: Partial<DbFilters>) => {
    const next = { ...dbFiltersRef.current, page: 1, ...patch };
    setDbFilters(next); loadDb(next);
  };
  const applyPathaoFilters = (patch: Partial<PathaoFilters>) => {
    const next = { ...pathaoFiltersRef.current, page: 1, ...patch };
    setPathaoFilters(next); loadPathao(next);
  };

  // ── DB refresh single ──────────────────────────────────────────────────────
  const refreshOne = async (parcel: CourierParcel) => {
    if (!parcel.id) return;
    setRefreshingIds((prev) => new Set([...prev, parcel.id!]));
    try {
      const ep = parcel.courierType === "pathao" ? "/api/v1/admin/courier/pathao" : "/api/v1/admin/courier";
      await fetch(ep, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_status", order_id: parcel.id }),
      });
      await loadDb(dbFiltersRef.current);
    } catch {}
    finally {
      setRefreshingIds((prev) => { const s = new Set(prev); s.delete(parcel.id!); return s; });
    }
  };

  // ── DB refresh all ─────────────────────────────────────────────────────────
  const refreshAll = async () => {
    if (!parcels.length) return;
    setRefreshingAll(true); setRefreshProgress(0);
    for (let i = 0; i < parcels.length; i++) {
      const p = parcels[i];
      try {
        const ep = p.courierType === "pathao" ? "/api/v1/admin/courier/pathao" : "/api/v1/admin/courier";
        await fetch(ep, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check_status", order_id: p.id }),
        });
      } catch {}
      setRefreshProgress(Math.round(((i + 1) / parcels.length) * 100));
      await new Promise((r) => setTimeout(r, 400));
    }
    await loadDb(dbFiltersRef.current);
    setRefreshingAll(false); setRefreshProgress(0);
  };

  // Pathao Live and Steadfast Live share the same UX scaffold (tabs, sub-cards,
  // pagination, search, archive toggle). DB tab is the only outlier.
  const isLive       = source === "pathao" || source === "steadfast";
  const currentPage  = isLive ? pathaoFilters.page : dbFilters.page;
  const totalPages   = isLive ? lastPage : Math.ceil(totalCount / DB_LIMIT);
  const goToPage     = (pg: number) => {
    if (isLive) applyPathaoFilters({ page: pg });
    else        applyDbFilters({ page: pg });
  };

  const activeTab = PATHAO_TABS.find((t) => t.id === pathaoFilters.tab)!;

  // ─── Stat card renderers ──────────────────────────────────────────────────
  function renderDbStats() {
    const s = stats as { total?: number; delivered?: number; returned?: number; inTransit?: number; pending?: number };
    const cards = [
      { icon: FiPackage,     label: lbl("Total Sent",  "মোট পাঠানো"),       val: s.total,     color: "bg-[var(--primary)]" },
      { icon: FiClock,       label: lbl("Pending",     "অপেক্ষমাণ"),         val: s.pending,   color: "bg-amber-500"        },
      { icon: FiTruck,       label: lbl("In Transit",  "ট্রানজিটে"),          val: s.inTransit, color: "bg-blue-500"         },
      { icon: FiCheckCircle, label: lbl("Delivered",   "ডেলিভারি হয়েছে"),    val: s.delivered, color: "bg-emerald-500"      },
      { icon: FiXCircle,     label: lbl("Returned",    "ফেরত এসেছে"),         val: s.returned,  color: "bg-red-500"          },
    ];
    return cards.map((c, i) => (
      <StatCard key={i} icon={c.icon} label={c.label} value={toBn(c.val ?? 0)} color={c.color} delay={i * 0.05} />
    ));
  }

  // Setting subFilter resets to page 1 and re-fetches. Clicking the same
  // filter again clears it (toggle behavior).
  const setSubFilter = (key: string) => {
    const next: PathaoFilters = {
      ...pathaoFiltersRef.current,
      subFilter: pathaoFiltersRef.current.subFilter === key ? "" : key,
      page: 1,
    };
    setPathaoFilters(next); pathaoFiltersRef.current = next;
    loadPathao(next);
  };
  const sub = pathaoFilters.subFilter;

  function renderActiveStats() {
    const s = stats as Record<string, number>;
    return [
      <StatCard key={0} icon={FiPackage}     label={lbl("Total Active",    "মোট সক্রিয়")}           value={toBn(s.total_orders ?? 0)}           color="bg-amber-500"   delay={0}     onClick={() => setSubFilter("")}          active={sub === ""}          />,
      <StatCard key={1} icon={FiClock}       label={lbl("Pending",         "পেন্ডিং")}               value={toBn(s.total_pending_orders ?? 0)}    color="bg-gray-400"    delay={0.05}  onClick={() => setSubFilter("pending")}    active={sub === "pending"}    />,
      <StatCard key={2} icon={FiTruck}       label={lbl("In Transit",      "ট্রানজিটে")}             value={toBn(s.in_transit ?? 0)}              color="bg-blue-500"    delay={0.1}   onClick={() => setSubFilter("in_transit")} active={sub === "in_transit"} />,
      <StatCard key={3} icon={FiPackage}     label={lbl("At Hub",          "হাবে আছে")}              value={toBn(s.at_delivery_hub ?? 0)}         color="bg-indigo-500"  delay={0.15}  onClick={() => setSubFilter("at_hub")}     active={sub === "at_hub"}     />,
      <StatCard key={4} icon={FiCheckCircle} label={lbl("Assigned",        "অ্যাসাইন হয়েছে")}        value={toBn(s.assigned_for_delivery ?? 0)}   color="bg-purple-500"  delay={0.2}   onClick={() => setSubFilter("assigned")}   active={sub === "assigned"}   />,
      <StatCard key={5} icon={FiDollarSign}  label={lbl("Collectable ৳",   "সংগ্রহযোগ্য")}           value={fmtCurrency(s.total_collectable_amount ?? 0)} color="bg-emerald-500" delay={0.25}  />,
    ];
  }

  function renderDeliveredStats() {
    const s = stats as Record<string, unknown>;
    return [
      <StatCard key={0} icon={FiPackage}     label={lbl("Total",           "মোট")}                   value={toBn(Number(s.total_orders ?? 0))}                  color="bg-emerald-500" delay={0}    onClick={() => setSubFilter("")}          active={sub === ""}          />,
      <StatCard key={1} icon={FiCheckCircle} label={lbl("Delivered",       "ডেলিভারি হয়েছে")}        value={`${toBn(Number(s.delivered ?? 0))} (${s.delivered_percentage ?? "0%"})`} color="bg-emerald-600" delay={0.05} onClick={() => setSubFilter("delivered")} active={sub === "delivered"} />,
      <StatCard key={2} icon={FiPackage}     label={lbl("Partial",         "আংশিক")}                 value={toBn(Number(s.partial_delivery ?? 0))}              color="bg-amber-500"   delay={0.1}  onClick={() => setSubFilter("partial")}   active={sub === "partial"}   />,
      <StatCard key={3} icon={FiRefreshCw}   label={lbl("Exchange",        "এক্সচেঞ্জ")}             value={toBn(Number(s.exchange ?? 0))}                      color="bg-blue-500"    delay={0.15} onClick={() => setSubFilter("exchange")}  active={sub === "exchange"}  />,
      <StatCard key={4} icon={FiDollarSign}  label={lbl("Total Collected ৳","মোট সংগৃহীত")}          value={fmtCurrency(Number(s.total_collected_amount ?? 0))} color="bg-indigo-500"  delay={0.2}  />,
    ];
  }

  function renderPartialStats() {
    const s = stats as Record<string, number>;
    return [
      <StatCard key={0} icon={FiPackage}     label={lbl("Partial Orders",  "আংশিক অর্ডার")}          value={toBn(s.total_orders ?? 0)}        color="bg-amber-500"   delay={0}    />,
      <StatCard key={1} icon={FiDollarSign}  label={lbl("Total COD ৳",     "মোট সিওডি")}             value={fmtCurrency(s.total_cod ?? 0)}    color="bg-emerald-500" delay={0.05} />,
      <StatCard key={2} icon={FiCheckCircle} label={lbl("Avg COD ৳",       "গড় সিওডি")}              value={fmtCurrency(s.avg_cod ?? 0)}      color="bg-indigo-500"  delay={0.1}  />,
    ];
  }

  function renderReturnedStats() {
    const s = stats as Record<string, number>;
    return [
      <StatCard key={0} icon={FiXCircle}     label={lbl("Returns Total",   "রিটার্ন মোট")}           value={toBn(s.returnTotal ?? 0)}        color="bg-red-500"     delay={0}    onClick={() => setSubFilter("")}             active={sub === ""}            />,
      <StatCard key={1} icon={FiArrowLeft}   label={lbl("Reverse Total",   "রিভার্স মোট")}           value={toBn(s.reverseTotal ?? 0)}       color="bg-orange-500"  delay={0.05} />,
      <StatCard key={2} icon={FiCheckCircle} label={lbl("Paid Returns",    "পরিশোধিত রিটার্ন")}      value={toBn(s.paidReturn ?? 0)}         color="bg-emerald-500" delay={0.1}  onClick={() => setSubFilter("paid_return")}  active={sub === "paid_return"} />,
      <StatCard key={3} icon={FiTruck}       label={lbl("In Progress",     "চলমান")}                  value={toBn(s.reverseInProgress ?? 0)}  color="bg-blue-500"    delay={0.15} onClick={() => setSubFilter("in_progress")}  active={sub === "in_progress"} />,
    ];
  }

  function renderPaidStats() {
    const s = stats as Record<string, number>;
    return [
      <StatCard key={0} icon={FiPackage}     label={lbl("Paid Orders",     "পরিশোধিত অর্ডার")}       value={toBn(s.total ?? 0)}                        color="bg-indigo-500"  delay={0}    />,
      <StatCard key={1} icon={FiDollarSign}  label={lbl("COD Collected",   "COD সংগৃহীত")}           value={fmtCurrency(s.totalCollected ?? 0)}        color="bg-emerald-600" delay={0.05} />,
      <StatCard key={2} icon={FiTruck}       label={lbl("Delivery Fees",   "ডেলিভারি চার্জ")}        value={fmtCurrency(s.totalFee ?? 0)}              color="bg-amber-500"   delay={0.1}  />,
      <StatCard key={3} icon={FiCheckCircle} label={lbl("Net Received",    "নেট পেমেন্ট")}           value={fmtCurrency(s.totalReceived ?? 0)}         color="bg-blue-500"    delay={0.15} />,
    ];
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title={lbl("Courier Monitor", "কুরিয়ার মনিটর")}>
      <div className="space-y-4">

        {/* ── Source Toggle ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => switchSource("database")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                source === "database" ? "bg-[var(--primary)] text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiDatabase className="w-4 h-4" />
              {lbl("Database", "ডেটাবেস")}
            </button>
            <button
              onClick={() => switchSource("pathao")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                source === "pathao" ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiWifi className="w-4 h-4" />
              Pathao Live
            </button>
            <button
              onClick={() => switchSource("steadfast")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                source === "steadfast" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiWifi className="w-4 h-4" />
              Steadfast Live
            </button>
          </div>
          {source === "pathao" && (
            <span className="text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5">
              {lbl("Live data from Pathao merchant portal", "Pathao মার্চেন্ট পোর্টাল থেকে সরাসরি ডেটা")}
            </span>
          )}
          {source === "steadfast" && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
              {lbl("Local Steadfast orders (refresh status from Steadfast API)", "লোকাল Steadfast অর্ডার (Steadfast API থেকে রিফ্রেশ)")}
            </span>
          )}
        </div>

        {/* ── Live Sub-Tabs (shared between Pathao Live and Steadfast Live) ── */}
        {isLive && (
          <div className="flex items-center gap-2 flex-wrap bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            {PATHAO_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => switchPathaoTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  pathaoFilters.tab === t.id ? t.activeClass : `border border-gray-200 bg-white ${t.inactiveClass}`
                }`}
              >
                {lbl(t.label, t.labelBn)}
              </button>
            ))}
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className={`grid gap-3 ${
          isLive && pathaoFilters.tab === "active"    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" :
          isLive && pathaoFilters.tab === "delivered" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" :
          "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"
        }`}>
          {!isLive                                          ? renderDbStats()       :
           pathaoFilters.tab === "active"                    ? renderActiveStats()   :
           pathaoFilters.tab === "delivered"                 ? renderDeliveredStats():
           pathaoFilters.tab === "partial"                   ? renderPartialStats()  :
           pathaoFilters.tab === "returned_reversed"         ? renderReturnedStats() :
                                                               renderPaidStats()     }
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          {!isLive ? (
            <div className="flex flex-wrap items-center gap-3">
              <DateRangePicker
                from={dbFilters.from} to={dbFilters.to}
                onChange={(f, t) => applyDbFilters({ from: f, to: t })}
              />
              <InlineSelect
                value={dbFilters.courier}
                onChange={(v) => applyDbFilters({ courier: v })}
                options={[
                  { value: "all",       label: lbl("All Couriers", "সব কুরিয়ার") },
                  { value: "steadfast", label: "Steadfast" },
                  { value: "pathao",    label: "Pathao" },
                ]}
              />
              <InlineSelect
                value={dbFilters.status}
                onChange={(v) => applyDbFilters({ status: v })}
                options={[
                  { value: "all",        label: lbl("All Statuses", "সব স্ট্যাটাস") },
                  { value: "pending",    label: lbl("Pending",      "অপেক্ষমাণ") },
                  { value: "in_transit", label: lbl("In Transit",   "ট্রানজিটে") },
                  { value: "delivered",  label: lbl("Delivered",    "ডেলিভারি হয়েছে") },
                  { value: "returned",   label: lbl("Returned",     "ফেরত") },
                ]}
              />
              <SearchBox
                value={searchInput} onChange={setSearchInput}
                placeholder={lbl("Name, phone, consignment ID…", "নাম, ফোন, কনসাইনমেন্ট…")}
                onSearch={() => applyDbFilters({ q: searchInput })}
                accentClass="border-[var(--primary)]"
                btnClass="bg-[var(--primary)] hover:opacity-90"
              />
              <button
                onClick={refreshAll} disabled={refreshingAll || !parcels.length}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <FiRefreshCw className={`w-4 h-4 ${refreshingAll ? "animate-spin" : ""}`} />
                {refreshingAll ? `${lbl("Refreshing", "আপডেট")} ${refreshProgress}%` : lbl("Refresh All", "সব আপডেট করুন")}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {/* Date range — anchors to order_created_at on Pathao parcels */}
              <DateRangePicker
                from={pathaoFilters.from} to={pathaoFilters.to}
                onChange={(f, t) => applyPathaoFilters({ from: f, to: t, page: 1 })}
              />
              {/* Archive toggle */}
              <InlineSelect
                value={pathaoFilters.archive}
                onChange={(v) => applyPathaoFilters({ archive: v })}
                options={[
                  { value: "0", label: lbl("Active",   "সক্রিয়") },
                  { value: "1", label: lbl("Archived", "আর্কাইভড") },
                ]}
              />
              <SearchBox
                value={searchInput} onChange={setSearchInput}
                placeholder={lbl("Name, phone, consignment ID…", "নাম, ফোন, কনসাইনমেন্ট…")}
                onSearch={() => applyPathaoFilters({ q: searchInput })}
                accentClass="border-orange-400"
                btnClass="bg-orange-500 hover:bg-orange-600"
              />
              <button
                onClick={() => loadPathao(pathaoFiltersRef.current)} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                {lbl("Refresh", "রিফ্রেশ")}
              </button>
            </div>
          )}
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <span className="text-sm font-semibold text-gray-700">
              {loading && !fetched
                ? lbl("Loading…", "লোড হচ্ছে…")
                : fetchError
                ? <span className="text-red-500 text-xs font-medium">{fetchError}</span>
                : `${toBn(totalCount)} ${lbl("parcels", "পার্সেল")}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1 || loading}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors">
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 px-1">{toBn(currentPage)} / {toBn(totalPages)}</span>
                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages || loading}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors">
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
                  {[40, 130, 160, 68, 72, 110, 90].map((w, c) => (
                    <div key={c} className="h-3 bg-gray-100 rounded" style={{ width: w }} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && fetchError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <FiXCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">{fetchError}</p>
              {source === "pathao" && (
                <p className="text-xs text-gray-400 max-w-sm">
                  {lbl("Make sure Pathao credentials are saved in Courier Settings. Token auto-refreshes.",
                        "কুরিয়ার সেটিংসে Pathao ক্রেডেনশিয়াল সেভ করুন। টোকেন স্বয়ংক্রিয়ভাবে রিফ্রেশ হবে।")}
                </p>
              )}
              <button onClick={() => isLive ? loadPathao(pathaoFiltersRef.current) : loadDb(dbFiltersRef.current)}
                className="mt-1 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors">
                {lbl("Try again", "আবার চেষ্টা করুন")}
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !fetchError && fetched && parcels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <FiPackage className="w-12 h-12 opacity-25" />
              <p className="text-sm font-medium">{lbl("No parcels found", "কোনো পার্সেল পাওয়া যায়নি")}</p>
            </div>
          )}

          {/* First-load placeholder */}
          {!loading && !fetchError && !fetched && (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              {lbl("Loading parcels…", "পার্সেল লোড হচ্ছে…")}
            </div>
          )}

          {/* ── Tables ── */}
          {!loading && !fetchError && parcels.length > 0 && (
            <div className="overflow-x-auto">
              {!isLive ? (
                <DbTable parcels={parcels} refreshingIds={refreshingIds} refreshingAll={refreshingAll}
                  copiedId={copiedId} copy={copy} onRefresh={refreshOne} lang={lang} lbl={lbl} />
              ) : pathaoFilters.tab === "returned_reversed" ? (
                <ReturnReverseTable parcels={parcels} copiedId={copiedId} copy={copy} lang={lang} lbl={lbl} />
              ) : pathaoFilters.tab === "paid_zero" ? (
                <PaidTable parcels={parcels} copiedId={copiedId} copy={copy} lang={lang} lbl={lbl} />
              ) : (
                <PathaoStandardTable parcels={parcels} copiedId={copiedId} copy={copy} lang={lang} lbl={lbl} />
              )}
            </div>
          )}

          {/* Bottom pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-xs text-gray-500">
                {lbl(
                  `Showing ${((currentPage - 1) * PATHAO_LIMIT) + 1}–${Math.min(currentPage * PATHAO_LIMIT, totalCount)} of ${totalCount}`,
                  `${toBn(((currentPage - 1) * PATHAO_LIMIT) + 1)}–${toBn(Math.min(currentPage * PATHAO_LIMIT, totalCount))} / ${toBn(totalCount)}`,
                )}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => goToPage(1)} disabled={currentPage === 1}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40">«</button>
                {Array.from({ length: Math.min(5, totalPages) },
                  (_, i) => Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                ).map((pn) => (
                  <button key={pn} onClick={() => goToPage(pn)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                      pn === currentPage
                        ? isLive ? `${activeTab.activeClass} border-transparent` : "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>
                    {toBn(pn)}
                  </button>
                ))}
                <button onClick={() => goToPage(totalPages)} disabled={currentPage >= totalPages}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40">»</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, color, delay, onClick, active,
}: {
  icon: React.ElementType; label: string; value: string; color: string; delay: number;
  onClick?: () => void;
  active?: boolean;
}) {
  const interactive = !!onClick;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      onClick={onClick}
      className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3 transition-all
        ${interactive ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""}
        ${active ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20" : "border-gray-100"}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold text-gray-800 leading-tight truncate">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5 truncate">{label}</div>
      </div>
    </motion.div>
  );
}

function SearchBox({ value, onChange, placeholder, onSearch, accentClass, btnClass }: {
  value: string; onChange: (v: string) => void;
  placeholder: string; onSearch: () => void;
  accentClass: string; btnClass: string;
}) {
  return (
    <div className="flex items-center gap-2 flex-1 min-w-[220px]">
      <div className="relative flex-1">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
          className={`w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:${accentClass}`} />
      </div>
      <button onClick={onSearch} className={`px-4 py-2 text-sm text-white rounded-xl transition-colors ${btnClass}`}>
        Search
      </button>
    </div>
  );
}

function ConsignmentCell({ consignmentId, copyKey, copiedId, copy, orange = false }: {
  consignmentId: string | null; copyKey: string; copiedId: string | null;
  copy: (t: string, k: string) => void; orange?: boolean;
}) {
  if (!consignmentId) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex items-center gap-1.5 group">
      <span className={`font-mono text-xs px-2 py-1 rounded-lg ${orange ? "bg-orange-50 text-orange-800 border border-orange-100" : "bg-gray-100 text-gray-700"}`}>
        {consignmentId}
      </span>
      <button onClick={() => copy(consignmentId, copyKey)} title="Copy"
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-all">
        {copiedId === copyKey ? <FiCheck className="w-3.5 h-3.5 text-emerald-500" /> : <FiCopy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function LocalOrderCell({ parcel, lang, lbl }: { parcel: CourierParcel; lang: string; lbl: (en: string, bn: string) => string }) {
  if (!parcel.id) return <span className="text-xs text-gray-400 italic">{lbl("No match", "মেলেনি")}</span>;
  return (
    <div className="flex items-center gap-1.5">
      <Link href={`/dashboard/orders/${parcel.id}`}
        className="text-xs text-[var(--primary)] font-semibold hover:underline flex items-center gap-1">
        #{toBn(parcel.id)} <FiExternalLink className="w-3 h-3 opacity-70" />
      </Link>
      {parcel.status && (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ORDER_STATUS_CLS[parcel.status] || "bg-gray-100 text-gray-600"}`}>
          {localStatusLabel(parcel.status, lang)}
        </span>
      )}
    </div>
  );
}

// ─── DB Table ─────────────────────────────────────────────────────────────────
function DbTable({ parcels, refreshingIds, refreshingAll, copiedId, copy, onRefresh, lang, lbl }: {
  parcels: CourierParcel[];
  refreshingIds: Set<number>;
  refreshingAll: boolean;
  copiedId: string | null;
  copy: (t: string, k: string) => void;
  onRefresh: (p: CourierParcel) => void;
  lang: string;
  lbl: (en: string, bn: string) => string;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
          <th className="px-4 py-3">#</th>
          <th className="px-4 py-3">{lbl("Customer", "গ্রাহক")}</th>
          <th className="px-4 py-3 hidden md:table-cell">{lbl("Address", "ঠিকানা")}</th>
          <th className="px-4 py-3">{lbl("Amount", "পরিমাণ")}</th>
          <th className="px-4 py-3">{lbl("Courier", "কুরিয়ার")}</th>
          <th className="px-4 py-3 hidden lg:table-cell">{lbl("Consignment", "কনসাইনমেন্ট")}</th>
          <th className="px-4 py-3">{lbl("Status", "স্ট্যাটাস")}</th>
          <th className="px-4 py-3 hidden lg:table-cell">{lbl("Sent", "পাঠানো")}</th>
          <th className="px-4 py-3">{lbl("Refresh", "আপডেট")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {parcels.map((p) => {
          const cb = courierBadge(p.courierStatus);
          const isRefreshing = p.id ? refreshingIds.has(p.id) : false;
          const copyKey = `db-${p.id}`;
          return (
            <tr key={`db-${p.id}`} className={`hover:bg-gray-50/50 transition-colors ${isRefreshing ? "opacity-60" : ""}`}>
              <td className="px-4 py-3">
                <Link href={`/dashboard/orders/${p.id}`} className="text-[var(--primary)] font-semibold hover:underline">
                  #{toBn(p.id ?? 0)}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-800 max-w-[140px] truncate">{p.customerName}</div>
                <a href={`tel:${p.customerPhone}`} className="text-xs text-[var(--primary)] hover:underline">{p.customerPhone}</a>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="text-xs text-gray-600 line-clamp-2 max-w-[180px]">{p.customerAddress}</div>
                {p.city && <div className="text-[11px] text-gray-400 font-medium mt-0.5">{p.city}</div>}
              </td>
              <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">৳{toBn(p.total)}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${p.courierType === "pathao" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                  {p.courierType === "pathao" ? "Pathao" : "Steadfast"}
                </span>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <ConsignmentCell consignmentId={p.consignmentId} copyKey={copyKey} copiedId={copiedId} copy={copy} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full w-fit whitespace-nowrap ${cb.cls}`}>{cb.label}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit whitespace-nowrap ${ORDER_STATUS_CLS[p.status ?? ""] || "bg-gray-100 text-gray-600"}`}>{localStatusLabel(p.status, lang)}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap hidden lg:table-cell">
                {p.courierSentAt ? new Date(p.courierSentAt).toLocaleDateString(lang === "en" ? "en-GB" : "bn-BD", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </td>
              <td className="px-4 py-3">
                <button onClick={() => onRefresh(p)} disabled={isRefreshing || refreshingAll} title="Refresh"
                  className="p-2 rounded-xl text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 transition-colors">
                  <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Pathao Standard Table (Active + Delivered) ───────────────────────────────
function PathaoStandardTable({ parcels, copiedId, copy, lang, lbl }: {
  parcels: CourierParcel[]; copiedId: string | null;
  copy: (t: string, k: string) => void;
  lang: string; lbl: (en: string, bn: string) => string;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold text-gray-500 bg-orange-50/60 border-b border-orange-100">
          <th className="px-4 py-3">{lbl("Consignment", "কনসাইনমেন্ট")}</th>
          <th className="px-4 py-3">{lbl("Recipient", "প্রাপক")}</th>
          <th className="px-4 py-3 hidden md:table-cell">{lbl("Address", "ঠিকানা")}</th>
          <th className="px-4 py-3">{lbl("Amount", "পরিমাণ")}</th>
          <th className="px-4 py-3">{lbl("Status", "স্ট্যাটাস")}</th>
          <th className="px-4 py-3">{lbl("Billing", "বিলিং")}</th>
          <th className="px-4 py-3 hidden lg:table-cell">{lbl("Local Order", "লোকাল অর্ডার")}</th>
          <th className="px-4 py-3 hidden lg:table-cell">{lbl("Date", "তারিখ")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {parcels.map((p, i) => {
          const cb = courierBadge(p.courierStatus);
          const billingCls = BILLING_STATUS_CLS[(p.billingStatus ?? "").toLowerCase()] || "bg-gray-100 text-gray-500";
          return (
            <tr key={i} className="hover:bg-orange-50/20 transition-colors">
              <td className="px-4 py-3">
                <ConsignmentCell consignmentId={p.consignmentId} copyKey={`live-${i}`} copiedId={copiedId} copy={copy} orange />
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-800 max-w-[140px] truncate">{p.customerName}</div>
                <a href={`tel:${p.customerPhone}`} className="text-xs text-orange-600 hover:underline">{p.customerPhone}</a>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="text-xs text-gray-600 line-clamp-2 max-w-[180px]">{p.customerAddress || "—"}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="font-bold text-gray-800">৳{toBn(p.total)}</div>
                {p.cashOnDelivery && <div className="text-[10px] text-emerald-600 font-medium">COD</div>}
              </td>
              <td className="px-4 py-3">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-block ${cb.cls}`}>{cb.label}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-block ${billingCls}`}>
                  {p.billingStatus || "—"}
                </span>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <LocalOrderCell parcel={p} lang={lang} lbl={lbl} />
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap hidden lg:table-cell">
                {p.createdAt ? new Date(p.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "bn-BD", { day: "2-digit", month: "short" }) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Return + Reverse Table ───────────────────────────────────────────────────
function ReturnReverseTable({ parcels, copiedId, copy, lang, lbl }: {
  parcels: CourierParcel[]; copiedId: string | null;
  copy: (t: string, k: string) => void;
  lang: string; lbl: (en: string, bn: string) => string;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold text-gray-500 bg-red-50/60 border-b border-red-100">
          <th className="px-4 py-3">{lbl("Type",        "ধরন")}</th>
          <th className="px-4 py-3">{lbl("Consignment", "কনসাইনমেন্ট")}</th>
          <th className="px-4 py-3">{lbl("Recipient",   "প্রাপক")}</th>
          <th className="px-4 py-3 hidden md:table-cell">{lbl("Address", "ঠিকানা")}</th>
          <th className="px-4 py-3">{lbl("Amount",      "পরিমাণ")}</th>
          <th className="px-4 py-3">{lbl("Status",      "স্ট্যাটাস")}</th>
          <th className="px-4 py-3">{lbl("Local Order", "লোকাল অর্ডার")}</th>
          <th className="px-4 py-3 hidden lg:table-cell">{lbl("Date", "তারিখ")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {parcels.map((p, i) => {
          const isBoth    = p.subtype === "both";
          const isReverse = p.subtype === "reversed";
          // For "both": return consignment is p.consignmentId,
          //             reverse consignment is p.reverseConsignmentId
          const retCb = courierBadge(p.courierStatus);
          const revCb = isBoth ? courierBadge(p.reverseCourierStatus ?? null) : null;

          return (
            <tr key={i} className={`transition-colors ${isBoth ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-red-50/20"}`}>

              {/* ── Type badge ── */}
              <td className="px-4 py-3 whitespace-nowrap align-top">
                {isBoth ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-red-100 text-red-700">
                      {lbl("Return", "রিটার্ন")}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-700">
                      {lbl("Reverse", "রিভার্স")}
                    </span>
                  </div>
                ) : (
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${isReverse ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                    {isReverse ? lbl("Reverse", "রিভার্স") : lbl("Return", "রিটার্ন")}
                  </span>
                )}
              </td>

              {/* ── Consignment(s) ── */}
              <td className="px-4 py-3 align-top">
                {isBoth ? (
                  <div className="flex flex-col gap-1.5">
                    <ConsignmentCell consignmentId={p.consignmentId}         copyKey={`rr-ret-${i}`} copiedId={copiedId} copy={copy} orange={false} />
                    <ConsignmentCell consignmentId={p.reverseConsignmentId ?? null} copyKey={`rr-rev-${i}`} copiedId={copiedId} copy={copy} orange />
                  </div>
                ) : (
                  <ConsignmentCell consignmentId={p.consignmentId} copyKey={`rr-${i}`} copiedId={copiedId} copy={copy} orange={isReverse} />
                )}
              </td>

              {/* ── Recipient ── */}
              <td className="px-4 py-3 align-top">
                <div className="font-medium text-gray-800 max-w-[130px] truncate">{p.customerName}</div>
                <a href={`tel:${p.customerPhone}`} className="text-xs text-red-600 hover:underline">{p.customerPhone}</a>
              </td>

              {/* ── Address ── */}
              <td className="px-4 py-3 hidden md:table-cell align-top">
                <div className="text-xs text-gray-600 line-clamp-2 max-w-[160px]">{p.customerAddress || "—"}</div>
              </td>

              {/* ── Amount ── */}
              <td className="px-4 py-3 whitespace-nowrap align-top">
                {p.total > 0 ? (
                  <span className="font-bold text-gray-800">৳{toBn(p.total)}</span>
                ) : (
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Zero COD</span>
                )}
              </td>

              {/* ── Status ── */}
              <td className="px-4 py-3 align-top">
                {isBoth ? (
                  <div className="flex flex-col gap-1">
                    {/* Return status */}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-block ${retCb.cls}`}>
                      {retCb.label}
                    </span>
                    {/* Reverse status */}
                    {revCb && (
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-block ${revCb.cls}`}>
                        {revCb.label}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-block ${retCb.cls}`}>
                    {retCb.label}
                  </span>
                )}
              </td>

              {/* ── Local Order ── */}
              <td className="px-4 py-3 align-top">
                <LocalOrderCell parcel={p} lang={lang} lbl={lbl} />
              </td>

              {/* ── Date ── */}
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap hidden lg:table-cell align-top">
                {p.createdAt ? new Date(p.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "bn-BD", { day: "2-digit", month: "short" }) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Paid Parcels Table (COD ৳0–৳150) ────────────────────────────────────────
function PaidTable({ parcels, copiedId, copy, lang, lbl }: {
  parcels: CourierParcel[]; copiedId: string | null;
  copy: (t: string, k: string) => void;
  lang: string; lbl: (en: string, bn: string) => string;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold text-gray-500 bg-indigo-50/60 border-b border-indigo-100">
          <th className="px-4 py-3">{lbl("Consignment", "কনসাইনমেন্ট")}</th>
          <th className="px-4 py-3">{lbl("Order ID",    "অর্ডার আইডি")}</th>
          <th className="px-4 py-3">{lbl("Recipient",   "প্রাপক")}</th>
          <th className="px-4 py-3 hidden md:table-cell">
            <span>{lbl("COD", "COD")}</span>
            <span className="ml-1 font-normal text-indigo-400">(৳0–150)</span>
          </th>
          <th className="px-4 py-3 hidden md:table-cell">{lbl("Del. Fee", "চার্জ")}</th>
          <th className="px-4 py-3">{lbl("Status",      "স্ট্যাটাস")}</th>
          <th className="px-4 py-3 hidden lg:table-cell">{lbl("Local Order", "লোকাল অর্ডার")}</th>
          <th className="px-4 py-3 hidden lg:table-cell">{lbl("Billed On",   "তারিখ")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {parcels.map((p, i) => {
          const cb = courierBadge(p.courierStatus);
          return (
            <tr key={i} className="hover:bg-indigo-50/20 transition-colors">
              <td className="px-4 py-3">
                <ConsignmentCell consignmentId={p.consignmentId} copyKey={`paid-${i}`} copiedId={copiedId} copy={copy} />
              </td>
              <td className="px-4 py-3">
                {p.merchantOrderId ? (
                  <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-100">
                    {p.merchantOrderId}
                  </span>
                ) : <span className="text-xs text-gray-400">N/A</span>}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-800 max-w-[130px] truncate">{p.customerName}</div>
                <a href={`tel:${p.customerPhone}`} className="text-xs text-indigo-600 hover:underline">{p.customerPhone}</a>
              </td>
              <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap hidden md:table-cell">
                {p.total > 0 ? `৳${toBn(p.total)}` : <span className="text-xs text-gray-400 font-normal">Zero</span>}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap hidden md:table-cell">
                ৳{p.deliveryFee ?? 0}
                {(p.codFee ?? 0) > 0 && <span className="text-gray-400"> +৳{p.codFee}</span>}
              </td>
              <td className="px-4 py-3">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-block ${cb.cls}`}>{cb.label}</span>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <LocalOrderCell parcel={p} lang={lang} lbl={lbl} />
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap hidden lg:table-cell">
                {p.billingDate
                  ? new Date(p.billingDate).toLocaleDateString(lang === "en" ? "en-GB" : "bn-BD", { day: "2-digit", month: "short" })
                  : p.createdAt
                  ? new Date(p.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "bn-BD", { day: "2-digit", month: "short" })
                  : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
