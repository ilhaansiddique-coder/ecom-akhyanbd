"use client";

/**
 * Spam Detection — customer-centric rebuild.
 *
 * 3 tabs:
 *   1. Customers — phone-grouped table with aggregates + drawer trace
 *   2. Flagged Orders — order rows with risk_score >= 30
 *   3. Block Lists — phones / IPs / devices CRUD side by side
 *
 * Top stat cards summarize blocked counts + high-risk indicator.
 * Search bar at top searches phone/name/email across the API.
 */

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLang } from "@/lib/LanguageContext";
import { api } from "@/lib/api";
import {
  FiAlertTriangle, FiSlash, FiSearch, FiUser, FiPhone, FiMonitor, FiGlobe,
  FiChevronRight, FiX, FiRefreshCw, FiPlus, FiTrash2, FiShield, FiPackage, FiClock,
} from "react-icons/fi";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomerRow {
  phone: string;
  names: string[];
  emails: string[];
  totalOrders: number;
  cancelledOrders: number;
  fakeOrders: number;
  totalRevenue: number;
  avgRisk: number;
  maxRisk: number;
  ipCount: number;
  deviceCount: number;
  firstOrderAt: string;
  lastOrderAt: string;
  blocked: boolean;
  blockedReason: string | null;
  cancelRate: number;
}

interface TraceOrder {
  id: number;
  customer_name: string;
  customer_address: string | null;
  city: string | null;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  risk_score: number;
  courier_sent: boolean;
  consignment_id: string | null;
  courier_status: string | null;
  created_at: string | null;
  fingerprint?: {
    fp_hash: string;
    ip_address: string | null;
    risk_flags: string | null;
    fill_duration_ms: number | null;
    mouse_movements: number | null;
    paste_detected: boolean;
    honeypot_triggered: boolean;
  } | null;
}

interface TraceIp { ip: string; first_seen: string; last_seen: string; order_count: number; blocked: boolean; blocked_reason: string | null; }
interface TraceDevice {
  fp_hash: string; first_seen: string; last_seen: string; order_count: number;
  platform: string | null; user_agent: string | null; screen: string | null;
  seen_count: number; risk_score: number; blocked: boolean; blocked_reason: string | null;
}
interface CustomerTrace {
  phone: string;
  summary: { totalOrders: number; cancelledOrders: number; fakeOrders: number; totalRevenue: number; uniqueIps: number; uniqueDevices: number; maxRisk: number; blocked: boolean; blockedReason: string | null };
  orders: TraceOrder[];
  ips: TraceIp[];
  devices: TraceDevice[];
}
interface FlaggedOrder {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  city: string;
  total: number;
  status: string;
  risk_score: number;
  fp_hash: string;
  created_at: string;
  fingerprint?: { risk_flags: string; ip_address: string; paste_detected: boolean; honeypot_triggered: boolean; fill_duration_ms: number; mouse_movements: number; };
}
interface BlockedPhone { id: number; phone: string; reason: string; created_at: string; }
interface BlockedIp { id: number; ip_address: string; reason: string; created_at: string; }
interface BlockedDevice { id: number; fp_hash: string; block_reason: string; blocked_at: string | null; }

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtBDT = (n: number) => `৳${(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const fmtDate = (iso: string | null) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString(); } catch { return iso; } };
function riskColor(n: number): string {
  if (n >= 70) return "bg-red-100 text-red-700";
  if (n >= 40) return "bg-orange-100 text-orange-700";
  if (n >= 20) return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}
function statusColor(s: string): string {
  switch (s) {
    case "delivered": return "bg-green-100 text-green-700";
    case "shipped":   return "bg-blue-100 text-blue-700";
    case "confirmed": return "bg-indigo-100 text-indigo-700";
    case "cancelled": return "bg-red-100 text-red-700";
    case "trashed":   return "bg-gray-200 text-gray-700";
    default:          return "bg-gray-100 text-gray-600";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SpamClient() {
  const { lang } = useLang();
  const t = (en: string, bn: string) => (lang === "en" ? en : bn);

  const [tab, setTab] = useState<"customers" | "flagged" | "blocklists">("customers");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => { const h = setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => clearTimeout(h); }, [search]);

  // Customers tab state
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [filter, setFilter] = useState<"none" | "blocked" | "high_risk">("none");
  const [sort, setSort] = useState<"risk" | "cancelled" | "orders" | "recent">("risk");
  const [page, setPage] = useState(1);

  const loadCustomers = async () => {
    setCustomersLoading(true);
    try {
      const qs = new URLSearchParams({ ...(debouncedSearch ? { q: debouncedSearch } : {}), sort, filter, page: String(page) });
      const res = await api.admin.getSpamCustomers(qs.toString()) as { items: CustomerRow[]; total: number };
      setCustomers(res.items || []); setCustomersTotal(res.total || 0);
    } catch (e) { console.error(e); }
    finally { setCustomersLoading(false); }
  };
  useEffect(() => { if (tab === "customers") loadCustomers(); /* eslint-disable-next-line */ }, [tab, debouncedSearch, sort, filter, page]);

  // Flagged orders state
  const [flagged, setFlagged] = useState<FlaggedOrder[]>([]);
  const [flaggedLoading, setFlaggedLoading] = useState(false);
  const loadFlagged = async () => {
    setFlaggedLoading(true);
    try {
      const res = await api.admin.getSpamFlaggedOrders("page=1") as { data?: FlaggedOrder[]; items?: FlaggedOrder[] };
      setFlagged(res.data || res.items || []);
    } catch (e) { console.error(e); }
    finally { setFlaggedLoading(false); }
  };
  useEffect(() => { if (tab === "flagged") loadFlagged(); }, [tab]);

  // Block lists state
  const [bPhones, setBPhones] = useState<BlockedPhone[]>([]);
  const [bIps, setBIps] = useState<BlockedIp[]>([]);
  const [bDevs, setBDevs] = useState<BlockedDevice[]>([]);
  const loadBlocklists = async () => {
    try {
      const [phoneRes, ipRes, devRes] = await Promise.all([
        api.admin.getBlockedPhones() as Promise<BlockedPhone[] | { data: BlockedPhone[] }>,
        api.admin.getBlockedIps() as Promise<BlockedIp[] | { data: BlockedIp[] }>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.admin as any).getSpamDevices?.("status=blocked") as Promise<{ data?: any[]; items?: any[] }> | undefined,
      ]);
      setBPhones(Array.isArray(phoneRes) ? phoneRes : ((phoneRes as { data?: BlockedPhone[] }).data || []));
      setBIps(Array.isArray(ipRes) ? ipRes : ((ipRes as { data?: BlockedIp[] }).data || []));
      const dRows = (devRes && (devRes.data || devRes.items)) || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setBDevs(dRows.map((d: any) => ({ id: d.id, fp_hash: d.fp_hash || d.fpHash, block_reason: d.block_reason || d.blockReason || "", blocked_at: d.blocked_at || d.blockedAt || null })));
    } catch (e) { console.error(e); }
  };
  useEffect(() => { if (tab === "blocklists") loadBlocklists(); }, [tab]);
  // Always refresh blocklists once on mount so stat cards have real numbers.
  useEffect(() => { loadBlocklists(); /* eslint-disable-next-line */ }, []);

  // Drawer state — picked customer trace
  const [tracePhone, setTracePhone] = useState<string | null>(null);
  const [trace, setTrace] = useState<CustomerTrace | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const reloadTrace = async (phone: string) => {
    setTraceLoading(true);
    try {
      const res = await api.admin.getSpamCustomerTrace(phone) as CustomerTrace;
      setTrace(res);
    } catch (e) { console.error(e); }
    finally { setTraceLoading(false); }
  };
  useEffect(() => {
    if (!tracePhone) { setTrace(null); return; }
    reloadTrace(tracePhone);
  }, [tracePhone]);

  // Top stat counts
  const stats = useMemo(() => ({
    blockedPhones: bPhones.length,
    blockedIps: bIps.length,
    blockedDevices: bDevs.length,
    highRisk: customers.filter((c) => c.maxRisk >= 50 || c.cancelRate >= 50).length,
  }), [bPhones, bIps, bDevs, customers]);

  // Block actions
  const blockPhoneRow = async (phone: string, reason: string) => {
    await api.admin.addBlockedPhone({ phone, reason });
    if (tab === "customers") loadCustomers();
    loadBlocklists();
    if (tracePhone === phone) reloadTrace(phone);
  };
  const unblockPhone = async (id: number) => {
    if (!confirm(t("Unblock this phone?", "এই ফোন আনব্লক করবেন?"))) return;
    await api.admin.deleteBlockedPhone(id);
    loadBlocklists(); if (tab === "customers") loadCustomers();
  };
  const unblockIp = async (id: number) => {
    if (!confirm(t("Unblock this IP?", "এই আইপি আনব্লক করবেন?"))) return;
    await api.admin.deleteBlockedIp(id); loadBlocklists();
  };
  const unblockDevice = async (id: number) => {
    if (!confirm(t("Unblock this device?", "এই ডিভাইস আনব্লক করবেন?"))) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (api.admin as any).updateSpamDevice(id, { status: "active", block_reason: null });
    loadBlocklists();
  };

  // Bulk: block all from drawer
  const blockAllFromTrace = async () => {
    if (!trace) return;
    const reason = prompt(t("Reason for blocking?", "ব্লক করার কারণ?"), "fake_order") || "fake_order";
    // Simpler: call the order-id block endpoint on the most-recent order to atomically ban all 3 angles.
    if (trace.orders.length > 0) {
      const orderId = trace.orders[0].id;
      try { await api.admin.blockOrderCustomer(orderId, reason); } catch {}
    } else {
      // No orders? Just block the phone.
      await api.admin.addBlockedPhone({ phone: trace.phone, reason });
    }
    // Sweep stragglers — block any remaining IPs/devices from older orders
    for (const ip of trace.ips.filter((x) => !x.blocked)) {
      await api.admin.addBlockedIp({ ip_address: ip.ip, reason }).catch(() => {});
    }
    reloadTrace(trace.phone); loadBlocklists();
    if (tab === "customers") loadCustomers();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title={t("Spam & Fraud Control", "স্প্যাম ও জালিয়াতি নিয়ন্ত্রণ")}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiShield className="w-6 h-6 text-[var(--primary)]" />
              {t("Spam & Fraud Control", "স্প্যাম ও জালিয়াতি নিয়ন্ত্রণ")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("Trace any customer by orders, IPs, devices. Block by every angle.",
                 "অর্ডার, আইপি, ডিভাইস দিয়ে যেকোনো কাস্টমার ট্রেস করুন। সব দিক থেকে ব্লক করুন।")}
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t("Phone, name, or email...", "ফোন, নাম, ইমেইল...") }
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[var(--primary)] focus:outline-none bg-white"
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<FiPhone />} label={t("Blocked Phones", "ব্লক ফোন")} value={stats.blockedPhones} color="text-red-600" />
          <StatCard icon={<FiGlobe />} label={t("Blocked IPs", "ব্লক আইপি")} value={stats.blockedIps} color="text-orange-600" />
          <StatCard icon={<FiMonitor />} label={t("Blocked Devices", "ব্লক ডিভাইস")} value={stats.blockedDevices} color="text-amber-600" />
          <StatCard icon={<FiAlertTriangle />} label={t("High-risk Customers", "উচ্চ ঝুঁকি")} value={stats.highRisk} color="text-yellow-600" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          <TabBtn active={tab === "customers"} onClick={() => setTab("customers")}>
            <FiUser className="w-4 h-4" /> {t("Customers", "কাস্টমার")}
          </TabBtn>
          <TabBtn active={tab === "flagged"} onClick={() => setTab("flagged")}>
            <FiAlertTriangle className="w-4 h-4" /> {t("Flagged Orders", "চিহ্নিত অর্ডার")}
          </TabBtn>
          <TabBtn active={tab === "blocklists"} onClick={() => setTab("blocklists")}>
            <FiSlash className="w-4 h-4" /> {t("Block Lists", "ব্লক তালিকা")}
          </TabBtn>
        </div>

        {/* Tab body */}
        {tab === "customers" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <span className="text-gray-500">{t("Filter:", "ফিল্টার:")}</span>
              <FilterChip active={filter === "none"} onClick={() => { setFilter("none"); setPage(1); }}>{t("All", "সব")}</FilterChip>
              <FilterChip active={filter === "high_risk"} onClick={() => { setFilter("high_risk"); setPage(1); }}>{t("High Risk", "উচ্চ ঝুঁকি")}</FilterChip>
              <FilterChip active={filter === "blocked"} onClick={() => { setFilter("blocked"); setPage(1); }}>{t("Blocked", "ব্লক")}</FilterChip>
              <span className="ml-3 text-gray-500">{t("Sort:", "সর্ট:")}</span>
              <select value={sort} onChange={(e) => { setSort(e.target.value as "risk" | "cancelled" | "orders" | "recent"); setPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1 bg-white text-xs">
                <option value="risk">{t("Risk score", "ঝুঁকি স্কোর")}</option>
                <option value="cancelled">{t("Cancellations", "বাতিল")}</option>
                <option value="orders">{t("Total orders", "মোট অর্ডার")}</option>
                <option value="recent">{t("Most recent", "সাম্প্রতিক")}</option>
              </select>
              <button onClick={loadCustomers} className="ml-auto p-2 text-gray-500 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg" title="Refresh">
                <FiRefreshCw className={`w-4 h-4 ${customersLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-left text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{t("Customer", "কাস্টমার")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("Orders", "অর্ডার")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("Cancel %", "বাতিল %")}</th>
                      <th className="px-4 py-3 font-semibold">{t("IPs / Devices", "আইপি / ডিভাইস")}</th>
                      <th className="px-4 py-3 font-semibold">{t("Risk", "ঝুঁকি")}</th>
                      <th className="px-4 py-3 font-semibold">{t("Last Order", "শেষ অর্ডার")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("Action", "অ্যাকশন")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {customersLoading && <tr><td colSpan={7} className="py-12 text-center text-gray-400">{t("Loading...", "লোড হচ্ছে...")}</td></tr>}
                    {!customersLoading && customers.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-400">{t("No customers found.", "কোনো কাস্টমার নেই।")}</td></tr>}
                    {!customersLoading && customers.map((c) => (
                      <tr key={c.phone} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => setTracePhone(c.phone)}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{c.names[0] || t("(no name)", "(নাম নেই)")}</div>
                          <div className="text-xs text-gray-500 font-mono">{c.phone}</div>
                          {c.blocked && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold mt-1 inline-block">
                              {t("BLOCKED", "ব্লক")}{c.blockedReason ? ` · ${c.blockedReason}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{c.totalOrders}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded ${c.cancelRate >= 50 ? "bg-red-100 text-red-700" : c.cancelRate >= 20 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                            {c.cancelRate}% ({c.cancelledOrders})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <FiGlobe className="inline w-3 h-3 mr-1" />{c.ipCount} · <FiMonitor className="inline w-3 h-3 mr-1 ml-2" />{c.deviceCount}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${riskColor(c.maxRisk)}`}>max {c.maxRisk}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.lastOrderAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={(e) => { e.stopPropagation(); setTracePhone(c.phone); }}
                            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                            {t("Trace", "ট্রেস")} <FiChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {customersTotal > 25 && (
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>{t("Showing", "দেখানো হচ্ছে")} {(page - 1) * 25 + 1}–{Math.min(page * 25, customersTotal)} {t("of", "এর মধ্যে")} {customersTotal}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">←</button>
                  <button disabled={page * 25 >= customersTotal} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">→</button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "flagged" && (
          <FlaggedOrdersPanel orders={flagged} loading={flaggedLoading} reload={loadFlagged}
            onTrace={(phone) => { setTab("customers"); setTracePhone(phone); }} />
        )}

        {tab === "blocklists" && (
          <BlocklistsPanel
            phones={bPhones} ips={bIps} devices={bDevs}
            onUnblockPhone={unblockPhone} onUnblockIp={unblockIp} onUnblockDevice={unblockDevice}
            onAddPhone={async (p, r) => { await blockPhoneRow(p, r); }}
            onAddIp={async (ip, r) => { await api.admin.addBlockedIp({ ip_address: ip, reason: r }); loadBlocklists(); }}
            reload={loadBlocklists}
          />
        )}
      </div>

      {tracePhone && (
        <TraceDrawer phone={tracePhone} trace={trace} loading={traceLoading}
          onClose={() => setTracePhone(null)} onBlockAll={blockAllFromTrace} />
      )}
    </DashboardLayout>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl ${color}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 truncate">{label}</div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${active ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
      {children}
    </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-lg border ${active ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
      {children}
    </button>
  );
}

function TraceDrawer({ phone, trace, loading, onClose, onBlockAll }: {
  phone: string; trace: CustomerTrace | null; loading: boolean; onClose: () => void; onBlockAll: () => Promise<void>;
}) {
  const { lang } = useLang();
  const t = (en: string, bn: string) => (lang === "en" ? en : bn);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <div className="text-xs text-gray-500">{t("Customer trace", "কাস্টমার ট্রেস")}</div>
            <div className="font-mono font-semibold text-gray-900">{phone}</div>
          </div>
          <div className="flex items-center gap-2">
            {trace && !trace.summary.blocked && (
              <button onClick={onBlockAll} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center gap-1.5">
                <FiSlash className="w-3.5 h-3.5" /> {t("Block all", "সব ব্লক")}
              </button>
            )}
            {trace?.summary.blocked && (
              <span className="text-xs px-2.5 py-1 rounded bg-red-100 text-red-700 font-semibold">{t("BLOCKED", "ব্লক")}</span>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button>
          </div>
        </div>

        {loading && <div className="p-8 text-center text-gray-400">{t("Loading...", "লোড হচ্ছে...")}</div>}

        {trace && !loading && (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <KV label={t("Total orders", "মোট অর্ডার")} value={String(trace.summary.totalOrders)} />
              <KV label={t("Cancelled", "বাতিল")} value={`${trace.summary.cancelledOrders}`} danger={trace.summary.cancelledOrders > 0} />
              <KV label={t("Trashed", "ট্র্যাশ")} value={`${trace.summary.fakeOrders}`} danger={trace.summary.fakeOrders > 0} />
              <KV label={t("Total revenue", "মোট আয়")} value={fmtBDT(trace.summary.totalRevenue)} />
              <KV label={t("Unique IPs", "অনন্য আইপি")} value={String(trace.summary.uniqueIps)} />
              <KV label={t("Unique devices", "অনন্য ডিভাইস")} value={String(trace.summary.uniqueDevices)} />
              <KV label={t("Max risk", "সর্বোচ্চ ঝুঁকি")} value={String(trace.summary.maxRisk)} danger={trace.summary.maxRisk >= 50} />
            </div>

            <Section icon={<FiGlobe />} title={t(`IP Addresses (${trace.ips.length})`, `আইপি অ্যাড্রেস (${trace.ips.length})`)}>
              {trace.ips.length === 0 && <p className="text-xs text-gray-400">{t("No IPs recorded.", "কোনো আইপি নেই।")}</p>}
              <div className="space-y-2">
                {trace.ips.map((ip) => (
                  <div key={ip.ip} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-medium text-gray-800">{ip.ip}</div>
                      <div className="text-gray-500">{ip.order_count} {t("orders", "অর্ডার")} · {fmtDate(ip.first_seen)} → {fmtDate(ip.last_seen)}</div>
                    </div>
                    {ip.blocked
                      ? <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">{t("BLOCKED", "ব্লক")}</span>
                      : <button onClick={async () => { await api.admin.addBlockedIp({ ip_address: ip.ip, reason: "manual_block_from_trace" }); }}
                          className="text-[10px] px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700">{t("Block", "ব্লক")}</button>}
                  </div>
                ))}
              </div>
            </Section>

            <Section icon={<FiMonitor />} title={t(`Devices (${trace.devices.length})`, `ডিভাইস (${trace.devices.length})`)}>
              {trace.devices.length === 0 && <p className="text-xs text-gray-400">{t("No devices recorded.", "কোনো ডিভাইস নেই।")}</p>}
              <div className="space-y-2">
                {trace.devices.map((d) => (
                  <div key={d.fp_hash} className="p-2.5 bg-gray-50 rounded-lg text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-[11px] text-gray-700 truncate">{d.fp_hash.slice(0, 16)}…</div>
                      {d.blocked && <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold shrink-0">{t("BLOCKED", "ব্লক")}</span>}
                    </div>
                    <div className="text-gray-500 mt-1">{d.platform || "?"}{d.screen ? ` · ${d.screen}` : ""}</div>
                    {d.user_agent && <div className="text-gray-400 mt-1 truncate" title={d.user_agent}>{d.user_agent}</div>}
                    <div className="text-gray-500 mt-1">{d.order_count} {t("orders", "অর্ডার")} · {t("seen", "দেখা")} {d.seen_count}× · {t("risk", "ঝুঁকি")} {d.risk_score}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section icon={<FiPackage />} title={t(`Orders (${trace.orders.length})`, `অর্ডার (${trace.orders.length})`)}>
              <div className="space-y-2">
                {trace.orders.map((o) => (
                  <div key={o.id} className="p-3 bg-gray-50 rounded-lg text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <span className="font-semibold text-gray-800">#{o.id}</span>
                        <span className="text-gray-500 ml-2">{o.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusColor(o.status)}`}>{o.status}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${riskColor(o.risk_score)}`}>risk {o.risk_score}</span>
                        <span className="font-bold text-[var(--primary)]">{fmtBDT(o.total)}</span>
                      </div>
                    </div>
                    <div className="text-gray-500 mt-1 truncate">{o.customer_address}{o.city ? `, ${o.city}` : ""}</div>
                    {o.fingerprint?.risk_flags && <div className="text-[10px] text-red-600 mt-1">⚑ {o.fingerprint.risk_flags}</div>}
                    <div className="text-[10px] text-gray-400 mt-1">
                      <FiClock className="inline w-3 h-3 mr-0.5" />{fmtDate(o.created_at)}
                      {o.consignment_id && ` · ${o.consignment_id}`}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function KV({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`p-2.5 rounded-lg ${danger ? "bg-red-50" : "bg-gray-50"}`}>
      <div className="text-[10px] text-gray-500 uppercase">{label}</div>
      <div className={`font-bold ${danger ? "text-red-700" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <span className="text-[var(--primary)]">{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function FlaggedOrdersPanel({ orders, loading, reload, onTrace }: {
  orders: FlaggedOrder[]; loading: boolean; reload: () => void; onTrace: (phone: string) => void;
}) {
  const { lang } = useLang();
  const t = (en: string, bn: string) => (lang === "en" ? en : bn);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">{t("Flagged Orders (risk ≥ 30)", "চিহ্নিত অর্ডার (ঝুঁকি ≥ ৩০)")}</h3>
        <button onClick={reload} className="p-1.5 text-gray-500 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg">
          <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left text-xs uppercase">
            <tr>
              <th className="px-4 py-3">{t("Order", "অর্ডার")}</th>
              <th className="px-4 py-3">{t("Customer", "কাস্টমার")}</th>
              <th className="px-4 py-3">{t("IP", "আইপি")}</th>
              <th className="px-4 py-3">{t("Risk", "ঝুঁকি")}</th>
              <th className="px-4 py-3">{t("Flags", "ফ্ল্যাগ")}</th>
              <th className="px-4 py-3 text-right">{t("Action", "অ্যাকশন")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && <tr><td colSpan={6} className="py-8 text-center text-gray-400">{t("Loading...", "লোড হচ্ছে...")}</td></tr>}
            {!loading && orders.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">{t("No flagged orders.", "কোনো চিহ্নিত অর্ডার নেই।")}</td></tr>}
            {!loading && orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium text-gray-700">#{o.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{o.customer_name}</div>
                  <div className="text-xs text-gray-500 font-mono">{o.customer_phone}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{o.fingerprint?.ip_address || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${riskColor(o.risk_score)}`}>{o.risk_score}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={o.fingerprint?.risk_flags}>
                  {o.fingerprint?.risk_flags || "—"}
                </td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => onTrace(o.customer_phone)} className="text-xs text-blue-600 hover:underline">{t("Trace", "ট্রেস")}</button>
                  <button onClick={async () => {
                    if (!confirm(t("Block this customer (phone + IP + device)?", "এই কাস্টমারকে ব্লক করবেন?"))) return;
                    await api.admin.blockOrderCustomer(o.id, "flagged_high_risk");
                    reload();
                  }}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">{t("Block", "ব্লক")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlocklistsPanel({
  phones, ips, devices, onUnblockPhone, onUnblockIp, onUnblockDevice, onAddPhone, onAddIp, reload,
}: {
  phones: BlockedPhone[]; ips: BlockedIp[]; devices: BlockedDevice[];
  onUnblockPhone: (id: number) => Promise<void>;
  onUnblockIp: (id: number) => Promise<void>;
  onUnblockDevice: (id: number) => Promise<void>;
  onAddPhone: (phone: string, reason: string) => Promise<void>;
  onAddIp: (ip: string, reason: string) => Promise<void>;
  reload: () => void;
}) {
  const { lang } = useLang();
  const t = (en: string, bn: string) => (lang === "en" ? en : bn);
  const [newPhone, setNewPhone] = useState(""); const [newPhoneReason, setNewPhoneReason] = useState("");
  const [newIp, setNewIp] = useState(""); const [newIpReason, setNewIpReason] = useState("");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><FiPhone className="text-[var(--primary)]" /> {t(`Phones (${phones.length})`, `ফোন (${phones.length})`)}</h3>
          <button onClick={reload} className="p-1.5 text-gray-400 hover:text-[var(--primary)] rounded"><FiRefreshCw className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex gap-2">
          <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="01XXXXXXXXX" className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono" />
          <input value={newPhoneReason} onChange={(e) => setNewPhoneReason(e.target.value)} placeholder={t("reason", "কারণ")} className="w-24 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs" />
          <button onClick={async () => { if (!newPhone.trim()) return; await onAddPhone(newPhone.trim(), newPhoneReason || "manual_block"); setNewPhone(""); setNewPhoneReason(""); }}
            className="px-2.5 py-1.5 bg-[var(--primary)] text-white text-xs rounded-lg hover:bg-[var(--primary-light)]"><FiPlus className="w-3 h-3" /></button>
        </div>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {phones.length === 0 && <p className="text-xs text-gray-400 text-center py-4">{t("No blocked phones.", "কোনো ব্লক ফোন নেই।")}</p>}
          {phones.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
              <div className="min-w-0">
                <div className="font-mono font-medium text-gray-800">{p.phone}</div>
                <div className="text-gray-500 truncate">{p.reason}</div>
              </div>
              <button onClick={() => onUnblockPhone(p.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><FiTrash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><FiGlobe className="text-[var(--primary)]" /> {t(`IPs (${ips.length})`, `আইপি (${ips.length})`)}</h3>
          <button onClick={reload} className="p-1.5 text-gray-400 hover:text-[var(--primary)] rounded"><FiRefreshCw className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex gap-2">
          <input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="1.2.3.4" className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono" />
          <input value={newIpReason} onChange={(e) => setNewIpReason(e.target.value)} placeholder={t("reason", "কারণ")} className="w-24 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs" />
          <button onClick={async () => { if (!newIp.trim()) return; await onAddIp(newIp.trim(), newIpReason || "manual_block"); setNewIp(""); setNewIpReason(""); }}
            className="px-2.5 py-1.5 bg-[var(--primary)] text-white text-xs rounded-lg hover:bg-[var(--primary-light)]"><FiPlus className="w-3 h-3" /></button>
        </div>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {ips.length === 0 && <p className="text-xs text-gray-400 text-center py-4">{t("No blocked IPs.", "কোনো ব্লক আইপি নেই।")}</p>}
          {ips.map((ip) => (
            <div key={ip.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
              <div className="min-w-0">
                <div className="font-mono font-medium text-gray-800">{ip.ip_address}</div>
                <div className="text-gray-500 truncate">{ip.reason}</div>
              </div>
              <button onClick={() => onUnblockIp(ip.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><FiTrash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><FiMonitor className="text-[var(--primary)]" /> {t(`Devices (${devices.length})`, `ডিভাইস (${devices.length})`)}</h3>
          <button onClick={reload} className="p-1.5 text-gray-400 hover:text-[var(--primary)] rounded"><FiRefreshCw className="w-3.5 h-3.5" /></button>
        </div>
        <p className="text-[10px] text-gray-400">{t("Add devices via Trace drawer or Flagged Orders.", "ট্রেস বা চিহ্নিত অর্ডার থেকে যোগ করুন।")}</p>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {devices.length === 0 && <p className="text-xs text-gray-400 text-center py-4">{t("No blocked devices.", "কোনো ব্লক ডিভাইস নেই।")}</p>}
          {devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
              <div className="min-w-0">
                <div className="font-mono font-medium text-gray-800 truncate">{d.fp_hash.slice(0, 18)}…</div>
                <div className="text-gray-500 truncate">{d.block_reason || "—"}</div>
              </div>
              <button onClick={() => onUnblockDevice(d.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><FiTrash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
