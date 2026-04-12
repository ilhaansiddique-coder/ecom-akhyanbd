"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSearch, FiChevronDown, FiChevronUp, FiPackage, FiEye, FiEdit2, FiX, FiUser, FiMapPin, FiPhone, FiMail, FiCalendar, FiCreditCard, FiTruck, FiRefreshCw, FiCheckCircle, FiXCircle, FiExternalLink, FiPlus, FiTrash2 } from "react-icons/fi";
import { TableSkeleton } from "@/components/DashboardSkeleton";
import Modal from "@/components/Modal";
import DateRangePicker from "@/components/DateRangePicker";
import StatusFilter from "@/components/StatusFilter";
import InlineSelect from "@/components/InlineSelect";
import { useLang } from "@/lib/LanguageContext";
import { theme } from "@/lib/theme";

interface OrderItem {
  id: number;
  product_id?: number;
  product_name: string;
  price: number;
  quantity: number;
}
interface Order {
  id: number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  city?: string;
  zip_code?: string;
  phone?: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  transaction_id?: string;
  notes?: string;
  courier_sent?: boolean;
  consignment_id?: string;
  courier_status?: string;
  courier_score?: string;
  created_at: string;
  items?: OrderItem[];
  user?: { id: number; name: string; email: string } | null;
}

function useStatusOptions() {
  const { t, lang } = useLang();
  return [
    { value: "", label: t("filter.allStatus"), color: "" },
    { value: "pending", label: t("status.pending"), color: "bg-yellow-400" },
    { value: "confirmed", label: t("status.confirmed"), color: "bg-blue-400" },
    { value: "processing", label: t("status.processing"), color: "bg-indigo-400" },
    { value: "shipped", label: t("status.shipped"), color: "bg-purple-400" },
    { value: "delivered", label: t("status.delivered"), color: "bg-green-400" },
    { value: "cancelled", label: t("status.cancelled"), color: "bg-red-400" },
    { value: "trashed", label: lang === "en" ? "Trash" : "ট্র্যাশ", color: "bg-gray-400" },
  ];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  trashed: "bg-gray-100 text-gray-500",
};

function usePaymentOptions() {
  const { t } = useLang();
  return [
    { value: "unpaid", label: t("status.unpaid"), color: "bg-orange-400" },
    { value: "paid", label: t("status.paid"), color: "bg-green-400" },
  ];
}

function usePaymentLabels() {
  const { t } = useLang();
  return {
    cod: t("payment.cod"),
    bkash: t("payment.bkash"),
    nagad: t("payment.nagad"),
    bank: t("payment.bank"),
  } as Record<string, string>;
}

export default function OrdersPage() {
  const { t, lang } = useLang();
  const STATUS_OPTIONS = useStatusOptions();
  const PAYMENT_OPTIONS = usePaymentOptions();
  const PAYMENT_LABELS = usePaymentLabels();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({});
  const [pendingPayment, setPendingPayment] = useState<Record<number, string>>({});
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  // Courier
  const [courierLoading, setCourierLoading] = useState<number | null>(null);
  const [courierBalance, setCourierBalance] = useState<number | null>(null);
  const [scoreLoading, setScoreLoading] = useState<number | null>(null);
  const [scorePopup, setScorePopup] = useState<{
    orderId: number;
    total_parcels: number;
    total_delivered: number;
    total_cancelled?: number;
    success_ratio: string;
  } | null>(null);

  // Detail modal
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create order modal
  const [createOpen, setCreateOpen] = useState(false);
  interface CreateItem { product_id: number; product_name: string; price: number; stock: number; quantity: number }
  const [createForm, setCreateForm] = useState({
    customer_name: "", customer_phone: "", customer_email: "",
    customer_address: "", city: "", zip_code: "",
    payment_method: "cod", notes: "", shipping_cost: "60", discount: "0",
    items: [] as CreateItem[],
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [allProducts, setAllProducts] = useState<{ id: number; name: string; price: number; stock: number; image?: string }[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<{ id?: number; name: string; phone: string; email?: string; address?: string; city?: string; zip_code?: string; source: string }[]>([]);
  const [customerSearchTimer, setCustomerSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Edit modal
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: "", customer_phone: "", customer_email: "", customer_address: "",
    city: "", zip_code: "", status: "", payment_status: "", payment_method: "",
    shipping_cost: "", notes: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchAll = useCallback((background = false) => {
    if (!background) setLoading(true);
    const params = statusFilter ? `status=${statusFilter}` : "";
    api.admin.getOrders(params)
      .then((res) => {
        const all = res.data || res || [];
        // Hide trashed orders from "all" view, only show when explicitly filtered
        setOrders(statusFilter === "trashed" ? all : all.filter((o: Order) => o.status !== "trashed"));
      })
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openDetail = async (orderId: number) => {
    setDetailLoading(true);
    try {
      const res = await api.admin.getOrder(orderId);
      setDetailOrder(res.data || res);
    } catch {
      showToast(t("toast.loadError"), "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = async (orderId: number) => {
    try {
      const res = await api.admin.getOrder(orderId);
      const o = res.data || res;
      setEditOrder(o);
      setEditForm({
        customer_name: o.customer_name || "",
        customer_phone: o.customer_phone || o.phone || "",
        customer_email: o.customer_email || "",
        customer_address: o.customer_address || "",
        city: o.city || "",
        zip_code: o.zip_code || "",
        status: o.status || "pending",
        payment_status: o.payment_status || "unpaid",
        payment_method: o.payment_method || "cod",
        shipping_cost: String(o.shipping_cost ?? 0),
        notes: o.notes || "",
      });
    } catch {
      showToast(t("toast.loadError"), "error");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrder) return;
    setEditSaving(true);
    try {
      // Auto-set payment based on status
      const autoPayment = editForm.status === "delivered" ? "paid" : editForm.status === "cancelled" ? "unpaid" : editForm.payment_status;
      const res = await api.admin.updateOrder(editOrder.id, {
        ...editForm,
        payment_status: autoPayment,
        shipping_cost: Number(editForm.shipping_cost),
      });
      const updated = res.data || res;
      setOrders((prev) => prev.map((o) => (o.id === editOrder.id ? { ...o, ...updated } : o)));
      setEditOrder(null);
      showToast(t("toast.updated"));
    } catch {
      showToast(t("toast.error"), "error");
    } finally {
      setEditSaving(false);
    }
  };

  const handleTrashOrder = async (orderId: number) => {
    if (!confirm(lang === "en" ? "Move this order to trash?" : "এই অর্ডারটি ট্র্যাশে পাঠাতে চান?")) return;
    try {
      await api.admin.updateOrder(orderId, { status: "trashed" });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showToast(lang === "en" ? "Moved to trash" : "ট্র্যাশে পাঠানো হয়েছে");
    } catch {
      showToast(lang === "en" ? "Failed to trash" : "ট্র্যাশে পাঠাতে সমস্যা", "error");
    }
  };

  const handleSendToCourier = async (orderId: number) => {
    setCourierLoading(orderId);
    try {
      const res = await api.admin.sendToCourier(orderId);
      if (res.consignment_id || res.order?.consignment_id) {
        const cid = String(res.consignment_id || res.order?.consignment_id);
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, courier_sent: true, consignment_id: cid, courier_status: "pending" } : o));
        if (detailOrder?.id === orderId) setDetailOrder((prev) => prev ? { ...prev, courier_sent: true, consignment_id: cid, courier_status: "pending" } : prev);
        showToast("কুরিয়ারে পাঠানো হয়েছে!");
      } else if (res.message?.includes("Already sent")) {
        showToast("ইতিমধ্যে কুরিয়ারে পাঠানো হয়েছে");
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, courier_sent: true } : o));
      } else {
        showToast(res.message || "কুরিয়ারে পাঠাতে সমস্যা হয়েছে", "error");
      }
    } catch (err) {
      const error = err as { message?: string };
      showToast(error.message || "কুরিয়ারে পাঠাতে সমস্যা হয়েছে", "error");
    } finally {
      setCourierLoading(null);
    }
  };

  const handleCheckCourierStatus = async (orderId: number) => {
    setCourierLoading(orderId);
    try {
      const res = await api.admin.checkCourierStatus(orderId);
      if (res.delivery_status) {
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, courier_status: res.delivery_status } : o));
        if (detailOrder?.id === orderId) setDetailOrder((prev) => prev ? { ...prev, courier_status: res.delivery_status } : prev);
        showToast(`কুরিয়ার স্ট্যাটাস: ${res.delivery_status}`);
      }
    } catch {
      showToast("স্ট্যাটাস চেক করতে সমস্যা হয়েছে", "error");
    } finally {
      setCourierLoading(null);
    }
  };

  const [balanceLoading, setBalanceLoading] = useState(false);
  const handleCheckBalance = async () => {
    setBalanceLoading(true);
    try {
      const res = await api.admin.courierBalance();
      setCourierBalance(res.balance ?? null);
    } catch {
      showToast("ব্যালেন্স চেক করতে সমস্যা হয়েছে — কুরিয়ার API কী চেক করুন", "error");
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleCustomerSearch = (q: string) => {
    setCustomerSearch(q);
    if (customerSearchTimer) clearTimeout(customerSearchTimer);
    if (q.length < 2) { setCustomerResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.admin.searchCustomers(q);
        setCustomerResults(Array.isArray(res) ? res : []);
      } catch { setCustomerResults([]); }
    }, 300);
    setCustomerSearchTimer(timer);
  };

  const selectCustomer = (c: typeof customerResults[0]) => {
    setCreateForm((prev) => ({
      ...prev,
      customer_name: c.name,
      customer_phone: c.phone,
      customer_email: c.email || "",
      customer_address: c.address || prev.customer_address,
      city: c.city || prev.city,
      zip_code: c.zip_code || prev.zip_code,
    }));
    setCustomerSearch("");
    setCustomerResults([]);
  };

  const openCreateOrder = () => {
    setCreateOpen(true);
    setProductSearch("");
    // Fetch products for picker
    api.admin.getProducts("per_page=200").then((res) => {
      const data = res.data || res || [];
      setAllProducts(Array.isArray(data) ? data.map((p: Record<string, unknown>) => ({
        id: p.id as number,
        name: (p.name as string) || "",
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
        image: (p.image as string) || "",
      })) : []);
    }).catch(() => {});
  };

  const addProductToOrder = (product: typeof allProducts[0]) => {
    // Check if already added
    if (createForm.items.some((i) => i.product_id === product.id)) {
      showToast("পণ্যটি ইতিমধ্যে যোগ করা হয়েছে", "error");
      return;
    }
    setCreateForm((prev) => ({
      ...prev,
      items: [...prev.items, {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        stock: product.stock,
        quantity: 1,
      }],
    }));
    setProductSearch("");
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    try {
      if (createForm.items.length === 0) { showToast("অন্তত একটি পণ্য যোগ করুন", "error"); setCreateSaving(false); return; }

      const items = createForm.items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        price: i.price,
      }));

      const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const discount = Number(createForm.discount) || 0;
      const shipping = Number(createForm.shipping_cost) || 0;
      const total = Math.max(0, subtotal - discount + shipping);

      const res = await api.createOrder({
        customer_name: createForm.customer_name,
        customer_phone: createForm.customer_phone,
        customer_email: createForm.customer_email || undefined,
        customer_address: createForm.customer_address,
        city: createForm.city,
        zip_code: createForm.zip_code || undefined,
        subtotal,
        discount,
        shipping_cost: shipping,
        total,
        payment_method: createForm.payment_method,
        notes: createForm.notes || undefined,
        items,
      });

      const created = res.data || res;
      setOrders((prev) => [created, ...prev]);
      setCreateOpen(false);
      setCreateForm({
        customer_name: "", customer_phone: "", customer_email: "",
        customer_address: "", city: "", zip_code: "",
        payment_method: "cod", notes: "", shipping_cost: "60", discount: "0",
        items: [],
      });
      showToast(t("toast.created"));
    } catch (err) {
      const error = err as { message?: string };
      showToast(error.message || t("toast.error"), "error");
    } finally {
      setCreateSaving(false);
    }
  };

  const removeItem = (idx: number) => setCreateForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  const updateItemQty = (idx: number, qty: number) => setCreateForm((prev) => ({
    ...prev,
    items: prev.items.map((item, i) => i === idx ? { ...item, quantity: Math.min(Math.max(1, qty), item.stock) } : item),
  }));

  const handleCheckScore = async (orderId: number) => {
    setScoreLoading(orderId);
    try {
      const res = await api.admin.checkCourierScore(orderId);
      const totalParcels = res.total_parcels || 0;
      const totalDelivered = res.total_delivered || 0;
      const totalCancelled = totalParcels - totalDelivered;
      const ratio = res.success_ratio || (totalParcels > 0 ? `${((totalDelivered / totalParcels) * 100).toFixed(1)}%` : "0%");

      // Update order in list
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, courier_score: ratio } : o));

      // Show popup
      setScorePopup({
        orderId,
        total_parcels: totalParcels,
        total_delivered: totalDelivered,
        total_cancelled: totalCancelled,
        success_ratio: ratio,
      });
    } catch {
      showToast("স্কোর চেক করতে সমস্যা হয়েছে", "error");
    } finally {
      setScoreLoading(null);
    }
  };

  const handleStatusUpdate = async (orderId: number) => {
    const newStatus = pendingStatus[orderId];
    if (!newStatus) return;
    setUpdatingId(orderId);
    try {
      const payload: Record<string, string> = { status: newStatus };
      // Auto-set payment: delivered → paid, cancelled → unpaid
      if (newStatus === "delivered") payload.payment_status = "paid";
      if (newStatus === "cancelled") payload.payment_status = "unpaid";
      await api.admin.updateOrderStatus(orderId, payload);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...payload } : o)));
      if (detailOrder?.id === orderId) setDetailOrder((prev) => prev ? { ...prev, ...payload } : prev);
      showToast(t("toast.updated"));
      setPendingStatus((p) => { const n = { ...p }; delete n[orderId]; return n; });
    } catch {
      showToast(t("toast.error"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      o.customer_name?.toLowerCase().includes(q) ||
      (o.customer_phone || o.phone || "").toLowerCase().includes(q) ||
      String(o.id).includes(q);
    if (!matchesSearch) return false;

    // Date filter
    if (dateFrom || dateTo) {
      const orderDate = new Date(o.created_at);
      if (dateFrom && orderDate < new Date(dateFrom)) return false;
      if (dateTo) {
        const toEnd = new Date(dateTo);
        toEnd.setHours(23, 59, 59, 999);
        if (orderDate > toEnd) return false;
      }
    }
    return true;
  });

  const inputCls = theme.input;
  const selectCls = theme.selectSmall;

  return (
    <DashboardLayout title={t("dash.orders")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Toolbar */}
        <div className="space-y-3">
          {/* Row 1: Date picker + Status filter (always same row) */}
          <div className="flex gap-3 items-center">
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            />
            <StatusFilter
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={setStatusFilter}
              placeholder={t("filter.allStatus")}
            />
            {/* Courier balance — fetch on click only */}
            <button type="button" onClick={handleCheckBalance} disabled={balanceLoading}
              className="flex items-center gap-2 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 hover:shadow-sm transition-all whitespace-nowrap disabled:opacity-50" title="Check Courier Balance">
              <FiTruck className="w-4 h-4" />
              {balanceLoading ? "চেক হচ্ছে..." : courierBalance !== null ? `৳${courierBalance}` : "ব্যালেন্স চেক"}
            </button>
            {/* Search: visible only on desktop, inline */}
            <div className="relative flex-1 min-w-52 hidden md:block">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("search.customers")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none"
              />
            </div>
            {/* Add Order button */}
            <button type="button" onClick={openCreateOrder}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors whitespace-nowrap">
              <FiPlus className="w-4 h-4" />
              {t("btn.add")} {t("dash.orders")}
            </button>
          </div>
          {/* Row 2: Search bar on mobile/tablet (full width below) */}
          <div className="relative md:hidden">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("search.customers")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none"
            />
          </div>
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
                    {["#", t("th.customer"), t("th.phone"), t("th.total"), t("th.status"), "Courier", "Score", "Consignment", t("th.date"), t("th.actions")].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="py-12 text-center text-gray-400">{t("empty.orders")}</td></tr>
                  ) : filtered.map((o) => {
                    const isExpanded = expandedId === o.id;
                    const stColor = STATUS_COLORS[o.status] || "bg-gray-100 text-gray-800";
                    const stLabel = STATUS_OPTIONS.find((s) => s.value === o.status)?.label || o.status;
                    return (
                      <Fragment key={o.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 font-medium">#{toBn(o.id)}</td>
                          <td className="px-4 py-3 font-medium text-gray-800 max-w-32 truncate">{o.customer_name}</td>
                          <td className="px-4 py-3 text-gray-500">{o.customer_phone || o.phone || "—"}</td>
                          <td className="px-4 py-3 font-semibold text-[#0f5931] whitespace-nowrap">৳{toBn(o.total)}</td>
                          <td className="px-4 py-3">
                            <InlineSelect
                              value={o.status}
                              options={STATUS_OPTIONS.filter((s) => s.value)}
                              onChange={async (v) => {
                                try {
                                  // Auto-set payment: delivered → paid, cancelled → unpaid
                                  const paymentStatus = v === "delivered" ? "paid" : v === "cancelled" ? "unpaid" : undefined;
                                  await api.admin.updateOrderStatus(o.id, {
                                    status: v,
                                    ...(paymentStatus ? { payment_status: paymentStatus } : {}),
                                  });
                                  setOrders((prev) => prev.map((x) => (x.id === o.id ? {
                                    ...x,
                                    status: v,
                                    ...(paymentStatus ? { payment_status: paymentStatus } : {}),
                                  } : x)));
                                  showToast(t("toast.updated"));
                                } catch { showToast(t("toast.error"), "error"); }
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            {o.courier_sent ? (
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  o.courier_status === "delivered" ? "bg-green-100 text-green-700" :
                                  o.courier_status === "in_review" || o.courier_status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                  o.courier_status === "cancelled" ? "bg-red-100 text-red-700" :
                                  "bg-blue-100 text-blue-700"
                                }`}>
                                  {o.courier_status || "sent"}
                                </span>
                                <button type="button" onClick={() => handleCheckCourierStatus(o.id)} disabled={courierLoading === o.id}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Refresh status">
                                  <FiRefreshCw className={`w-3 h-3 ${courierLoading === o.id ? "animate-spin" : ""}`} />
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => handleSendToCourier(o.id)} disabled={courierLoading === o.id}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-[#0f5931]/10 text-[#0f5931] rounded-lg font-medium hover:bg-[#0f5931] hover:text-white transition-colors disabled:opacity-50">
                                <FiTruck className="w-3 h-3" />
                                {courierLoading === o.id ? "..." : "Send"}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleCheckScore(o.id)}
                              disabled={scoreLoading === o.id}
                              className={`text-xs px-2 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                                o.courier_score
                                  ? parseFloat(o.courier_score) >= 70
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : parseFloat(o.courier_score) >= 40
                                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              }`}
                              title="Click to check score"
                            >
                              {scoreLoading === o.id ? "..." : o.courier_score || "Check"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {o.consignment_id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-gray-600">{o.consignment_id}</span>
                                <a href={`https://steadfast.com.bd/user/consignment/${o.consignment_id}`} target="_blank" rel="noopener noreferrer"
                                  className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors" title="Track on Steadfast">
                                  <FiExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                            {new Date(o.created_at).toLocaleDateString(lang === "en" ? "en-US" : "bn-BD")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openDetail(o.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="বিস্তারিত দেখুন"
                              >
                                <FiEye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEdit(o.id)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="সম্পাদনা"
                              >
                                <FiEdit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleTrashOrder(o.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="ট্র্যাশে পাঠান"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : o.id)}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                title="স্ট্যাটাস পরিবর্তন"
                              >
                                {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
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
                                    {o.items && o.items.length > 0 && (
                                      <div>
                                        <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                                          <FiPackage className="w-3.5 h-3.5" />
                                          {t("misc.productItems")}
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
                                    <div className="flex flex-wrap items-end gap-3">
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 mb-1">{t("form.orderStatus")}</div>
                                        <InlineSelect
                                          value={pendingStatus[o.id] ?? o.status}
                                          options={STATUS_OPTIONS.filter((s) => s.value)}
                                          onChange={(v) => setPendingStatus({ ...pendingStatus, [o.id]: v })}
                                        />
                                      </div>
                                      <button
                                        onClick={() => handleStatusUpdate(o.id)}
                                        disabled={updatingId === o.id}
                                        className="px-4 py-2 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50"
                                      >
                                        {updatingId === o.id ? t("btn.saving") : t("btn.save")}
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

      {/* Order Detail Modal */}
      <Modal open={!!(detailOrder || detailLoading)} onClose={() => setDetailOrder(null)} title={detailOrder ? `${t("modal.orderDetails")} #${toBn(detailOrder.id)}` : t("misc.loading")} size="xl">
              {detailLoading && !detailOrder ? (
                <div className="p-12 text-center text-gray-400">{t("misc.loading")}</div>
              ) : detailOrder && (() => {
                const o = detailOrder;
                const stColor = STATUS_COLORS[o.status] || "bg-gray-100 text-gray-800";
                const stLabel = STATUS_OPTIONS.find((s) => s.value === o.status)?.label || o.status;
                return (
                    <div className="p-6 space-y-5">
                      <p className="text-xs text-gray-400">
                        <FiCalendar className="inline w-3 h-3 mr-1" />
                        {new Date(o.created_at).toLocaleString("bn-BD")}
                      </p>
                      {/* Status badges */}
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${stColor}`}>{stLabel}</span>
                        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {o.payment_status === "paid" ? t("status.paid") : t("status.unpaid")}
                        </span>
                        <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-gray-100 text-gray-700">
                          <FiCreditCard className="inline w-3 h-3 mr-1" />
                          {PAYMENT_LABELS[o.payment_method] || o.payment_method}
                        </span>
                        {o.transaction_id && (
                          <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-blue-100 text-blue-700">
                            TrxID: {o.transaction_id}
                          </span>
                        )}
                      </div>

                      {/* Customer Info */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t("misc.customerInfo")}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <FiUser className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="font-medium">{o.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <FiPhone className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>{o.customer_phone || o.phone || "—"}</span>
                          </div>
                          {(o.customer_email) && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <FiMail className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>{o.customer_email}</span>
                            </div>
                          )}
                          {o.user && (
                            <div className="flex items-center gap-2 text-gray-500 text-xs">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">রেজিস্টার্ড গ্রাহক</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t("misc.deliveryAddress")}</h3>
                        <div className="flex items-start gap-2 text-sm text-gray-700">
                          <FiMapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <div>
                            <p>{o.customer_address || "—"}</p>
                            <p className="text-gray-500">{[o.city, o.zip_code].filter(Boolean).join(", ")}</p>
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                          <FiPackage className="w-3.5 h-3.5" />
                          {t("misc.productItems")} ({toBn(o.items?.length || 0)})
                        </h3>
                        <div className="space-y-2">
                          {o.items?.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                              <div className="w-10 h-10 rounded-lg bg-[#0f5931]/10 flex items-center justify-center text-[#0f5931] shrink-0">
                                <FiPackage className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                                <p className="text-xs text-gray-500">৳{toBn(item.price)} × {toBn(item.quantity)}</p>
                              </div>
                              <p className="text-sm font-bold text-[#0f5931] whitespace-nowrap">৳{toBn(item.price * item.quantity)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-gray-600">
                            <span>{t("form.subtotal")}</span>
                            <span>৳{toBn(o.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span className="flex items-center gap-1"><FiTruck className="w-3.5 h-3.5" /> {t("checkout.shipping")}</span>
                            <span>৳{toBn(o.shipping_cost)}</span>
                          </div>
                          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800 text-base">
                            <span>{t("checkout.total")}</span>
                            <span className="text-[#0f5931]">৳{toBn(o.total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {o.notes && (
                        <div className="bg-yellow-50 rounded-xl p-4">
                          <h3 className="text-xs font-bold text-yellow-700 mb-1">{t("form.notes")}</h3>
                          <p className="text-sm text-yellow-800">{o.notes}</p>
                        </div>
                      )}

                      {/* Courier Section */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                          <FiTruck className="w-3.5 h-3.5" /> Courier (Steadfast)
                        </h3>
                        {o.courier_sent ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-gray-500">Consignment ID:</span>
                              <span className="font-mono font-medium text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">{o.consignment_id}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-gray-500">Status:</span>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                o.courier_status === "delivered" ? "bg-green-100 text-green-700" :
                                o.courier_status === "cancelled" || o.courier_status === "partial_delivered" ? "bg-red-100 text-red-700" :
                                "bg-blue-100 text-blue-700"
                              }`}>{o.courier_status || "pending"}</span>
                              <button type="button" onClick={() => handleCheckCourierStatus(o.id)} disabled={courierLoading === o.id}
                                className="text-xs text-blue-600 hover:underline disabled:opacity-50">
                                {courierLoading === o.id ? "Checking..." : "Refresh"}
                              </button>
                            </div>
                            {o.courier_score && (
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-gray-500">Score:</span>
                                <span className="font-medium">{o.courier_score}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button type="button" onClick={() => handleSendToCourier(o.id)} disabled={courierLoading === o.id}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50">
                            <FiTruck className="w-4 h-4" />
                            {courierLoading === o.id ? "Sending..." : "Send to Courier"}
                          </button>
                        )}
                      </div>

                      {/* Quick Status Update */}
                      <div className="border-t border-gray-100 pt-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{t("misc.statusPayment")}</h3>
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">{t("form.orderStatus")}</div>
                            <InlineSelect
                              value={pendingStatus[o.id] ?? o.status}
                              options={STATUS_OPTIONS.filter((s) => s.value)}
                              onChange={(v) => setPendingStatus({ ...pendingStatus, [o.id]: v })}
                            />
                          </div>
                          <button
                            onClick={() => handleStatusUpdate(o.id)}
                            disabled={updatingId === o.id}
                            className="px-4 py-2 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50"
                          >
                            {updatingId === o.id ? t("btn.saving") : t("btn.update")}
                          </button>
                        </div>
                      </div>
                    </div>
                );
              })()}
      </Modal>
      {/* Edit Order Modal */}
      <Modal open={!!editOrder} onClose={() => setEditOrder(null)} title={editOrder ? `${t("modal.editOrder")} #${toBn(editOrder.id)}` : ""} size="lg">
        {editOrder && (
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                {/* Customer Info */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t("misc.customerInfo")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.name")} *</label>
                      <input required value={editForm.customer_name} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.phone")} *</label>
                      <input required value={editForm.customer_phone} onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.email")}</label>
                    <input type="email" value={editForm.customer_email} onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none" />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t("form.address")}</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.address")} *</label>
                    <textarea rows={2} required value={editForm.customer_address} onChange={(e) => setEditForm({ ...editForm, customer_address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.city")} *</label>
                      <input required value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.zipCode")}</label>
                      <input value={editForm.zip_code} onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none" />
                    </div>
                  </div>
                </div>

                {/* Status & Payment */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t("misc.statusPayment")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.orderStatus")}</label>
                      <InlineSelect fullWidth value={editForm.status} options={STATUS_OPTIONS.filter((s) => s.value)} onChange={(v) => setEditForm({ ...editForm, status: v })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.paymentMethod")}</label>
                      <InlineSelect fullWidth value={editForm.payment_method} options={[
                        { value: "cod", label: t("payment.cod") },
                        { value: "bkash", label: t("payment.bkash") },
                        { value: "nagad", label: t("payment.nagad") },
                        { value: "bank", label: t("payment.bank") },
                      ]} onChange={(v) => setEditForm({ ...editForm, payment_method: v })} />
                    </div>
                  </div>
                </div>

                {/* Shipping & Notes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.shippingCost")}</label>
                    <input type="number" min="0" step="1" value={editForm.shipping_cost} onChange={(e) => setEditForm({ ...editForm, shipping_cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.subtotal")}</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-[#0f5931]">
                      ৳{toBn(editOrder.subtotal)}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.notes")}</label>
                  <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none resize-none"
                    placeholder="অর্ডার সম্পর্কে নোট..." />
                </div>

                {/* Items (read-only) */}
                {editOrder.items && editOrder.items.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{t("misc.productItems")}</p>
                    <div className="space-y-1.5">
                      {editOrder.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                          <span>{item.product_name} × {toBn(item.quantity)}</span>
                          <span className="font-medium">৳{toBn(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditOrder(null)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    {t("btn.cancel")}
                  </button>
                  <button type="submit" disabled={editSaving}
                    className="flex-1 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50">
                    {editSaving ? t("btn.saving") : t("btn.update")}
                  </button>
                </div>
              </form>
        )}
      </Modal>

      {/* Score Detail Popup */}
      <Modal open={!!scorePopup} onClose={() => setScorePopup(null)} title="Steadfast Success Rate" size="sm">
        {scorePopup && (
          <div className="p-6 space-y-4">
            {/* Score circle */}
            <div className="flex justify-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold border-4 ${
                parseFloat(scorePopup.success_ratio) >= 70
                  ? "border-green-400 text-green-600 bg-green-50"
                  : parseFloat(scorePopup.success_ratio) >= 40
                  ? "border-yellow-400 text-yellow-600 bg-yellow-50"
                  : "border-red-400 text-red-600 bg-red-50"
              }`}>
                {scorePopup.success_ratio}
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FiPackage className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Total Orders</span>
                </div>
                <span className="text-lg font-bold text-gray-800">{scorePopup.total_parcels}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <FiCheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-green-700">Total Delivered</span>
                </div>
                <span className="text-lg font-bold text-green-700">{scorePopup.total_delivered}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <FiXCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-red-700">Total Cancelled</span>
                </div>
                <span className="text-lg font-bold text-red-700">{scorePopup.total_cancelled || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#0f5931]/5 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0f5931]/10 flex items-center justify-center">
                    <FiTruck className="w-4 h-4 text-[#0f5931]" />
                  </div>
                  <span className="text-sm font-medium text-[#0f5931]">Success Ratio</span>
                </div>
                <span className="text-lg font-bold text-[#0f5931]">{scorePopup.success_ratio}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Order Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={`${t("btn.add")} ${t("dash.orders")}`} size="lg">
        <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
          {/* Customer info with search */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t("misc.customerInfo")}</p>

            {/* Customer search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                placeholder={lang === "en" ? "Search existing customer by name or phone..." : "নাম বা ফোন দিয়ে গ্রাহক খুঁজুন..."}
                className="w-full pl-9 pr-4 py-2 border border-dashed border-[#0f5931]/30 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none bg-[#0f5931]/3"
              />
              {customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {customerResults.map((c, i) => (
                    <button type="button" key={`${c.phone}-${i}`} onClick={() => selectCustomer(c)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-sm text-left transition-colors border-b border-gray-50 last:border-0">
                      <div>
                        <span className="font-medium text-gray-800">{c.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{c.phone}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.source === "registered" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                        {c.source === "registered" ? "Registered" : "Guest"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.name")} *</label>
                <input required value={createForm.customer_name} onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.phone")} *</label>
                <input required value={createForm.customer_phone} onChange={(e) => setCreateForm({ ...createForm, customer_phone: e.target.value })}
                  className={inputCls} placeholder="01XXXXXXXXX" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.email")}</label>
              <input type="email" value={createForm.customer_email} onChange={(e) => setCreateForm({ ...createForm, customer_email: e.target.value })}
                className={inputCls} />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t("misc.deliveryAddress")}</p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.address")} *</label>
              <textarea rows={2} required value={createForm.customer_address} onChange={(e) => setCreateForm({ ...createForm, customer_address: e.target.value })}
                className={inputCls + " resize-none"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.city")} *</label>
                <input required value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.zipCode")}</label>
                <input value={createForm.zip_code} onChange={(e) => setCreateForm({ ...createForm, zip_code: e.target.value })}
                  className={inputCls} />
              </div>
            </div>
          </div>

          {/* Product Picker */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t("misc.productItems")}</p>

            {/* Search products */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={t("search.products")}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none"
              />
              {/* Dropdown results */}
              {productSearch.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {allProducts
                    .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) && !createForm.items.some((i) => i.product_id === p.id))
                    .slice(0, 8)
                    .map((p) => (
                      <button type="button" key={p.id} onClick={() => addProductToOrder(p)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-sm text-left transition-colors">
                        <div>
                          <span className="font-medium text-gray-800">{p.name}</span>
                          <span className="text-xs text-gray-400 ml-2">Stock: {p.stock}</span>
                        </div>
                        <span className="text-[#0f5931] font-semibold">৳{p.price}</span>
                      </button>
                    ))}
                  {allProducts.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) && !createForm.items.some((i) => i.product_id === p.id)).length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">{t("empty.products")}</div>
                  )}
                </div>
              )}
            </div>

            {/* Selected items */}
            {createForm.items.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-xl">{t("search.products")}</div>
            ) : (
              <div className="space-y-2">
                {createForm.items.map((item, idx) => (
                  <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-400">৳{item.price} × {item.quantity} = ৳{item.price * item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => updateItemQty(idx, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-bold">−</button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button type="button" onClick={() => updateItemQty(idx, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-bold disabled:opacity-30">+</button>
                    </div>
                    <span className="text-sm font-bold text-[#0f5931] w-16 text-right">৳{item.price * item.quantity}</span>
                    <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment, Shipping, Discount */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.paymentMethod")}</label>
              <InlineSelect fullWidth value={createForm.payment_method} options={[
                { value: "cod", label: t("payment.cod") },
                { value: "bkash", label: t("payment.bkash") },
                { value: "nagad", label: t("payment.nagad") },
                { value: "bank", label: t("payment.bank") },
              ]} onChange={(v) => setCreateForm({ ...createForm, payment_method: v })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.shippingCost")}</label>
              <input type="number" min="0" value={createForm.shipping_cost} onChange={(e) => setCreateForm({ ...createForm, shipping_cost: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Discount (৳)</label>
              <input type="number" min="0" value={createForm.discount} onChange={(e) => setCreateForm({ ...createForm, discount: e.target.value })}
                className={inputCls} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.notes")}</label>
            <textarea rows={2} value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              className={inputCls + " resize-none"} placeholder="Order notes..." />
          </div>

          {/* Price Breakdown */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>৳{createForm.items.reduce((s, i) => s + i.price * i.quantity, 0)}</span>
            </div>
            {Number(createForm.discount) > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount</span>
                <span>-৳{createForm.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Shipping</span>
              <span>৳{createForm.shipping_cost || 0}</span>
            </div>
            <div className="flex justify-between font-bold text-[#0f5931] text-base border-t border-gray-200 pt-1.5">
              <span>{t("th.total")}</span>
              <span>৳{Math.max(0, createForm.items.reduce((s, i) => s + i.price * i.quantity, 0) - (Number(createForm.discount) || 0) + (Number(createForm.shipping_cost) || 0))}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              {t("btn.cancel")}
            </button>
            <button type="submit" disabled={createSaving}
              className="flex-1 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50">
              {createSaving ? t("btn.saving") : t("btn.create")}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
