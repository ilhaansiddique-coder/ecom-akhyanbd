"use client";

import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLang } from "@/lib/LanguageContext";
import { api } from "@/lib/api";
import { theme } from "@/lib/theme";
import { FLAG_LABELS } from "@/lib/spamDetection";
import { FiShield, FiAlertTriangle, FiXCircle, FiCheckCircle, FiTrash2, FiEye, FiPlus, FiSearch, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "flagged" | "devices" | "ips";

interface FlaggedOrder {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  city: string;
  total: number;
  status: string;
  fp_hash: string;
  risk_score: number;
  created_at: string;
  fingerprint?: {
    risk_flags: string;
    fill_duration_ms: number;
    mouse_movements: number;
    paste_detected: boolean;
    honeypot_triggered: boolean;
    ip_address: string;
    device_fingerprint?: {
      id: number;
      fp_hash: string;
      platform: string;
      screen_resolution: string;
      status: string;
    };
  };
}

interface Device {
  id: number;
  fp_hash: string;
  canvas_hash: string;
  webgl_hash: string;
  audio_hash: string;
  screen_resolution: string;
  platform: string;
  timezone: string;
  languages: string;
  cpu_cores: number;
  memory_gb: number;
  touch_points: number;
  user_agent: string;
  last_ip: string;
  risk_score: number;
  status: string;
  seen_count: number;
  block_reason: string;
  blocked_at: string;
  last_seen_at: string;
  created_at: string;
  orderCount?: number;
  order_fingerprints?: {
    id: number;
    fill_duration_ms: number;
    mouse_movements: number;
    paste_detected: boolean;
    honeypot_triggered: boolean;
    ip_address: string;
    risk_score: number;
    risk_flags: string;
    created_at: string;
    order: {
      id: number;
      customer_name: string;
      customer_phone: string;
      customer_address: string;
      city: string;
      total: number;
      status: string;
      payment_method: string;
      created_at: string;
    };
  }[];
}

interface BlockedIp {
  id: number;
  ip_address: string;
  reason: string;
  created_at: string;
}

// ─── Risk badge ───
function RiskBadge({ score }: { score: number }) {
  const cls = score >= 70 ? "bg-red-100 text-red-800" :
    score >= 40 ? "bg-orange-100 text-orange-800" :
    score >= 20 ? "bg-yellow-100 text-yellow-800" :
    "bg-green-100 text-green-700";
  return <span className={`${theme.badge.base} ${cls}`}>{score}</span>;
}

// ─── Status badge ───
function StatusBadge({ status }: { status: string }) {
  const cls = status === "blocked" ? "bg-red-100 text-red-800" :
    status === "safe" ? "bg-green-100 text-green-700" :
    "bg-gray-100 text-gray-600";
  return <span className={`${theme.badge.base} ${cls}`}>{status}</span>;
}

// ─── Flag chips ───
function FlagChips({ flags }: { flags: string }) {
  if (!flags) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.split(",").filter(Boolean).map((f) => {
        const info = FLAG_LABELS[f];
        if (!info) return <span key={f} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{f}</span>;
        return <span key={f} className={`text-xs px-1.5 py-0.5 rounded ${info.color}`}>{info.label}</span>;
      })}
    </div>
  );
}

interface InitialData {
  flaggedOrders: FlaggedOrder[];
  flaggedTotal: number;
  blockedIps: BlockedIp[];
}

export default function SpamClient({ initialData }: { initialData?: InitialData }) {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("flagged");
  const [loading, setLoading] = useState(false);

  // Flagged orders state
  const [flaggedOrders, setFlaggedOrders] = useState<FlaggedOrder[]>(initialData?.flaggedOrders ?? []);
  const [flaggedMeta, setFlaggedMeta] = useState({ page: 1, last_page: 1, total: initialData?.flaggedTotal ?? 0 });

  // Devices state
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesMeta, setDevicesMeta] = useState({ page: 1, last_page: 1, total: 0 });
  const [deviceSearch, setDeviceSearch] = useState("");
  const [deviceStatusFilter, setDeviceStatusFilter] = useState("");

  // Blocked IPs state
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>(initialData?.blockedIps ?? []);
  const [newIp, setNewIp] = useState("");
  const [newIpReason, setNewIpReason] = useState("");

  // Detail modal
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── Fetch data ───
  const loadFlaggedOrders = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.admin.getSpamFlaggedOrders(`page=${page}`);
      setFlaggedOrders(res.data || []);
      setFlaggedMeta(res.meta || { page: 1, last_page: 1, total: 0 });
    } catch { /* */ }
    setLoading(false);
  };

  const loadDevices = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (deviceStatusFilter) params.set("status", deviceStatusFilter);
      if (deviceSearch) params.set("search", deviceSearch);
      const res = await api.admin.getSpamDevices(params.toString());
      setDevices(res.data || []);
      setDevicesMeta(res.meta || { page: 1, last_page: 1, total: 0 });
    } catch { /* */ }
    setLoading(false);
  };

  const loadBlockedIps = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getBlockedIps();
      setBlockedIps(Array.isArray(res) ? res : res.data || []);
    } catch { /* */ }
    setLoading(false);
  };

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // flagged tab is pre-loaded from server; devices/ips load on demand
      if (tab !== "flagged") {
        if (tab === "devices") loadDevices();
        else loadBlockedIps();
      }
      return;
    }
    if (tab === "flagged") loadFlaggedOrders();
    else if (tab === "devices") loadDevices();
    else loadBlockedIps();
  }, [tab]);

  // ─── Actions ───
  const handleBlockDevice = async (deviceId: number) => {
    try {
      await api.admin.updateSpamDevice(deviceId, { status: "blocked", blockReason: "manual_block" });
      if (tab === "devices") loadDevices(devicesMeta.page);
      if (selectedDevice) {
        setSelectedDevice({ ...selectedDevice, status: "blocked" });
      }
    } catch { /* */ }
  };

  const handleUnblockDevice = async (deviceId: number) => {
    try {
      await api.admin.updateSpamDevice(deviceId, { status: "active" });
      if (tab === "devices") loadDevices(devicesMeta.page);
      if (selectedDevice?.id === deviceId) {
        setSelectedDevice({ ...selectedDevice, status: "active" });
      }
    } catch { /* */ }
  };

  const handleMarkSafe = async (deviceId: number) => {
    try {
      await api.admin.updateSpamDevice(deviceId, { status: "safe" });
      if (tab === "devices") loadDevices(devicesMeta.page);
      if (selectedDevice?.id === deviceId) {
        setSelectedDevice({ ...selectedDevice, status: "safe" });
      }
    } catch { /* */ }
  };

  const handleViewDevice = async (deviceId: number) => {
    setDetailLoading(true);
    try {
      const res = await api.admin.getSpamDevice(deviceId);
      setSelectedDevice(res);
    } catch { /* */ }
    setDetailLoading(false);
  };

  const handleAddBlockedIp = async () => {
    if (!newIp.trim()) return;
    try {
      await api.admin.addBlockedIp({ ip_address: newIp.trim(), reason: newIpReason || "manual_block" });
      setNewIp("");
      setNewIpReason("");
      loadBlockedIps();
    } catch { /* */ }
  };

  const handleDeleteBlockedIp = async (id: number) => {
    try {
      await api.admin.deleteBlockedIp(id);
      loadBlockedIps();
    } catch { /* */ }
  };

  // ─── Tab button ───
  const TabBtn = ({ value, label, icon: Icon, count }: { value: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }) => (
    <button
      onClick={() => setTab(value)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
        tab === value ? "bg-[var(--primary)] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count != null && count > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-white/20">{count}</span>}
    </button>
  );

  return (
    <DashboardLayout title={t("dash.spamDetection") || "Spam Detection"}>
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <TabBtn value="flagged" label="Flagged Orders" icon={FiAlertTriangle} count={flaggedMeta.total} />
          <TabBtn value="devices" label="Devices" icon={FiShield} count={devicesMeta.total} />
          <TabBtn value="ips" label="Blocked IPs" icon={FiXCircle} count={blockedIps.length} />
        </div>

        {/* ─── FLAGGED ORDERS TAB ─── */}
        {tab === "flagged" && (
          <div className={theme.table.wrapper}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={theme.table.head}>
                  <tr>
                    <th className={theme.table.th}>ID</th>
                    <th className={theme.table.th}>Customer</th>
                    <th className={theme.table.th}>Phone</th>
                    <th className={theme.table.th}>Total</th>
                    <th className={theme.table.th}>Risk</th>
                    <th className={theme.table.th}>Signals</th>
                    <th className={theme.table.th}>Date</th>
                    <th className={theme.table.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className={theme.table.empty}>Loading...</td></tr>
                  ) : flaggedOrders.length === 0 ? (
                    <tr><td colSpan={8} className={theme.table.empty}>No flagged orders yet ✅</td></tr>
                  ) : flaggedOrders.map((o) => (
                    <tr key={o.id} className={theme.table.row}>
                      <td className={theme.table.td + " font-mono text-xs"}>#{o.id}</td>
                      <td className={theme.table.td}>
                        <div className="text-sm font-medium">{o.customer_name}</div>
                        <div className="text-xs text-gray-400">{o.customer_address?.slice(0, 30)}</div>
                      </td>
                      <td className={theme.table.td + " text-sm"}>{o.customer_phone}</td>
                      <td className={theme.table.td + " text-sm font-semibold"}>৳{o.total}</td>
                      <td className={theme.table.td}><RiskBadge score={o.risk_score} /></td>
                      <td className={theme.table.td}><FlagChips flags={o.fingerprint?.risk_flags || ""} /></td>
                      <td className={theme.table.td + " text-xs text-gray-500"}>{o.created_at ? new Date(o.created_at).toLocaleDateString("en-GB") : ""}</td>
                      <td className={theme.table.td}>
                        {o.fingerprint?.device_fingerprint?.id && (
                          <button onClick={() => handleViewDevice(o.fingerprint!.device_fingerprint!.id)} className={theme.btn.icon.view} title="View Device">
                            <FiEye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {flaggedMeta.last_page > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100">
                <button disabled={flaggedMeta.page <= 1} onClick={() => loadFlaggedOrders(flaggedMeta.page - 1)} className={theme.btn.ghost}><FiChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm text-gray-500">{flaggedMeta.page} / {flaggedMeta.last_page}</span>
                <button disabled={flaggedMeta.page >= flaggedMeta.last_page} onClick={() => loadFlaggedOrders(flaggedMeta.page + 1)} className={theme.btn.ghost}><FiChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}

        {/* ─── DEVICES TAB ─── */}
        {tab === "devices" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadDevices(1)}
                  placeholder="Search by hash, IP, platform..."
                  className={theme.inputSearch} />
              </div>
              <select value={deviceStatusFilter} onChange={(e) => { setDeviceStatusFilter(e.target.value); setTimeout(() => loadDevices(1), 0); }} className={theme.selectSmall}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="safe">Safe</option>
              </select>
            </div>

            <div className={theme.table.wrapper}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme.table.head}>
                    <tr>
                      <th className={theme.table.th}>FP Hash</th>
                      <th className={theme.table.th}>Platform</th>
                      <th className={theme.table.th}>Screen</th>
                      <th className={theme.table.th}>IP</th>
                      <th className={theme.table.th}>Risk</th>
                      <th className={theme.table.th}>Status</th>
                      <th className={theme.table.th}>Orders</th>
                      <th className={theme.table.th}>Last Seen</th>
                      <th className={theme.table.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={9} className={theme.table.empty}>Loading...</td></tr>
                    ) : devices.length === 0 ? (
                      <tr><td colSpan={9} className={theme.table.empty}>No devices recorded yet</td></tr>
                    ) : devices.map((d) => (
                      <tr key={d.id} className={theme.table.row}>
                        <td className={theme.table.td + " font-mono text-xs"}>{d.fp_hash?.slice(0, 12)}...</td>
                        <td className={theme.table.td + " text-sm"}>{d.platform || "—"}</td>
                        <td className={theme.table.td + " text-sm text-gray-500"}>{d.screen_resolution || "—"}</td>
                        <td className={theme.table.td + " font-mono text-xs"}>{d.last_ip || "—"}</td>
                        <td className={theme.table.td}><RiskBadge score={d.risk_score} /></td>
                        <td className={theme.table.td}><StatusBadge status={d.status} /></td>
                        <td className={theme.table.td + " text-sm text-center"}>{d.orderCount ?? d.seen_count ?? 0}</td>
                        <td className={theme.table.td + " text-xs text-gray-500"}>{d.last_seen_at ? new Date(d.last_seen_at).toLocaleDateString("en-GB") : "—"}</td>
                        <td className={theme.table.td}>
                          <div className="flex gap-1">
                            <button onClick={() => handleViewDevice(d.id)} className={theme.btn.icon.view} title="View"><FiEye className="w-4 h-4" /></button>
                            {d.status !== "blocked" ? (
                              <button onClick={() => handleBlockDevice(d.id)} className={theme.btn.icon.delete} title="Block"><FiXCircle className="w-4 h-4" /></button>
                            ) : (
                              <button onClick={() => handleUnblockDevice(d.id)} className={theme.btn.icon.edit} title="Unblock"><FiCheckCircle className="w-4 h-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {devicesMeta.last_page > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100">
                  <button disabled={devicesMeta.page <= 1} onClick={() => loadDevices(devicesMeta.page - 1)} className={theme.btn.ghost}><FiChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm text-gray-500">{devicesMeta.page} / {devicesMeta.last_page}</span>
                  <button disabled={devicesMeta.page >= devicesMeta.last_page} onClick={() => loadDevices(devicesMeta.page + 1)} className={theme.btn.ghost}><FiChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── BLOCKED IPs TAB ─── */}
        {tab === "ips" && (
          <div className="space-y-4">
            {/* Add IP form */}
            <div className="flex gap-2">
              <input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="IP address" className={theme.input + " max-w-[200px]"} />
              <input value={newIpReason} onChange={(e) => setNewIpReason(e.target.value)} placeholder="Reason (optional)" className={theme.input + " max-w-[250px]"} />
              <button onClick={handleAddBlockedIp} className={theme.btn.primary}><FiPlus className="w-4 h-4 mr-1" /> Block IP</button>
            </div>

            <div className={theme.table.wrapper}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme.table.head}>
                    <tr>
                      <th className={theme.table.th}>IP Address</th>
                      <th className={theme.table.th}>Reason</th>
                      <th className={theme.table.th}>Blocked At</th>
                      <th className={theme.table.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} className={theme.table.empty}>Loading...</td></tr>
                    ) : blockedIps.length === 0 ? (
                      <tr><td colSpan={4} className={theme.table.empty}>No blocked IPs</td></tr>
                    ) : blockedIps.map((ip) => (
                      <tr key={ip.id} className={theme.table.row}>
                        <td className={theme.table.td + " font-mono text-sm"}>{ip.ip_address}</td>
                        <td className={theme.table.td + " text-sm text-gray-500"}>{ip.reason || "—"}</td>
                        <td className={theme.table.td + " text-xs text-gray-500"}>{ip.created_at ? new Date(ip.created_at).toLocaleDateString("en-GB") : ""}</td>
                        <td className={theme.table.td}>
                          <button onClick={() => handleDeleteBlockedIp(ip.id)} className={theme.btn.icon.delete} title="Unblock">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── DEVICE DETAIL MODAL ─── */}
      <AnimatePresence>
        {selectedDevice && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setSelectedDevice(null)}>
            <div className="fixed inset-0 bg-black/50" />
            <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden inline-select-scroll"
            >
              {detailLoading ? (
                <div className="p-12 text-center text-gray-400">Loading device details...</div>
              ) : (
                <>
                  {/* Header */}
                  <div className={theme.modal.header}>
                    <div>
                      <h3 className={theme.modal.title}>Device Detail</h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedDevice.fp_hash}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={selectedDevice.status} />
                      <button onClick={() => setSelectedDevice(null)} className={theme.modal.close}>✕</button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className={theme.modal.body}>
                    {/* Device signals grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        ["Platform", selectedDevice.platform],
                        ["Screen", selectedDevice.screen_resolution],
                        ["CPU Cores", selectedDevice.cpu_cores],
                        ["Memory", selectedDevice.memory_gb ? `${selectedDevice.memory_gb} GB` : "—"],
                        ["Touch", selectedDevice.touch_points],
                        ["Timezone", selectedDevice.timezone],
                        ["Languages", selectedDevice.languages],
                        ["Last IP", selectedDevice.last_ip],
                        ["Risk Score", `${Math.max(selectedDevice.risk_score, ...(selectedDevice.order_fingerprints || []).map(of => of.risk_score || 0))}/100`],
                        ["Seen Count", selectedDevice.seen_count],
                        ["First Seen", selectedDevice.created_at ? new Date(selectedDevice.created_at).toLocaleDateString("en-GB") : "—"],
                        ["Last Seen", selectedDevice.last_seen_at ? new Date(selectedDevice.last_seen_at).toLocaleDateString("en-GB") : "—"],
                      ].map(([label, val]) => (
                        <div key={label as string} className="bg-gray-50 rounded-xl px-3 py-2">
                          <div className="text-[10px] text-gray-400 font-medium uppercase">{label}</div>
                          <div className="text-sm font-semibold text-gray-700 truncate">{val || "—"}</div>
                        </div>
                      ))}
                    </div>

                    {/* User Agent */}
                    {selectedDevice.user_agent && (
                      <div className="bg-gray-50 rounded-xl px-3 py-2">
                        <div className="text-[10px] text-gray-400 font-medium uppercase">User Agent</div>
                        <div className="text-xs text-gray-600 break-all">{selectedDevice.user_agent}</div>
                      </div>
                    )}

                    {/* Orders from this device */}
                    {selectedDevice.order_fingerprints && selectedDevice.order_fingerprints.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-2">Orders from this device ({selectedDevice.order_fingerprints.length})</h4>
                        <div className="border border-gray-100 rounded-xl overflow-x-auto">
                          <table className="w-full text-sm min-w-[600px]">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">Order</th>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">Customer</th>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">Phone</th>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">Total</th>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">Risk</th>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">Flags</th>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedDevice.order_fingerprints.map((of) => (
                                <tr key={of.id} className="border-t border-gray-50 hover:bg-gray-50">
                                  <td className="px-3 py-2 font-mono">#{of.order.id}</td>
                                  <td className="px-3 py-2">{of.order.customer_name}</td>
                                  <td className="px-3 py-2">{of.order.customer_phone}</td>
                                  <td className="px-3 py-2 font-semibold">৳{of.order.total}</td>
                                  <td className="px-3 py-2"><RiskBadge score={of.risk_score} /></td>
                                  <td className="px-3 py-2"><FlagChips flags={of.risk_flags || ""} /></td>
                                  <td className="px-3 py-2 text-xs text-gray-400">{of.created_at ? new Date(of.created_at).toLocaleDateString("en-GB") : ""}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      {selectedDevice.status !== "blocked" && (
                        <button onClick={() => handleBlockDevice(selectedDevice.id)} className={theme.btn.danger + " !px-4 !py-2.5 !text-sm"}>
                          <FiXCircle className="w-4 h-4 mr-1 inline" /> Block Device
                        </button>
                      )}
                      {selectedDevice.status === "blocked" && (
                        <button onClick={() => handleUnblockDevice(selectedDevice.id)} className={theme.btn.ghost + " !px-4 !py-2.5 !text-sm"}>
                          <FiCheckCircle className="w-4 h-4 mr-1 inline" /> Unblock
                        </button>
                      )}
                      {selectedDevice.status !== "safe" && (
                        <button onClick={() => handleMarkSafe(selectedDevice.id)} className="px-4 py-2.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
                          <FiCheckCircle className="w-4 h-4 mr-1 inline" /> Mark Safe
                        </button>
                      )}
                      <button onClick={() => setSelectedDevice(null)} className={theme.btn.cancel + " !flex-none"}>Close</button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
