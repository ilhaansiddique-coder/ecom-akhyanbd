"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSearch, FiChevronDown, FiChevronUp, FiPackage } from "react-icons/fi";
import { TableSkeleton } from "@/components/DashboardSkeleton";

interface OrderItem {
  id: number;
  product_name: string;
  price: number;
  quantity: number;
}
interface Order {
  id: number;
  customer_name: string;
  phone?: string;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  items?: OrderItem[];
}

const STATUS_OPTIONS = [
  { value: "", label: "সব" },
  { value: "pending", label: "অপেক্ষমাণ" },
  { value: "confirmed", label: "নিশ্চিত" },
  { value: "processing", label: "প্রসেসিং" },
  { value: "shipped", label: "শিপড" },
  { value: "delivered", label: "ডেলিভারি সম্পন্ন" },
  { value: "cancelled", label: "বাতিল" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({});
  const [pendingPayment, setPendingPayment] = useState<Record<number, string>>({});
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchAll = useCallback((background = false) => {
    if (!background) setLoading(true);
    const params = statusFilter ? `status=${statusFilter}` : "";
    api.admin.getOrders(params)
      .then((res) => setOrders(res.data || res || []))
      .catch(() => { if (!background) showToast("ডেটা লোড করতে সমস্যা হয়েছে", "error"); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatusUpdate = async (orderId: number) => {
    const newStatus = pendingStatus[orderId];
    const newPayment = pendingPayment[orderId];
    if (!newStatus && !newPayment) return;
    setUpdatingId(orderId);
    try {
      const payload: Record<string, string> = {};
      if (newStatus) payload.status = newStatus;
      if (newPayment) payload.payment_status = newPayment;
      await api.admin.updateOrderStatus(orderId, payload);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...payload } : o)));
      showToast("অর্ডার আপডেট হয়েছে!");
      setPendingStatus((p) => { const n = { ...p }; delete n[orderId]; return n; });
      setPendingPayment((p) => { const n = { ...p }; delete n[orderId]; return n; });
    } catch {
      showToast("আপডেট করতে সমস্যা হয়েছে", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.customer_name?.toLowerCase().includes(q) ||
      o.phone?.toLowerCase().includes(q) ||
      String(o.id).includes(q)
    );
  });

  const selectCls = "px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none bg-white";

  return (
    <DashboardLayout title="অর্ডার">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="গ্রাহক বা ফোন দিয়ে খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["#", "গ্রাহক", "ফোন", "মোট", "স্ট্যাটাস", "পেমেন্ট", "তারিখ", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400">কোনো অর্ডার পাওয়া যায়নি</td></tr>
                  ) : filtered.map((o) => {
                    const isExpanded = expandedId === o.id;
                    const stColor = STATUS_COLORS[o.status] || "bg-gray-100 text-gray-800";
                    const stLabel = STATUS_OPTIONS.find((s) => s.value === o.status)?.label || o.status;
                    return (
                      <Fragment key={o.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 font-medium">#{toBn(o.id)}</td>
                          <td className="px-4 py-3 font-medium text-gray-800 max-w-32 truncate">{o.customer_name}</td>
                          <td className="px-4 py-3 text-gray-500">{o.phone || "—"}</td>
                          <td className="px-4 py-3 font-semibold text-[#0f5931] whitespace-nowrap">৳{toBn(o.total)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${stColor}`}>{stLabel}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                              {o.payment_status === "paid" ? "পরিশোধিত" : "বাকি"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                            {new Date(o.created_at).toLocaleDateString("bn-BD")}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : o.id)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                        <AnimatePresence>
                          {isExpanded && (
                            <tr key={`exp-${o.id}`}>
                              <td colSpan={8} className="px-4 bg-gray-50">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="py-4 space-y-4">
                                    {/* Items */}
                                    {o.items && o.items.length > 0 && (
                                      <div>
                                        <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                                          <FiPackage className="w-3.5 h-3.5" />
                                          অর্ডারের পণ্যসমূহ
                                        </div>
                                        <div className="space-y-1.5">
                                          {o.items.map((item) => (
                                            <div key={item.id} className="flex justify-between text-sm text-gray-700 bg-white rounded-lg px-3 py-2 border border-gray-100">
                                              <span>{item.product_name} × {toBn(item.quantity)}</span>
                                              <span className="font-semibold text-[#0f5931]">৳{toBn(item.price * item.quantity)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {/* Status update */}
                                    <div className="flex flex-wrap items-end gap-3">
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 mb-1">স্ট্যাটাস পরিবর্তন</div>
                                        <select
                                          value={pendingStatus[o.id] ?? o.status}
                                          onChange={(e) => setPendingStatus({ ...pendingStatus, [o.id]: e.target.value })}
                                          className={selectCls}
                                        >
                                          {STATUS_OPTIONS.filter((s) => s.value).map((s) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 mb-1">পেমেন্ট স্ট্যাটাস</div>
                                        <select
                                          value={pendingPayment[o.id] ?? o.payment_status}
                                          onChange={(e) => setPendingPayment({ ...pendingPayment, [o.id]: e.target.value })}
                                          className={selectCls}
                                        >
                                          <option value="unpaid">বাকি</option>
                                          <option value="paid">পরিশোধিত</option>
                                        </select>
                                      </div>
                                      <button
                                        onClick={() => handleStatusUpdate(o.id)}
                                        disabled={updatingId === o.id}
                                        className="px-4 py-2 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50"
                                      >
                                        {updatingId === o.id ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
