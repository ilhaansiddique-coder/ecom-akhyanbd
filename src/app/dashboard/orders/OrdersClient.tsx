"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { mapCourierStatusToOrderStatus } from "@/lib/courierStatusMap";
import { toBn } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import { FiSearch, FiChevronDown, FiChevronUp, FiPackage, FiEye, FiEdit2, FiX, FiUser, FiMapPin, FiPhone, FiMail, FiCalendar, FiCreditCard, FiTruck, FiRefreshCw, FiCheckCircle, FiXCircle, FiExternalLink, FiPlus, FiTrash2, FiSlash } from "react-icons/fi";
import { TableSkeleton } from "@/components/DashboardSkeleton";
import Modal from "@/components/Modal";
import PathaoSendModal from "@/components/PathaoSendModal";
import PathaoBulkReviewModal from "@/components/PathaoBulkReviewModal";

// Resolve courier from stored type, falling back to consignment-ID prefix sniff
// (Pathao IDs always start with "DA") for older orders sent before courier_type
// was tracked.
function resolveCourier(provider: string | undefined, id: string): "pathao" | "steadfast" {
  if (provider === "pathao") return "pathao";
  if (provider === "steadfast") return "steadfast";
  return /^DA/i.test(id) ? "pathao" : "steadfast";
}

// Build the courier-specific tracking URL for a consignment.
function consignmentUrl(provider: string | undefined, id: string): string {
  if (resolveCourier(provider, id) === "pathao") {
    return `https://merchant.pathao.com/courier/orders/${id}?isShowingActive=1`;
  }
  return `https://steadfast.com.bd/user/consignment/${id}`;
}
import DateRangePicker from "@/components/DateRangePicker";
import StatusFilter from "@/components/StatusFilter";
import InlineSelect from "@/components/InlineSelect";
import { useLang } from "@/lib/LanguageContext";
import { theme } from "@/lib/theme";
import { SafeNextImage } from "@/components/SafeImage";

interface OrderItem {
  id: number;
  product_id?: number;
  product_name: string;
  variant_id?: number;
  variant_label?: string;
  variant_image?: string | null;
  price: number;
  quantity: number;
  product?: { image?: string } | null;
}

// Resolve the best image for an order item: product main image, then variant snapshot.
function itemImage(item: OrderItem): string | undefined {
  return item.product?.image || item.variant_image || undefined;
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
  courier_type?: string;
  consignment_id?: string;
  courier_status?: string;
  courier_score?: string;
  courier_score_at?: string | null;
  created_at: string;
  items?: OrderItem[];
  user?: { id: number; name: string; email: string } | null;
}

function useStatusOptions() {
  const { t, lang } = useLang();
  return [
    { value: "", label: t("filter.allStatus"), color: "" },
    { value: "pending", label: t("status.pending"), color: "bg-yellow-400" },
    { value: "processing", label: t("status.processing"), color: "bg-indigo-400" },
    { value: "on_hold", label: lang === "en" ? "On Hold" : "অন হোল্ড", color: "bg-orange-400" },
    { value: "confirmed", label: t("status.confirmed"), color: "bg-blue-400" },
    { value: "shipped", label: t("status.shipped"), color: "bg-purple-400" },
    { value: "delivered", label: t("status.delivered"), color: "bg-green-400" },
    { value: "cancelled", label: t("status.cancelled"), color: "bg-red-400" },
    { value: "trashed", label: lang === "en" ? "Trash" : "ট্র্যাশ", color: "bg-gray-400" },
  ];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-indigo-100 text-indigo-800",
  on_hold: "bg-orange-100 text-orange-800",
  confirmed: "bg-blue-100 text-blue-800",
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

interface ShippingZoneData { id: number; name: string; rate: number }
interface InitialData { items: Order[]; total: number; shippingZones: ShippingZoneData[] }

export default function OrdersClient({ initialData }: { initialData?: InitialData }) {
  const { t, lang } = useLang();
  // Trash / hard-delete actions are admin-only — keeps staff from accidentally
  // wiping a customer order. Server enforces this too (requireAdmin on DELETE
  // and on PUT status=trashed); hiding the buttons just removes the temptation.
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const STATUS_OPTIONS = useStatusOptions();
  const PAYMENT_OPTIONS = usePaymentOptions();
  const PAYMENT_LABELS = usePaymentLabels();
  const fmtScore = (s: string) => s.endsWith(".0%") ? s.replace(".0%", "%") : s;
  const [orders, setOrders] = useState<Order[]>(initialData?.items ?? []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  // Seed filters from URL on first render so dashboard stat-card links land
  // pre-filtered (e.g. ?status=pending, ?from=YYYY-MM-DD&to=YYYY-MM-DD)
  const sp = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(() => sp?.get("status") ?? "");
  const [dateFrom, setDateFrom] = useState(() => sp?.get("from") ?? "");
  const [dateTo, setDateTo] = useState(() => sp?.get("to") ?? "");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({});
  const [pendingPayment, setPendingPayment] = useState<Record<number, string>>({});
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  // Pagination — server returns 20 per page (admin/orders/route.ts).
  // Match that here so page math lines up with what the API actually slices.
  // Pagination controls only render when totalPages > 1, i.e. when total
  // orders exceeds 100 — under that, no Prev/Next clutter.
  const perPage = 100;
  const [page, setPage] = useState(1);
  // Seed from SSR so pagination controls render immediately on first paint
  // without waiting for the client-side re-fetch (skipFirstFetchRef).
  const [totalOrders, setTotalOrders] = useState(initialData?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalOrders / perPage));

  // Shipping zones
  const [shippingZones, setShippingZones] = useState<{ id: number; name: string; rate: number }[]>(initialData?.shippingZones ?? []);
  useEffect(() => {
    if (initialData?.shippingZones?.length) return; // already loaded from server
    api.admin.getShippingZones()
      .then((res: any) => setShippingZones((res.data || res || []).map((z: any) => ({ id: z.id, name: z.name, rate: z.rate }))))
      .catch(() => {});
  }, []);

  // Bulk select + Courier
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{ image: string; x: number; y: number } | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
  const [editingCN, setEditingCN] = useState<{ orderId: number; value: string } | null>(null);
  const [courierLoading, setCourierLoading] = useState<number | null>(null);
  // Active courier provider for send actions ("steadfast" | "pathao")
  // Used as fallback for status checks; sending uses dynamic chooser based on configured couriers.
  const [activeCourier, setActiveCourier] = useState<"steadfast" | "pathao">(
    () => (typeof window !== "undefined" && (localStorage.getItem("active_courier") as "steadfast" | "pathao")) || "steadfast"
  );
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("active_courier", activeCourier);
  }, [activeCourier]);

  // Couriers that are both enabled (admin toggle) AND configured (creds present).
  // Drives the chooser modal — if multiple active, ask user; if one, auto-pick.
  const [availableCouriers, setAvailableCouriers] = useState<{ id: "steadfast" | "pathao"; label: string }[]>([]);
  useEffect(() => {
    api.admin.listActiveCouriers()
      .then((r) => setAvailableCouriers(r.couriers || []))
      .catch(() => setAvailableCouriers([]));
  }, []);

  // Chooser modal state — pending send action waiting for courier selection.
  const [chooserPending, setChooserPending] = useState<
    | { kind: "single"; orderId: number }
    | { kind: "bulk"; orderIds: number[] }
    | null
  >(null);
  const [scoreLoading, setScoreLoading] = useState<number | null>(null);
  const [scorePopup, setScorePopup] = useState<{
    orderId: number;
    total_parcels: number;
    total_delivered: number;
    total_cancelled?: number;
    success_ratio: string;
    providers?: Array<{
      provider: "steadfast" | "pathao";
      ok: boolean;
      total_parcels: number;
      total_delivered: number;
      total_cancelled: number;
      success_ratio: string;
      rating?: string;
      error?: string;
    }>;
  } | null>(null);

  // Bulk courier refresh
  const [bulkRefreshOpen, setBulkRefreshOpen] = useState(false);
  const [bulkRefreshing, setBulkRefreshing] = useState(false);
  const [bulkRefreshProgress, setBulkRefreshProgress] = useState({ done: 0, total: 0, delivered: 0 });

  // Bulk score check
  const [bulkScoreOpen, setBulkScoreOpen] = useState(false);
  const [bulkScoreChecking, setBulkScoreChecking] = useState(false);
  const [bulkScoreProgress, setBulkScoreProgress] = useState({ done: 0, total: 0 });

  // Detail modal
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create order modal
  const [createOpen, setCreateOpen] = useState(false);
  // variant_id + variant_label flow through into both create + edit submissions
  // and back out via the API → see PUT /admin/orders/[id] which now persists them.
  interface CreateItem { product_id: number; product_name: string; price: number; stock: number; quantity: number; image?: string; variant_id?: number; variant_label?: string }
  interface PickerVariant { id: number; label: string; price: number; stock?: number; image?: string; unlimited_stock?: boolean; is_active?: boolean }
  interface PickerProduct { id: number; name: string; slug?: string; price: number; stock: number; image?: string; has_variations?: boolean; variants?: PickerVariant[] }
  const [createForm, setCreateForm] = useState({
    customer_name: "", customer_phone: "", customer_email: "",
    customer_address: "", city: "", zip_code: "",
    payment_method: "cod", notes: "", shipping_cost: "60", discount: "0",
    items: [] as CreateItem[],
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [allProducts, setAllProducts] = useState<PickerProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<{ id?: number; name: string; phone: string; email?: string; address?: string; city?: string; zip_code?: string; source: string }[]>([]);
  const [customerSearchTimer, setCustomerSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Edit modal
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: "", customer_phone: "", customer_email: "", customer_address: "",
    city: "", zip_code: "", status: "", payment_status: "", payment_method: "",
    shipping_cost: "", discount: "0", notes: "",
    consignment_id: "", courier_type: "",
    items: [] as CreateItem[],
  });
  const [editProductSearch, setEditProductSearch] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Courier connection state + auto score check
  const [courierConnected, setCourierConnected] = useState(false);
  const [activeCouriers, setActiveCouriers] = useState<{ id: "steadfast" | "pathao"; label: string }[]>([]);
  const autoCheckedRef = useRef(new Set<number>());

  useEffect(() => {
    // Treat "connected" as: at least one courier configured (any provider).
    // Score endpoint walks all enabled providers, so we don't need to ping balance.
    // Also remember the list so the edit modal can show them as picker options
    // for orders sent manually outside the dashboard.
    api.admin.listActiveCouriers()
      .then((r) => {
        const list = r.couriers || [];
        setActiveCouriers(list);
        setCourierConnected(list.length > 0);
      })
      .catch(() => { setActiveCouriers([]); setCourierConnected(false); });
  }, []);

  // Auto-check courier scores when courier is connected.
  //
  // Improvements over the prior sequential loop:
  //  1. **TTL** — re-check if courier_score_at is older than SCORE_TTL_MS (24h).
  //     Stale orders refresh on next page visit so admin sees current rates.
  //  2. **Concurrency cap** — pool of SCORE_CONCURRENCY (3) parallel workers.
  //     ~3× faster than serial without spamming Steadfast.
  //  3. **429 backoff** — when /admin/courier returns 429, halt remaining
  //     queue for this mount and back off; per-mount autoCheckedRef still
  //     prevents same-id refetch.
  useEffect(() => {
    if (!courierConnected || orders.length === 0) return;
    const SCORE_TTL_MS = 24 * 60 * 60 * 1000;
    const SCORE_CONCURRENCY = 3;
    const now = Date.now();
    const isStale = (iso?: string | null) => {
      if (!iso) return true;
      const t = Date.parse(iso);
      return Number.isNaN(t) || (now - t) > SCORE_TTL_MS;
    };
    const queue = orders.filter((o) =>
      !autoCheckedRef.current.has(o.id) && (!o.courier_score || isStale(o.courier_score_at))
    );
    if (queue.length === 0) return;
    queue.forEach((o) => autoCheckedRef.current.add(o.id));

    let cancelled = false;
    let halted = false;
    let cursor = 0;
    const next = () => (cancelled || halted ? null : queue[cursor++] ?? null);

    async function worker() {
      while (true) {
        const order = next();
        if (!order) return;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res: any = await api.admin.checkCourierScore(order.id);
          const ratio = res?.success_ratio || "0.0%";
          setOrders((prev) => prev.map((o) =>
            o.id === order.id ? { ...o, courier_score: ratio, courier_score_at: new Date().toISOString() } : o
          ));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("429")) { halted = true; return; }
          // Soft-fail single order; keep workers running for the rest.
        }
      }
    }
    const workers = Array.from({ length: Math.min(SCORE_CONCURRENCY, queue.length) }, () => worker());
    Promise.all(workers).catch(() => {});

    return () => { cancelled = true; };
  }, [courierConnected, orders]);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchAll = useCallback((background = false) => {
    if (!background) setLoading(true);
    // Build paginated query. Server filters by status + search so each page
    // is computed against the FULL result set, not just the rows currently
    // in memory. Page is 1-indexed.
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    if (statusFilter) qs.set("status", statusFilter);
    if (search.trim()) qs.set("search", search.trim());
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo) qs.set("date_to", dateTo);
    api.admin.getOrders(qs.toString())
      .then((res) => {
        const all = res.data || res || [];
        // Trashed orders only appear when the filter is explicitly "trashed".
        // For any other view (including no filter) we hide them. Server
        // doesn't know about this rule yet — re-applying it here for now.
        setOrders(statusFilter === "trashed" ? all : all.filter((o: Order) => o.status !== "trashed"));
        // Read pagination meta. Fall back to current data length if server
        // didn't return meta (e.g. legacy callers / tests).
        const total = res?.meta?.total ?? res?.total ?? all.length;
        setTotalOrders(Number(total) || 0);
      })
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
      .finally(() => setLoading(false));
  }, [statusFilter, search, page, dateFrom, dateTo]);

  // Re-fetch whenever filter / search / page changes. SSR seeded the initial
  // list with page 1 unfiltered; skip the very first run when initialData is
  // present so we don't double-load.
  const skipFirstFetchRef = useRef(!!initialData?.items);
  useEffect(() => {
    if (skipFirstFetchRef.current) { skipFirstFetchRef.current = false; return; }
    // Debounce so search-as-you-type doesn't fire a request per keystroke.
    // Status / page changes also go through the debounce — 250ms is short
    // enough to feel instant on a click and long enough to coalesce typing.
    const handle = setTimeout(() => fetchAll(), 250);
    return () => clearTimeout(handle);
  }, [statusFilter, search, page, dateFrom, dateTo, fetchAll]);

  // When any filter changes, reset back to page 1 so we don't end up stranded
  // on (say) page 5 of an empty result set.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, dateFrom, dateTo]);

  // Close bulk status dropdown on outside click
  useEffect(() => {
    if (!bulkStatusOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-bulk-status]")) setBulkStatusOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bulkStatusOpen]);

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
        discount: String(o.discount ?? 0),
        notes: o.notes || "",
        consignment_id: String(o.consignment_id || ""),
        courier_type: String(o.courier_type || ""),
        items: (o.items || []).map((i: any) => ({
          product_id: i.product_id || i.productId,
          product_name: i.product_name || i.productName || "",
          price: Number(i.price),
          stock: 9999,
          quantity: Number(i.quantity),
          image: i.product?.image || "",
          // Carry variant identity through edit so the saved order keeps it.
          variant_id: i.variant_id || i.variantId || undefined,
          variant_label: i.variant_label || i.variantLabel || undefined,
        })),
      });
      setEditProductSearch("");
      // Fetch products for picker if not loaded
      if (allProducts.length === 0) {
        api.admin.getProducts("per_page=200").then((res) => {
          const data = res.data || res || [];
          setAllProducts(Array.isArray(data) ? data.map((p: Record<string, unknown>) => ({
            id: p.id as number,
            name: (p.name as string) || "",
            slug: (p.slug as string) || "",
            price: Number(p.price) || 0,
            stock: Number(p.stock) || 0,
            image: (p.image as string) || "",
            has_variations: Boolean(p.has_variations),
            variants: Array.isArray(p.variants) ? (p.variants as Record<string, unknown>[]).map((v) => ({
              id: v.id as number,
              label: (v.label as string) || "",
              price: Number(v.price) || 0,
              stock: Number(v.stock) || 0,
              image: (v.image as string) || "",
              unlimited_stock: Boolean(v.unlimited_stock),
              is_active: v.is_active !== false,
            })) : [],
          })) : []);
        }).catch(() => {});
      }
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
      const subtotal = editForm.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const shipping = Number(editForm.shipping_cost) || 0;
      const discount = Number(editForm.discount) || 0;
      // Courier fields — admin may attach a consignment ID + provider for an
      // order sent manually outside the dashboard. Send only when changed
      // from the existing values to avoid clobbering null with empty string
      // on every save (which would also re-run the auto-shipped logic
      // server-side unnecessarily).
      const consignmentChanged = editForm.consignment_id !== String(editOrder.consignment_id || "");
      const courierTypeChanged = editForm.courier_type !== String(editOrder.courier_type || "");
      const courierPatch: Record<string, unknown> = {};
      if (consignmentChanged) courierPatch.consignment_id = editForm.consignment_id.trim() || null;
      if (courierTypeChanged) courierPatch.courier_type = editForm.courier_type || null;
      const res = await api.admin.updateOrder(editOrder.id, {
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        customer_email: editForm.customer_email,
        customer_address: editForm.customer_address,
        status: editForm.status,
        payment_status: autoPayment,
        payment_method: editForm.payment_method,
        shipping_cost: shipping,
        notes: editForm.notes,
        subtotal,
        discount,
        total: Math.max(0, subtotal + shipping - discount),
        items: editForm.items.map(i => ({ product_id: i.product_id, product_name: i.product_name, price: i.price, quantity: i.quantity, variant_id: i.variant_id, variant_label: i.variant_label })),
        ...courierPatch,
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
      // Use the validated /status endpoint (orderStatusSchema accepts "trashed")
      // and re-fetch from server so the list reflects the persisted state — not
      // just an optimistic local filter that can hide a failed write.
      await api.admin.updateOrderStatus(orderId, { status: "trashed" });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "trashed" } : o));
      showToast(lang === "en" ? "Moved to trash" : "ট্র্যাশে পাঠানো হয়েছে");
      fetchAll(true);
    } catch {
      showToast(lang === "en" ? "Failed to trash" : "ট্র্যাশে পাঠাতে সমস্যা", "error");
    }
  };

  const handlePermanentDelete = async (orderId: number) => {
    if (!confirm(lang === "en" ? "Permanently delete this order? This cannot be undone." : "এই অর্ডারটি স্থায়ীভাবে মুছে ফেলবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।")) return;
    try {
      await api.admin.deleteOrder(orderId, true);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showToast(lang === "en" ? "Permanently deleted" : "স্থায়ীভাবে মুছে ফেলা হয়েছে");
    } catch {
      showToast(lang === "en" ? "Failed to delete" : "মুছতে সমস্যা হয়েছে", "error");
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedOrders.size === 0) return;
    if (!confirm(lang === "en" ? `Permanently delete ${selectedOrders.size} orders?` : `${selectedOrders.size}টি অর্ডার স্থায়ীভাবে মুছবেন?`)) return;
    try {
      await Promise.all(Array.from(selectedOrders).map((id) => api.admin.deleteOrder(id, true)));
      setOrders((prev) => prev.filter((o) => !selectedOrders.has(o.id)));
      setSelectedOrders(new Set());
      showToast(lang === "en" ? "Deleted permanently" : "স্থায়ীভাবে মুছে ফেলা হয়েছে");
    } catch {
      showToast(lang === "en" ? "Bulk delete failed" : "মুছতে সমস্যা", "error");
    }
  };

  const toggleSelectOrder = (id: number) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    // Select-all spans every visible order (sent or not). Bulk actions that
    // only apply to unsent orders filter the selection at execution time.
    if (selectedOrders.size >= filtered.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filtered.map(o => o.id)));
    }
  };

  // Execute bulk send to a specific provider. Each provider's API builds its own payload format.
  const executeBulkSend = async (provider: "steadfast" | "pathao", orderIds: number[]) => {
    const courierLabel = provider === "pathao" ? "Pathao" : "Steadfast";
    const confirmMsg = provider === "pathao"
      ? (lang === "en"
          ? `Send ${orderIds.length} orders to Pathao?\n\nAddresses will be auto-matched to Pathao city/zone/area. Orders that can't be matched fall back to your default location.`
          : `${orderIds.length}টি অর্ডার Pathao-এ পাঠাবেন?\n\nঠিকানা স্বয়ংক্রিয়ভাবে Pathao city/zone/area তে ম্যাচ হবে। ম্যাচ না হলে ডিফল্ট লোকেশনে যাবে।`)
      : (lang === "en" ? `Send ${orderIds.length} orders to ${courierLabel}?` : `${orderIds.length}টি অর্ডার ${courierLabel}-এ পাঠাবেন?`);
    if (!confirm(confirmMsg)) return;
    setBulkSending(true);
    if (provider === "pathao") {
      showToast(lang === "en" ? `Matching ${orderIds.length} addresses…` : `${orderIds.length}টি ঠিকানা ম্যাচ হচ্ছে…`);
    }
    try {
      const url = provider === "pathao" ? "/api/v1/admin/courier/pathao" : "/api/v1/admin/courier";
      const res = await fetch(url, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_send", order_ids: orderIds }),
      }).then(r => r.json());

      const sent = res.results?.filter((r: any) => r.status === "success").length || 0;
      const failed = res.results?.filter((r: any) => r.status === "error").length || 0;
      const autoMatched: number | undefined = res.auto_matched;
      const fallback: number | undefined = res.fallback;

      if (res.results) {
        for (const r of res.results) {
          if (r.status === "success" && r.consignment_id) {
            setOrders(prev => prev.map(o => o.id === r.order_id ? { ...o, courier_sent: true, courier_type: provider, consignment_id: r.consignment_id, courier_status: "pending" } : o));
          }
        }
      }

      setSelectedOrders(new Set());
      setActiveCourier(provider); // remember last-used for balance/UI
      let msg = `${sent} sent to ${courierLabel}${failed > 0 ? `, ${failed} failed` : ""}`;
      if (provider === "pathao" && typeof autoMatched === "number") {
        msg += ` · ${autoMatched} auto-matched${fallback ? `, ${fallback} used defaults` : ""}`;
      }
      showToast(msg, failed > 0 ? "error" : "success");
    } catch {
      showToast(lang === "en" ? "Bulk send failed" : "বাল্ক সেন্ড ব্যর্থ", "error");
    } finally {
      setBulkSending(false);
    }
  };

  // Wrapper: pick courier dynamically. 0 → toast, 1 → auto, 2+ → modal.
  // Filters out orders already sent to courier so a mixed selection still
  // works — only the unsent subset gets dispatched.
  const handleBulkSendToCourier = () => {
    if (selectedOrders.size === 0) return;
    if (availableCouriers.length === 0) {
      showToast(lang === "en" ? "No courier configured. Go to Settings → Courier." : "কোনো কুরিয়ার কনফিগার করা নেই", "error");
      return;
    }
    const ids = Array.from(selectedOrders).filter((id) => {
      const o = orders.find((x) => x.id === id);
      return o && !o.courier_sent;
    });
    if (ids.length === 0) {
      showToast(lang === "en" ? "All selected orders are already sent" : "নির্বাচিত সব অর্ডার ইতিমধ্যে পাঠানো হয়েছে", "error");
      return;
    }
    const skipped = selectedOrders.size - ids.length;
    if (skipped > 0) {
      showToast(lang === "en" ? `Skipping ${skipped} already-sent order${skipped > 1 ? "s" : ""}` : `${skipped}টি অর্ডার আগেই পাঠানো হয়েছে, বাদ দেওয়া হলো`);
    }
    if (availableCouriers.length === 1) {
      const provider = availableCouriers[0].id;
      if (provider === "pathao") setPathaoBulkReviewIds(ids);
      else executeBulkSend(provider, ids);
    } else {
      setChooserPending({ kind: "bulk", orderIds: ids });
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectedOrders.size === 0) return;
    setBulkStatusOpen(false);
    setBulkStatusLoading(true);
    try {
      // Per-order payload so payment_status syncs based on each order's payment method.
      const updates = Array.from(selectedOrders).map((id) => {
        const cur = orders.find((o) => o.id === id);
        const ps = derivePaymentStatus(status, cur?.payment_method);
        return { id, payload: { status, ...(ps ? { payment_status: ps } : {}) } as Record<string, string> };
      });
      await Promise.all(updates.map((u) => api.admin.updateOrderStatus(u.id, u.payload)));
      setOrders((prev) => prev.map((o) => {
        const u = updates.find((x) => x.id === o.id);
        return u ? { ...o, ...u.payload } : o;
      }));
      setSelectedOrders(new Set());
      showToast(lang === "en" ? `${selectedOrders.size} orders updated to ${status}` : `${selectedOrders.size}টি অর্ডার আপডেট হয়েছে`);
    } catch {
      showToast(lang === "en" ? "Bulk update failed" : "আপডেট ব্যর্থ", "error");
    } finally {
      setBulkStatusLoading(false);
    }
  };

  const handleBulkTrash = async () => {
    if (selectedOrders.size === 0) return;
    if (!confirm(lang === "en" ? `Move ${selectedOrders.size} orders to trash?` : `${selectedOrders.size}টি অর্ডার ট্র্যাশে পাঠাবেন?`)) return;
    setBulkStatusLoading(true);
    try {
      await Promise.all(
        Array.from(selectedOrders).map((id) =>
          api.admin.updateOrder(id, { status: "trashed" })
        )
      );
      setOrders((prev) => prev.filter((o) => !selectedOrders.has(o.id)));
      setSelectedOrders(new Set());
      showToast(lang === "en" ? `${selectedOrders.size} orders trashed` : `${selectedOrders.size}টি অর্ডার ট্র্যাশ হয়েছে`);
    } catch {
      showToast(lang === "en" ? "Bulk trash failed" : "ট্র্যাশ ব্যর্থ", "error");
    } finally {
      setBulkStatusLoading(false);
    }
  };

  // Pathao prefill modal state — opened for single Pathao sends so user can pick city/zone/area.
  const [pathaoModalOrder, setPathaoModalOrder] = useState<Order | null>(null);
  const [pathaoBulkReviewIds, setPathaoBulkReviewIds] = useState<number[] | null>(null);

  // Execute single send to specific provider. Each provider's route uses its own payload format.
  // Pathao single sends route through the prefill modal first (city/zone/area required by Pathao API).
  const executeSendToCourier = async (provider: "steadfast" | "pathao", orderId: number) => {
    if (provider === "pathao") {
      const o = orders.find((x) => x.id === orderId);
      if (o) { setPathaoModalOrder(o); return; }
    }
    setCourierLoading(orderId);
    try {
      const res = await api.admin.sendToCourier(orderId, provider);
      if (res.consignment_id || res.order?.consignment_id) {
        const cid = String(res.consignment_id || res.order?.consignment_id);
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, courier_sent: true, courier_type: provider, consignment_id: cid, courier_status: "pending" } : o));
        if (detailOrder?.id === orderId) setDetailOrder((prev) => prev ? { ...prev, courier_sent: true, courier_type: provider, consignment_id: cid, courier_status: "pending" } : prev);
        setActiveCourier(provider);
        showToast(`${provider === "pathao" ? "Pathao" : "Steadfast"}-এ পাঠানো হয়েছে!`);
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

  // Wrapper: pick courier dynamically. 0 → toast, 1 → auto, 2+ → modal.
  const handleSendToCourier = (orderId: number) => {
    if (availableCouriers.length === 0) {
      showToast(lang === "en" ? "No courier configured. Go to Settings → Courier." : "কোনো কুরিয়ার কনফিগার করা নেই", "error");
      return;
    }
    if (availableCouriers.length === 1) {
      executeSendToCourier(availableCouriers[0].id, orderId);
    } else {
      setChooserPending({ kind: "single", orderId });
    }
  };

  // Resolve chooser selection → execute pending send.
  const handleChooserPick = (provider: "steadfast" | "pathao") => {
    const pending = chooserPending;
    setChooserPending(null);
    if (!pending) return;
    if (pending.kind === "single") executeSendToCourier(provider, pending.orderId);
    else if (provider === "pathao") setPathaoBulkReviewIds(pending.orderIds);
    else executeBulkSend(provider, pending.orderIds);
  };

  const handleCheckCourierStatus = async (orderId: number) => {
    setCourierLoading(orderId);
    try {
      // Pick provider from the order's courier_type, fallback to active selection
      const o = orders.find((x) => x.id === orderId);
      const provider = (o?.courier_type as "steadfast" | "pathao" | undefined) || activeCourier;
      const res = await api.admin.checkCourierStatus(orderId, provider);
      if (res.delivery_status) {
        // Mirror the server-side auto-sync (courierStatusMap.ts) so the row's
        // Status pill flips instantly without waiting for a re-fetch. Server
        // already wrote it to the DB inside the same request; this is purely
        // a local optimistic patch.
        //
        // Compute the derived flip INSIDE the functional setter so we never
        // operate on a stale closure of `orders`. A separate flag captures
        // whether we should also fire the /status PUT (for CAPI + payment).
        const derived = mapCourierStatusToOrderStatus(res.delivery_status);
        let firedStatus: "shipped" | "delivered" | "cancelled" | null = null;
        let firedPayment: "paid" | null = null;
        setOrders((prev) => prev.map((o) => {
          if (o.id !== orderId) return o;
          const willFlipStatus =
            !!derived && o.status !== "trashed" && o.status !== derived;
          const willMarkPaid =
            derived === "delivered" && o.payment_status !== "paid";
          if (willFlipStatus) firedStatus = derived;
          if (willMarkPaid) firedPayment = "paid";
          return {
            ...o,
            courier_status: res.delivery_status,
            ...(willFlipStatus ? { status: derived! } : {}),
            ...(willMarkPaid ? { payment_status: "paid" } : {}),
          };
        }));
        setDetailOrder((prev) => {
          if (!prev || prev.id !== orderId) return prev;
          const willFlipStatus =
            !!derived && prev.status !== "trashed" && prev.status !== derived;
          const willMarkPaid =
            derived === "delivered" && prev.payment_status !== "paid";
          return {
            ...prev,
            courier_status: res.delivery_status,
            ...(willFlipStatus ? { status: derived! } : {}),
            ...(willMarkPaid ? { payment_status: "paid" } : {}),
          };
        });
        // Fire /status PUT only if we actually flipped — that route also
        // updates payment_status server-side and triggers FB CAPI Purchase /
        // OrderCancelled refire (the courier route only touches status +
        // courierStatus, not payment or CAPI).
        if (firedStatus) {
          api.admin.updateOrderStatus(orderId, {
            status: firedStatus,
            ...(firedPayment ? { payment_status: firedPayment } : {}),
          }).catch(() => {});
        }
        showToast(`কুরিয়ার স্ট্যাটাস: ${res.delivery_status}`);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        showToast((res as any)?.error || "স্ট্যাটাস চেক করতে সমস্যা হয়েছে", "error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "স্ট্যাটাস চেক করতে সমস্যা হয়েছে";
      showToast(msg, "error");
    } finally {
      setCourierLoading(null);
    }
  };

  const handleBulkCourierRefresh = async (scope: "page" | "pending") => {
    // For "page" scope we already have everything in memory.
    // For "pending" scope we need to walk the entire dataset across all pages —
    // `orders` only holds the current page, so prior versions silently scanned
    // 20 orders even when the DB had thousands.
    let eligible: Order[] = [];
    if (scope === "page") {
      eligible = filtered.filter(
        (o) => o.courier_sent && o.courier_status !== "delivered" && o.courier_status !== "cancelled"
      );
    } else {
      // Walk all pages of /admin/orders. Cap at 200 pages × 20 = 4000 just to
      // bound runaway loops on a corrupt total. Each page is ~1 small request.
      try {
        const collected: Order[] = [];
        const seen = new Set<number>();
        // First fetch tells us the total count; loop based on that.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const first = await api.admin.getOrders(`page=1`) as any;
        const total = Number(first?.total ?? first?.pagination?.total ?? 0);
        const perPage = 100;
        const lastPage = Math.max(1, Math.ceil(total / perPage));
        const pushPage = (items: Order[]) => {
          for (const it of items ?? []) {
            if (!seen.has(it.id)) { seen.add(it.id); collected.push(it); }
          }
        };
        pushPage((first?.items ?? first?.data ?? []) as Order[]);
        for (let p = 2; p <= Math.min(lastPage, 200); p++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = await api.admin.getOrders(`page=${p}`) as any;
          pushPage((res?.items ?? res?.data ?? []) as Order[]);
        }
        eligible = collected.filter(
          (o) => o.courier_sent && o.courier_status !== "delivered" && o.courier_status !== "cancelled"
        );
      } catch {
        // Fallback to in-memory if the multi-page walk fails
        eligible = orders.filter(
          (o) => o.courier_sent && o.courier_status !== "delivered" && o.courier_status !== "cancelled"
        );
      }
    }
    if (eligible.length === 0) {
      showToast(lang === "en" ? "No orders to refresh" : "রিফ্রেশ করার মতো কোনো অর্ডার নেই");
      setBulkRefreshOpen(false);
      return;
    }
    setBulkRefreshing(true);
    setBulkRefreshProgress({ done: 0, total: eligible.length, delivered: 0 });
    let deliveredCount = 0;
    for (const order of eligible) {
      try {
        const provider = (order.courier_type as "steadfast" | "pathao" | undefined) || activeCourier;
        const res = await api.admin.checkCourierStatus(order.id, provider);
        if (res.delivery_status) {
          // Mirror single-row refresh: map courier status → order status and
          // flip BOTH locally (and server-side via /status PUT for CAPI +
          // payment_status). The courier endpoint already wrote `courierStatus`
          // and `status` to the DB via buildStatusUpdate, but the /status PUT
          // is what fires FB CAPI Purchase / OrderCancelled and sets
          // payment_status=paid on delivery.
          //
          // Previous version only handled `delivered` here; "paid_return" /
          // "cancelled" / "returned" / "refused" would silently not flip
          // status in the UI even though courier_status updated.
          const derived = mapCourierStatusToOrderStatus(res.delivery_status);
          const willFlipStatus =
            !!derived && order.status !== "trashed" && order.status !== derived;
          const willMarkPaid =
            derived === "delivered" && order.payment_status !== "paid";
          setOrders((prev) => prev.map((o) => o.id === order.id ? {
            ...o,
            courier_status: res.delivery_status,
            ...(willFlipStatus ? { status: derived! } : {}),
            ...(willMarkPaid ? { payment_status: "paid" } : {}),
          } : o));
          if (willFlipStatus) {
            if (derived === "delivered") deliveredCount++;
            try {
              await api.admin.updateOrderStatus(order.id, {
                status: derived!,
                ...(willMarkPaid ? { payment_status: "paid" } : {}),
              });
            } catch {}
          }
        }
      } catch {}
      setBulkRefreshProgress((p) => ({ ...p, done: p.done + 1, delivered: deliveredCount }));
    }
    setBulkRefreshing(false);
    setBulkRefreshOpen(false);
    showToast(lang === "en"
      ? `${eligible.length} orders checked${deliveredCount > 0 ? ` • ${deliveredCount} auto-delivered` : ""}`
      : `${eligible.length}টি অর্ডার চেক হয়েছে${deliveredCount > 0 ? ` • ${deliveredCount}টি ডেলিভারড` : ""}`);
  };

  const handleBulkScoreCheck = async (scope: "page" | "all") => {
    const eligible = (scope === "page" ? filtered : orders).filter(
      (o) => !o.courier_score && o.status !== "delivered"
    );
    if (eligible.length === 0) {
      showToast(lang === "en" ? "No orders to check" : "চেক করার মতো কোনো অর্ডার নেই");
      setBulkScoreOpen(false);
      return;
    }
    setBulkScoreChecking(true);
    setBulkScoreProgress({ done: 0, total: eligible.length });
    for (const order of eligible) {
      try {
        const res = await api.admin.checkCourierScore(order.id);
        const ratio = res.success_ratio || "0.0%";
        setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, courier_score: ratio } : o));
      } catch { break; }
      setBulkScoreProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setBulkScoreChecking(false);
    setBulkScoreOpen(false);
    showToast(lang === "en"
      ? `${eligible.length} scores checked`
      : `${eligible.length}টি স্কোর চেক হয়েছে`);
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
    // Pre-select first shipping zone
    if (shippingZones.length > 0) {
      setCreateForm(f => ({ ...f, shipping_cost: String(shippingZones[0].rate) }));
    }
    // Fetch products for picker. Must include has_variations + variants so
    // the dropdown can render the parent header + variant rows for variable
    // products. Without this, admins clicked the parent and the order saved
    // with variantId=null + parent price (often 0) — same data shape that
    // customers were generating before the order POST hard-gate landed.
    // Mirrors the openEdit mapper so create + edit pickers behave identically.
    api.admin.getProducts("per_page=200").then((res) => {
      const data = res.data || res || [];
      setAllProducts(Array.isArray(data) ? data.map((p: Record<string, unknown>) => ({
        id: p.id as number,
        name: (p.name as string) || "",
        slug: (p.slug as string) || "",
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
        image: (p.image as string) || "",
        has_variations: Boolean(p.has_variations),
        variants: Array.isArray(p.variants) ? (p.variants as Record<string, unknown>[]).map((v) => ({
          id: v.id as number,
          label: (v.label as string) || "",
          price: Number(v.price) || 0,
          stock: Number(v.stock) || 0,
          image: (v.image as string) || "",
          unlimited_stock: Boolean(v.unlimited_stock),
          is_active: v.is_active !== false,
        })) : [],
      })) : []);
    }).catch(() => {});
  };

  // ── Picker helpers (shared by Create + Edit dropdowns) ──
  // normalizeQ: strip leading/trailing/internal multi-space so "  red   xl  "
  // matches "Red XL". Also lowercases.
  const normalizeQ = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const matchesPicker = (p: PickerProduct, q: string) => {
    const nq = normalizeQ(q);
    if (!nq) return true;
    if (normalizeQ(p.name).includes(nq)) return true;
    if ((p.slug || "").toLowerCase().includes(nq)) return true;
    if (String(p.price).includes(nq)) return true;
    // Match against variant labels too — searching "red" should surface a
    // parent product whose Red variant is the only match.
    if (p.variants?.some((v) => normalizeQ(v.label).includes(nq))) return true;
    return false;
  };
  const filterPicker = (items: CreateItem[], q: string) =>
    allProducts.filter((p) => {
      if (!matchesPicker(p, q)) return false;
      if (p.has_variations && p.variants?.length) {
        // Keep parent visible while at least one variant is still pickable.
        return p.variants.some((v) => v.is_active !== false && !items.some((it) => it.product_id === p.id && (it.variant_id || 0) === v.id));
      }
      // Simple product — hide entirely once added.
      return !items.some((it) => it.product_id === p.id && !it.variant_id);
    });

  const buildItem = (product: PickerProduct, variant?: PickerVariant): CreateItem => ({
    product_id: product.id,
    product_name: product.name,
    price: variant?.price ?? product.price,
    stock: variant?.stock ?? product.stock,
    quantity: 1,
    image: variant?.image || product.image,
    variant_id: variant?.id,
    variant_label: variant?.label,
  });

  const addProductToOrder = (product: PickerProduct, variant?: PickerVariant) => {
    const vid = variant?.id || 0;
    if (createForm.items.some((i) => i.product_id === product.id && (i.variant_id || 0) === vid)) {
      showToast("পণ্যটি ইতিমধ্যে যোগ করা হয়েছে", "error");
      return;
    }
    setCreateForm((prev) => ({ ...prev, items: [...prev.items, buildItem(product, variant)] }));
    setProductSearch("");
  };

  const addProductToEdit = (product: PickerProduct, variant?: PickerVariant) => {
    const vid = variant?.id || 0;
    if (editForm.items.some((i) => i.product_id === product.id && (i.variant_id || 0) === vid)) {
      showToast("পণ্যটি ইতিমধ্যে যোগ করা হয়েছে", "error");
      return;
    }
    setEditForm((prev) => ({ ...prev, items: [...prev.items, buildItem(product, variant)] }));
    setEditProductSearch("");
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
        variant_id: i.variant_id,
        variant_label: i.variant_label,
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
        city: createForm.city || undefined,
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
      const totalCancelled = res.total_cancelled ?? Math.max(0, totalParcels - totalDelivered);
      const ratio = res.success_ratio || (totalParcels > 0 ? `${((totalDelivered / totalParcels) * 100).toFixed(1)}%` : "0%");

      // If every provider failed, surface their reasons
      if (res.success === false) {
        showToast(res.message || "Score check failed", "error");
        return;
      }

      // Update order in list with combined ratio
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, courier_score: ratio } : o));

      // Show popup with combined + per-courier breakdown
      setScorePopup({
        orderId,
        total_parcels: totalParcels,
        total_delivered: totalDelivered,
        total_cancelled: totalCancelled,
        success_ratio: ratio,
        providers: res.providers,
      });
    } catch (err) {
      const e = err as { message?: string };
      showToast(e.message || "Score check failed", "error");
    } finally {
      setScoreLoading(null);
    }
  };

  // Derive payment_status from a new order status.
  // Rules:
  //  - delivered  → paid (always; collected on delivery or already prepaid)
  //  - any other  → unpaid for COD orders (money not yet collected),
  //                 leave untouched for online prepaid (bkash/nagad/bank) since payment already received.
  // Returns undefined when no auto-change should happen.
  const derivePaymentStatus = (newStatus: string, paymentMethod?: string): string | undefined => {
    if (newStatus === "delivered") return "paid";
    if (paymentMethod === "cod" || !paymentMethod) return "unpaid";
    return undefined;
  };

  const handleStatusUpdate = async (orderId: number) => {
    const newStatus = pendingStatus[orderId];
    if (!newStatus) return;
    setUpdatingId(orderId);
    try {
      const payload: Record<string, string> = { status: newStatus };
      const cur = orders.find((o) => o.id === orderId);
      const ps = derivePaymentStatus(newStatus, cur?.payment_method);
      if (ps) payload.payment_status = ps;
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

  // Status / search / date filtering all happen server-side now (see fetchAll
  // — it sends the params and the API filters + paginates). The only client
  // filter still needed is a defensive status check so an order whose status
  // was just changed inline (optimistic setOrders) leaves the current view
  // immediately, before the next debounced re-fetch lands.
  // Deduplicate by ID first — guards against the race where createOrder
  // prepends a new row and a concurrent fetchAll returns the same row,
  // and against React StrictMode double-invoking the mount effect.
  const filtered = Array.from(new Map(orders.map((o) => [o.id, o])).values())
    .filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (!statusFilter && o.status === "trashed") return false;
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
          {/* Row 1: Filters + actions */}
          <div className="flex flex-wrap gap-2 md:gap-3 items-center">
            <div className="flex gap-2 items-center w-full md:w-auto md:contents">
              <div className="flex-1 md:flex-none min-w-0">
                <DateRangePicker
                  from={dateFrom}
                  to={dateTo}
                  onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
                />
              </div>
              <div className="flex-1 md:flex-none min-w-0">
                <StatusFilter
                  value={statusFilter}
                  options={STATUS_OPTIONS}
                  onChange={setStatusFilter}
                  placeholder={t("filter.allStatus")}
                />
              </div>
              {/* Add Order button — inline on mobile, normal flow on desktop */}
              <button type="button" onClick={openCreateOrder}
                className="md:hidden shrink-0 flex items-center justify-center p-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-light)] transition-colors"
                title={`${t("btn.add")} ${t("dash.orders")}`}>
                <FiPlus className="w-4 h-4" />
              </button>
            </div>
            {/* Bulk actions — shown when orders are selected */}
            {selectedOrders.size > 0 && (() => {
              // Count of selected orders that haven't been sent yet — only these will be dispatched
              const unsentSelected = Array.from(selectedOrders).filter((id) => {
                const o = orders.find((x) => x.id === id);
                return o && !o.courier_sent;
              }).length;
              return (
              <>
                {/* Send to Courier — only ships unsent subset */}
                <button type="button" onClick={handleBulkSendToCourier} disabled={bulkSending || bulkStatusLoading || unsentSelected === 0}
                  style={{ backgroundColor: "var(--primary, #0f5931)", color: "#fff" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in oklab, var(--primary, #0f5931) 85%, black)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--primary, #0f5931)"; }}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 whitespace-nowrap">
                  <FiTruck className="w-4 h-4" />
                  <span className="hidden sm:inline">{bulkSending ? "Sending..." : (availableCouriers.length === 1 ? `Send ${unsentSelected} to ${availableCouriers[0].label}` : `Send ${unsentSelected} to Courier`)}</span>
                  <span className="sm:hidden">{bulkSending ? "..." : unsentSelected}</span>
                </button>

                {/* Bulk Status Change */}
                <div className="relative" data-bulk-status>
                  <button type="button" onClick={() => setBulkStatusOpen((o) => !o)} disabled={bulkStatusLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap">
                    <FiCheckCircle className="w-4 h-4 text-gray-500" />
                    <span className="hidden sm:inline">{lang === "en" ? "Set Status" : "স্ট্যাটাস"}</span>
                    <FiChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${bulkStatusOpen ? "rotate-180" : ""}`} />
                  </button>
                  {bulkStatusOpen && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/10 min-w-44 py-1">
                      {[
                        { value: "pending",    label: lang === "en" ? "Pending" : "পেন্ডিং",       dot: "bg-yellow-400" },
                        { value: "confirmed",  label: lang === "en" ? "Confirmed" : "কনফার্মড",     dot: "bg-blue-400" },
                        { value: "processing", label: lang === "en" ? "Processing" : "প্রসেসিং",   dot: "bg-indigo-400" },
                        { value: "shipped",    label: lang === "en" ? "Courier Sent" : "কুরিয়ার পাঠানো হয়েছে", dot: "bg-purple-400" },
                        { value: "delivered",  label: lang === "en" ? "Delivered" : "ডেলিভারড",    dot: "bg-green-400" },
                        { value: "cancelled",  label: lang === "en" ? "Cancelled" : "বাতিল",       dot: "bg-red-400" },
                      ].map(({ value, label, dot }) => (
                        <button key={value} type="button" onClick={() => handleBulkStatusChange(value)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bulk Trash or Bulk Permanent Delete — admin-only */}
                {isAdmin && (statusFilter === "trashed" ? (
                  <button type="button" onClick={handleBulkPermanentDelete} disabled={bulkStatusLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-red-500 rounded-xl text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50 whitespace-nowrap">
                    <FiXCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">{lang === "en" ? "Delete Forever" : "স্থায়ীভাবে মুছুন"}</span>
                  </button>
                ) : (
                  <button type="button" onClick={handleBulkTrash} disabled={bulkStatusLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 whitespace-nowrap">
                    <FiTrash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{lang === "en" ? "Trash" : "ট্র্যাশ"}</span>
                  </button>
                ))}
              </>
              );
            })()}
            {/* Search: visible only on desktop, inline */}
            <div className="relative flex-1 min-w-52 hidden md:block">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("search.customers")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[var(--primary)] focus:outline-none"
              />
            </div>
            {/* Add Order button — desktop only (mobile version is inline above) */}
            <button type="button" onClick={openCreateOrder}
              style={{ backgroundColor: "var(--primary, #0f5931)", color: "#fff" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in oklab, var(--primary, #0f5931) 85%, black)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--primary, #0f5931)"; }}
              className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ml-auto">
              <FiPlus className="w-4 h-4" />
              <span>{t("btn.add")} {t("dash.orders")}</span>
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
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
        </div>

        {/* Mobile select-all bar — mirrors desktop table header checkbox */}
        {!loading && filtered.length > 0 && (
          <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-100 mb-3">
            <input
              type="checkbox"
              checked={selectedOrders.size > 0 && selectedOrders.size >= filtered.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-[var(--primary)] shrink-0"
            />
            <span className="text-xs font-medium text-gray-600">
              {selectedOrders.size > 0
                ? (lang === "en" ? `${selectedOrders.size} selected` : `${toBn(selectedOrders.size)}টি নির্বাচিত`)
                : (lang === "en" ? `Select all (${filtered.length})` : `সব নির্বাচন (${toBn(filtered.length)})`)}
            </span>
          </div>
        )}

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center text-gray-400">{t("empty.orders")}</div>
          ) : filtered.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input type="checkbox" checked={selectedOrders.has(o.id)} onChange={() => toggleSelectOrder(o.id)} className="w-4 h-4 accent-[var(--primary)] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-medium">#{toBn(o.id)}</span>
                        <span className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString(lang === "en" ? "en-US" : "bn-BD")}</span>
                        <span className="text-xs text-gray-400">{new Date(o.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "bn-BD", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="font-semibold text-gray-800 truncate">{o.customer_name}</p>
                      {(() => { const ph = o.customer_phone || o.phone || ""; return ph ? (
                        <a href={`tel:${ph}`} onClick={(e) => e.stopPropagation()} className="text-xs text-blue-600 hover:underline">{ph}</a>
                      ) : <p className="text-xs text-gray-500">—</p>; })()}
                    </div>
                  </div>
                  <p className="text-lg font-bold text-[var(--primary)] shrink-0">৳{toBn(o.total)}</p>
                </div>
              </div>
              {/* Inline details — compact */}
              <div className="px-4 pb-3 space-y-1.5 text-[11px]">
                {/* Payment row */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className={`px-1.5 py-0.5 rounded font-medium inline-block w-[70px] truncate ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {o.payment_status === "paid" ? t("status.paid") : t("status.unpaid")}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                    <FiCreditCard className="w-3 h-3" />{PAYMENT_LABELS[o.payment_method] || o.payment_method}
                  </span>
                  {o.transaction_id && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono">{o.transaction_id}</span>
                  )}
                  <button type="button" onClick={() => handleCheckScore(o.id)} disabled={scoreLoading === o.id}
                    className={`px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                      o.courier_score
                        ? parseFloat(o.courier_score) >= 70 ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : parseFloat(o.courier_score) >= 40 ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>
                    {scoreLoading === o.id ? "..." : o.courier_score ? fmtScore(o.courier_score) : "Score"}
                  </button>
                </div>
                {/* Address */}
                {o.customer_address && (
                  <div className="flex items-start gap-1 text-gray-600">
                    <FiMapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                    <span className="break-words leading-snug">
                      {o.customer_address}{o.city ? `, ${o.city}` : ""}{o.zip_code ? ` — ${o.zip_code}` : ""}
                    </span>
                  </div>
                )}
                {/* Items */}
                {o.items && o.items.length > 0 && (
                  <div className="space-y-1 pt-1.5 mt-1 border-t border-gray-100">
                    {Array.from(new Map(o.items.map((i) => [i.id, i])).values()).map((item) => {
                      const img = itemImage(item);
                      return (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 shrink-0 relative cursor-pointer"
                          onMouseEnter={(e) => {
                            if (!img) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoverPreview({ image: img, x: rect.left + rect.width / 2, y: rect.top });
                          }}
                          onMouseLeave={() => setHoverPreview(null)}
                          onClick={() => img && setPreviewImage(img)}>
                          {img ? (
                            <SafeNextImage src={img} alt={item.product_name} fill sizes="32px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300"><FiPackage className="w-3.5 h-3.5" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-700 break-words leading-tight">
                            {item.product_name}
                            {item.variant_label && <span className="text-gray-400 font-normal"> — {item.variant_label}</span>}
                          </p>
                          <p className="text-gray-400 leading-tight">৳{toBn(item.price)} × {toBn(item.quantity)}</p>
                        </div>
                        <p className="font-semibold text-[var(--primary)] shrink-0">৳{toBn(item.price * item.quantity)}</p>
                      </div>
                      );
                    })}
                  </div>
                )}
                {/* Status + Score + Totals */}
                <div className="flex items-center justify-between gap-2 pt-1.5 mt-1 border-t border-gray-100">
                  <div className="flex items-center gap-1 min-w-0 flex-wrap">
                    <InlineSelect
                      value={o.status}
                      options={STATUS_OPTIONS.filter((s) => s.value)}
                      onChange={async (v) => {
                        try {
                          const paymentStatus = derivePaymentStatus(v, o.payment_method);
                          await api.admin.updateOrderStatus(o.id, { status: v, ...(paymentStatus ? { payment_status: paymentStatus } : {}) });
                          setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: v, ...(paymentStatus ? { payment_status: paymentStatus } : {}) } : x)));
                          showToast(t("toast.updated"));
                        } catch { showToast(t("toast.error"), "error"); }
                      }}
                    />
                    {o.consignment_id && (
                      <a href={consignmentUrl(o.courier_type, o.consignment_id)} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 hover:bg-blue-100 transition-colors"
                        title={`Track on ${resolveCourier(o.courier_type, o.consignment_id) === "pathao" ? "Pathao" : "Steadfast"}`}>
                        {o.consignment_id} <FiExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 shrink-0">
                    <span>{t("form.subtotal")}: <b className="text-gray-700">৳{toBn(o.subtotal)}</b></span>
                    {o.shipping_cost > 0 && <span>+ <b className="text-gray-700">৳{toBn(o.shipping_cost)}</b></span>}
                  </div>
                </div>
                {/* Notes */}
                {o.notes && (
                  <p className="text-gray-500 italic break-words leading-snug">&ldquo;{o.notes}&rdquo;</p>
                )}
              </div>
              {/* Footer: courier + actions */}
              <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                <div>
                  {o.courier_sent ? (
                    <div className="flex items-center gap-1.5">
                      <span title={o.courier_status || "sent"} style={{ borderRadius: "5px" }} className={`text-xs px-2 py-1 font-medium inline-block w-[70px] truncate cursor-help ${
                        o.courier_status === "delivered" ? "bg-green-100 text-green-700" :
                        o.courier_status === "in_review" || o.courier_status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        o.courier_status === "cancelled" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      }`}>{o.courier_status || "sent"}</span>
                      <button type="button" onClick={() => handleCheckCourierStatus(o.id)} disabled={courierLoading === o.id}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <FiRefreshCw className={`w-3 h-3 ${courierLoading === o.id ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => handleSendToCourier(o.id)} disabled={courierLoading === o.id}
                      style={{ backgroundColor: "color-mix(in oklab, var(--primary, #0f5931) 12%, transparent)", color: "var(--primary, #0f5931)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--primary, #0f5931)"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in oklab, var(--primary, #0f5931) 12%, transparent)"; e.currentTarget.style.color = "var(--primary, #0f5931)"; }}
                      className="w-[70px] flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                      <FiTruck className="w-3 h-3 shrink-0" /> {courierLoading === o.id ? "..." : "Send"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openDetail(o.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><FiEye className="w-4 h-4" /></button>
                  <button onClick={() => openEdit(o.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 className="w-4 h-4" /></button>
                  {isAdmin && (o.status === "trashed" ? (
                    <button onClick={() => handlePermanentDelete(o.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" title="Permanently delete"><FiXCircle className="w-4 h-4" /></button>
                  ) : (
                    <button onClick={() => handleTrashOrder(o.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 className="w-4 h-4" /></button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-2 py-3 w-8">
                      <input type="checkbox" checked={selectedOrders.size > 0 && selectedOrders.size >= filtered.length}
                        onChange={toggleSelectAll} className="w-4 h-4 accent-[var(--primary)]" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                      {selectedOrders.size > 0 ? (
                        <span className="text-[var(--primary)]">
                          {lang === "en" ? `${selectedOrders.size} selected` : `${toBn(selectedOrders.size)} নির্বাচিত`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          #
                          <span className="px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-bold leading-none">
                            {toBn(totalOrders)}
                          </span>
                        </span>
                      )}
                    </th>
                    {[t("th.customer"), t("th.total"), t("th.status")].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        Courier
                        <button type="button" onClick={() => setBulkRefreshOpen(true)} className="p-0.5 text-gray-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded transition-colors" title="Bulk refresh courier status">
                          <FiRefreshCw className="w-3 h-3" />
                        </button>
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        Score
                        <button type="button" onClick={() => setBulkScoreOpen(true)} className="p-0.5 text-gray-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded transition-colors" title="Bulk check scores">
                          <FiRefreshCw className="w-3 h-3" />
                        </button>
                      </span>
                    </th>
                    {["Consignment", t("th.date"), t("th.actions")].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="py-12 text-center text-gray-400">{t("empty.orders")}</td></tr>
                  ) : filtered.map((o) => {
                    const isExpanded = expandedId === o.id;
                    return (
                      <Fragment key={o.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-2 py-3">
                            <input type="checkbox" checked={selectedOrders.has(o.id)} onChange={() => toggleSelectOrder(o.id)} className="w-4 h-4 accent-[var(--primary)]" />
                          </td>
                          <td className="px-4 py-3 text-gray-500 font-medium">#{toBn(o.id)}</td>
                          <td className="px-4 py-3 max-w-40">
                            <p className="font-medium text-gray-800 truncate">{o.customer_name}</p>
                            {(() => { const ph = o.customer_phone || o.phone || ""; return ph ? (
                              <a href={`tel:${ph}`} onClick={(e) => e.stopPropagation()} className="text-xs text-blue-600 hover:underline mt-0.5 block">{ph}</a>
                            ) : null; })()}
                            {/* Notes — desktop only. Mobile card already shows
                                them in the body. line-clamp-2 keeps the row
                                from ballooning on long notes; full text shows
                                in the title attribute on hover. */}
                            {o.notes && (
                              <p
                                title={o.notes}
                                className="text-[11px] text-gray-500 italic mt-1 leading-snug line-clamp-2 break-words"
                              >
                                &ldquo;{o.notes}&rdquo;
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[var(--primary)] whitespace-nowrap">৳{toBn(o.total)}</td>
                          <td className="px-4 py-3">
                            <InlineSelect
                              value={o.status}
                              options={STATUS_OPTIONS.filter((s) => s.value)}
                              onChange={async (v) => {
                                try {
                                  const paymentStatus = derivePaymentStatus(v, o.payment_method);
                                  await api.admin.updateOrderStatus(o.id, { status: v, ...(paymentStatus ? { payment_status: paymentStatus } : {}) });
                                  setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: v, ...(paymentStatus ? { payment_status: paymentStatus } : {}) } : x)));
                                  showToast(t("toast.updated"));
                                } catch { showToast(t("toast.error"), "error"); }
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            {o.courier_sent ? (
                              <div className="flex items-center gap-1.5">
                                <span title={o.courier_status || "sent"} style={{ borderRadius: "5px" }} className={`text-xs px-2 py-1 font-medium inline-block w-[70px] truncate cursor-help ${
                                  o.courier_status === "delivered" ? "bg-green-100 text-green-700" :
                                  o.courier_status === "in_review" || o.courier_status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                  o.courier_status === "cancelled" ? "bg-red-100 text-red-700" :
                                  "bg-blue-100 text-blue-700"
                                }`}>{o.courier_status || "sent"}</span>
                                <button type="button" onClick={() => handleCheckCourierStatus(o.id)} disabled={courierLoading === o.id}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Refresh status">
                                  <FiRefreshCw className={`w-3 h-3 ${courierLoading === o.id ? "animate-spin" : ""}`} />
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => handleSendToCourier(o.id)} disabled={courierLoading === o.id}
                                style={{ backgroundColor: "color-mix(in oklab, var(--primary, #0f5931) 12%, transparent)", color: "var(--primary, #0f5931)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--primary, #0f5931)"; e.currentTarget.style.color = "#fff"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in oklab, var(--primary, #0f5931) 12%, transparent)"; e.currentTarget.style.color = "var(--primary, #0f5931)"; }}
                                className="w-[70px] flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                                <FiTruck className="w-3 h-3 shrink-0" />
                                {courierLoading === o.id ? "..." : "Send"}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => handleCheckScore(o.id)} disabled={scoreLoading === o.id}
                              className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                                o.courier_score
                                  ? parseFloat(o.courier_score) >= 70 ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : parseFloat(o.courier_score) >= 40 ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                  : "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              }`} title="Click to check score">
                              {scoreLoading === o.id ? "..." : o.courier_score ? fmtScore(o.courier_score) : "Check"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {o.consignment_id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-gray-600">{o.consignment_id}</span>
                                <a href={consignmentUrl(o.courier_type, o.consignment_id)} target="_blank" rel="noopener noreferrer"
                                  className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                  title={`Track on ${resolveCourier(o.courier_type, o.consignment_id) === "pathao" ? "Pathao" : "Steadfast"}`}>
                                  <FiExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString(lang === "en" ? "en-US" : "bn-BD")}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(o.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "bn-BD", { hour: "2-digit", minute: "2-digit" })}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => openDetail(o.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="View details">
                                <FiEye className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => openEdit(o.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                <FiEdit2 className="w-3.5 h-3.5" />
                              </button>
                              {isAdmin && (o.status === "trashed" ? (
                                <button onClick={() => handlePermanentDelete(o.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors" title="Permanently delete">
                                  <FiXCircle className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button onClick={() => handleTrashOrder(o.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Trash">
                                  <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                              ))}
                              <button onClick={() => setExpandedId(isExpanded ? null : o.id)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Toggle items">
                                {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        <AnimatePresence>
                          {isExpanded && (
                            <tr key={`exp-${o.id}`}>
                              <td colSpan={11} className="p-0">
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                  <div className="bg-gray-50/80 border-t border-gray-100 px-6 py-4">
                                    {o.items && o.items.length > 0 && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {Array.from(new Map(o.items.map((i) => [i.id, i])).values()).map((item) => {
                                          const img = itemImage(item);
                                          return (
                                          <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm">
                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative cursor-pointer"
                                              onMouseEnter={(e) => {
                                                if (!img) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setHoverPreview({ image: img, x: rect.left + rect.width / 2, y: rect.top });
                                              }}
                                              onMouseLeave={() => setHoverPreview(null)}
                                              onClick={() => img && setPreviewImage(img)}>
                                              {img ? (
                                                <SafeNextImage src={img} alt={item.product_name} fill sizes="56px" className="object-cover hover:scale-110 transition-transform" />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)]">
                                                  <FiPackage className="w-6 h-6" />
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-semibold text-gray-800 break-words">{item.product_name}</p>
                                              {item.variant_label && <p className="text-[11px] text-gray-400 break-words">{item.variant_label}</p>}
                                              <p className="text-xs text-gray-400">৳{toBn(item.price)} × {toBn(item.quantity)}</p>
                                            </div>
                                            <p className="text-sm font-bold text-[var(--primary)] shrink-0">৳{toBn(item.price * item.quantity)}</p>
                                          </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    <div className="flex items-center justify-end gap-4 mt-3 pt-2 border-t border-gray-200/60 text-xs text-gray-400">
                                      <span>{t("form.subtotal")}: <b className="text-gray-600">৳{toBn(o.subtotal)}</b></span>
                                      {o.shipping_cost > 0 && <span>{t("form.shippingCost")}: <b className="text-gray-600">৳{toBn(o.shipping_cost)}</b></span>}
                                      <span className="text-sm font-bold text-[var(--primary)]">৳{toBn(o.total)}</span>
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

        {/* Pagination — shown only when there's more than one page of results.
            Server returns 15/page; the count + Prev/Next mirror the products
            page convention so the dashboard feels consistent. */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-gray-400">
              {((page - 1) * perPage) + 1}–{Math.min(page * perPage, totalOrders)} / {totalOrders}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >{lang === "en" ? "← Prev" : "← আগের"}</button>
              <span className="px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">
                {lang === "en" ? `${page} / ${totalPages}` : `${toBn(page)} / ${toBn(totalPages)}`}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >{lang === "en" ? "Next →" : "পরের →"}</button>
            </div>
          </div>
        )}
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
                        {new Date(o.created_at).toLocaleString(lang === "en" ? "en-US" : "bn-BD")}
                      </p>
                      {/* Status badges — popup-only: 5px radius via inline
                          style (Tailwind JIT was stripping rounded-[Npx] in
                          this build), full label (no fixed width / truncate). */}
                      <div className="flex flex-wrap gap-2">
                        <span style={{ borderRadius: "5px" }} className={`text-xs px-3 py-1.5 font-medium inline-block ${stColor}`}>{stLabel}</span>
                        <span style={{ borderRadius: "5px" }} className={`text-xs px-3 py-1.5 font-medium inline-block ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {o.payment_status === "paid" ? t("status.paid") : t("status.unpaid")}
                        </span>
                        <span style={{ borderRadius: "5px" }} className="text-xs px-3 py-1.5 font-medium bg-gray-100 text-gray-700">
                          <FiCreditCard className="inline w-3 h-3 mr-1" />
                          {PAYMENT_LABELS[o.payment_method] || o.payment_method}
                        </span>
                        {o.transaction_id && (
                          <span style={{ borderRadius: "5px" }} className="text-xs px-3 py-1.5 font-medium bg-blue-100 text-blue-700">
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
                            {(() => { const ph = o.customer_phone || o.phone || ""; return ph ? (
                              <a href={`tel:${ph}`} className="text-blue-600 hover:underline">{ph}</a>
                            ) : <span>—</span>; })()}
                          </div>
                          {(o.customer_email) && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <FiMail className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>{o.customer_email}</span>
                            </div>
                          )}
                          {o.user && (
                            <div className="flex items-center gap-2 text-gray-500 text-xs">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t("common.registeredCustomer")}</span>
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
                            {o.zip_code && <p className="text-gray-500">{o.zip_code}</p>}
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
                          {o.items?.map((item) => {
                            const img = itemImage(item);
                            return (
                            <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative cursor-pointer"
                                onMouseEnter={(e) => {
                                  if (!img) return;
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoverPreview({ image: img, x: rect.left + rect.width / 2, y: rect.top });
                                }}
                                onMouseLeave={() => setHoverPreview(null)}
                                onClick={() => img && setPreviewImage(img)}>
                                {img ? (
                                  <SafeNextImage src={img} alt={item.product_name} fill sizes="48px" className="object-cover hover:scale-110 transition-transform" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)]">
                                    <FiPackage className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 break-words">
                                  {item.product_name}
                                  {item.variant_label && <span className="text-gray-400 font-normal"> — {item.variant_label}</span>}
                                </p>
                                <p className="text-xs text-gray-500">৳{toBn(item.price)} × {toBn(item.quantity)}</p>
                              </div>
                              <p className="text-sm font-bold text-[var(--primary)] whitespace-nowrap">৳{toBn(item.price * item.quantity)}</p>
                            </div>
                            );
                          })}
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
                            <span className="flex items-center gap-1"><FiTruck className="w-3.5 h-3.5" /> {t("checkout.shipping")}{o.city ? ` ${o.city}` : ""}</span>
                            <span>৳{toBn(o.shipping_cost)}</span>
                          </div>
                          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800 text-base">
                            <span>{t("checkout.total")}</span>
                            <span className="text-[var(--primary)]">৳{toBn(o.total)}</span>
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

                      {/* Courier + Status — two-up on desktop. Status block
                          previously sat below courier as full-width footer
                          with a top border; now lives as a sibling card so
                          admins see send + status update in one row. */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Courier Section */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                          <FiTruck className="w-3.5 h-3.5" /> Courier ({o.courier_type === "pathao" ? "Pathao" : o.courier_type === "steadfast" ? "Steadfast" : (activeCourier === "pathao" ? "Pathao" : "Steadfast")})
                        </h3>
                        {o.courier_sent ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">CN:</span>
                              {editingCN?.orderId === o.id ? (
                                <input value={editingCN.value} onChange={(e) => setEditingCN({ ...editingCN, value: e.target.value })}
                                  className="font-mono text-sm px-2 py-1 border border-gray-300 rounded-lg focus:border-[var(--primary)] focus:outline-none w-36" autoFocus />
                              ) : (
                                <span className="font-mono font-medium text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">{o.consignment_id}</span>
                              )}
                              {/* Edit CN */}
                              <button type="button" onClick={() => {
                                if (editingCN?.orderId === o.id) {
                                  // Save
                                  const cn = editingCN.value.trim();
                                  if (cn) {
                                    api.admin.updateOrder(o.id, { consignment_id: cn, courier_sent: true }).then(() => {
                                      setOrders(prev => prev.map(ord => ord.id === o.id ? { ...ord, consignment_id: cn, courier_sent: true } : ord));
                                      if (detailOrder?.id === o.id) setDetailOrder(prev => prev ? { ...prev, consignment_id: cn, courier_sent: true } : prev);
                                      showToast("CN updated");
                                    }).catch(() => showToast("Update failed", "error"));
                                  }
                                  setEditingCN(null);
                                } else {
                                  setEditingCN({ orderId: o.id, value: o.consignment_id || "" });
                                }
                              }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit CN">
                                {editingCN?.orderId === o.id ? <FiCheckCircle className="w-3.5 h-3.5 text-green-600" /> : <FiEdit2 className="w-3.5 h-3.5" />}
                              </button>
                              {/* Delete CN */}
                              <button type="button" onClick={async () => {
                                if (!confirm("CN নম্বর মুছে ফেলতে চান? এটি আবার কুরিয়ারে পাঠানোর জন্য প্রস্তুত হবে।")) return;
                                try {
                                  await api.admin.updateOrder(o.id, { courier_sent: false, consignment_id: null, courier_status: null });
                                  setOrders(prev => prev.map(ord => ord.id === o.id ? { ...ord, courier_sent: false, consignment_id: undefined, courier_status: undefined } : ord));
                                  if (detailOrder?.id === o.id) setDetailOrder(prev => prev ? { ...prev, courier_sent: false, consignment_id: undefined, courier_status: undefined } : prev);
                                  showToast("CN removed — ready to resend");
                                } catch { showToast("Failed", "error"); }
                              }} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete CN">
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-gray-500">Status:</span>
                              <span style={{ borderRadius: "5px" }} className={`text-xs px-2 py-1 font-medium inline-block w-[70px] truncate ${
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
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-50">
                            <FiTruck className="w-4 h-4" />
                            {courierLoading === o.id ? "Sending..." : "Send to Courier"}
                          </button>
                        )}
                      </div>

                      {/* Quick Status Update — sibling card to courier */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t("misc.statusPayment")}</h3>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex-1 min-w-[140px]">
                            <InlineSelect
                              value={pendingStatus[o.id] ?? o.status}
                              options={STATUS_OPTIONS.filter((s) => s.value)}
                              onChange={(v) => setPendingStatus({ ...pendingStatus, [o.id]: v })}
                            />
                          </div>
                          <button
                            onClick={() => handleStatusUpdate(o.id)}
                            disabled={updatingId === o.id}
                            className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-50"
                          >
                            {updatingId === o.id ? t("btn.saving") : t("btn.update")}
                          </button>
                        </div>
                      </div>
                      </div>

                      {/* Danger zone — one-click ban customer by phone + IP +
                          device fingerprint linked to this order. Stored in
                          BlockedPhone / BlockedIp / DeviceFingerprint.status —
                          all three checked on order create + incomplete capture. */}
                      <div className="border-t border-red-100 pt-4 mt-3 bg-red-50/40 rounded-xl p-4">
                        <h3 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <FiSlash className="w-3.5 h-3.5" /> {lang === "en" ? "Danger Zone" : "বিপজ্জনক"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs text-red-700 flex-1">
                            {lang === "en"
                              ? "Block this customer everywhere — bans phone, IP, and device fingerprint from placing future orders."
                              : "এই কাস্টমারকে সব জায়গায় ব্লক করুন — ফোন, আইপি, ডিভাইস ব্লক হবে।"}
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              const reason = window.prompt(lang === "en" ? "Reason?" : "কারণ?", "fake_order") || "fake_order";
                              if (!reason) return;
                              if (!confirm(lang === "en"
                                ? `Block ${o.customer_name} permanently? This bans phone + IP + device.`
                                : `${o.customer_name} কে স্থায়ী ভাবে ব্লক করবেন?`)) return;
                              try {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const r: any = await api.admin.blockOrderCustomer(o.id, reason);
                                showToast(lang === "en"
                                  ? `Blocked: ${[r?.phone?.value, r?.ip?.value, r?.fp?.value].filter(Boolean).join(" · ") || "ok"}`
                                  : "ব্লক করা হয়েছে");
                              } catch {
                                showToast(lang === "en" ? "Block failed" : "ব্লক ব্যর্থ", "error");
                              }
                            }}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 inline-flex items-center gap-1.5 shrink-0"
                          >
                            <FiSlash className="w-3.5 h-3.5" />
                            {lang === "en" ? "Block customer" : "কাস্টমার ব্লক"}
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
                {/* Customer Info with search */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wide">{t("misc.customerInfo")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.name")} *</label>
                      <input required value={editForm.customer_name} onChange={(e) => {
                        setEditForm({ ...editForm, customer_name: e.target.value });
                        handleCustomerSearch(e.target.value);
                      }} className={inputCls} placeholder={lang === "en" ? "Type to search..." : "নাম লিখুন..."} />
                      {customerResults.length > 0 && customerSearch.length >= 2 && (
                        <div className="absolute top-full left-0 right-[calc(-100%-12px)] mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {customerResults.map((c, i) => (
                            <button type="button" key={`edit-${c.phone}-${i}`} onClick={() => {
                              setEditForm(f => ({ ...f, customer_name: c.name, customer_phone: c.phone, customer_email: c.email || f.customer_email, customer_address: c.address || f.customer_address }));
                              setCustomerResults([]);
                            }}
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
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.phone")} *</label>
                      <input required value={editForm.customer_phone} onChange={(e) => {
                        setEditForm({ ...editForm, customer_phone: e.target.value });
                        handleCustomerSearch(e.target.value);
                      }} className={inputCls} placeholder="01XXXXXXXXX" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.email")}</label>
                    <input type="email" value={editForm.customer_email} onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })} className={inputCls} />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.address")} *</label>
                  <textarea rows={2} required value={editForm.customer_address} onChange={(e) => setEditForm({ ...editForm, customer_address: e.target.value })} className={inputCls + " resize-none"} />
                </div>

                {/* Product Picker (same as create form) */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wide">{t("misc.productItems")}</p>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={editProductSearch} onChange={(e) => setEditProductSearch(e.target.value)}
                      placeholder={t("search.products")} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-[var(--primary)] focus:outline-none" />
                    {editProductSearch.trim() && (() => {
                      const matched = filterPicker(editForm.items, editProductSearch).slice(0, 8);
                      return (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                          {matched.map((p) => (
                            p.has_variations && p.variants?.length ? (
                              // Variable product → render as a card with parent header (not clickable)
                              // and indented variant rows. Each variant carries its own price + image.
                              <div key={`p-${p.id}`} className="border-b border-gray-50 last:border-b-0">
                                <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-[var(--primary)]/5 to-transparent">
                                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                                    {p.image ? <SafeNextImage src={p.image} alt={p.name} fill sizes="32px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FiPackage className="w-4 h-4 text-gray-300" /></div>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                                    <p className="text-[10px] text-gray-400">{lang === "en" ? "Pick a variant" : "ভ্যারিয়েন্ট নির্বাচন করুন"}</p>
                                  </div>
                                </div>
                                {p.variants.filter((v) => v.is_active !== false).map((v) => {
                                  const added = editForm.items.some((i) => i.product_id === p.id && (i.variant_id || 0) === v.id);
                                  return (
                                    <button type="button" key={`v-${v.id}`} disabled={added} onClick={() => addProductToEdit(p, v)}
                                      className={`w-full flex items-center gap-3 pl-10 pr-3 py-1.5 text-sm text-left transition-colors ${added ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"}`}>
                                      <div className="w-7 h-7 rounded-md overflow-hidden bg-gray-100 shrink-0 relative">
                                        {(v.image || p.image) ? <SafeNextImage src={v.image || p.image || ""} alt={v.label} fill sizes="28px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FiPackage className="w-3 h-3 text-gray-300" /></div>}
                                      </div>
                                      <span className="flex-1 truncate text-[var(--primary)] font-medium">{v.label}</span>
                                      <span className="text-[var(--primary)] font-semibold shrink-0">৳{v.price}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <button type="button" key={p.id} onClick={() => addProductToEdit(p)}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-sm text-left transition-colors cursor-pointer">
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative cursor-pointer"
                                  onMouseEnter={(e) => { if (!p.image) return; e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setHoverPreview({ image: p.image, x: r.left + r.width / 2, y: r.top }); }}
                                  onMouseLeave={() => setHoverPreview(null)}
                                  onClick={(e) => { if (p.image) { e.stopPropagation(); e.preventDefault(); setPreviewImage(p.image); } }}>
                                  {p.image ? <SafeNextImage src={p.image} alt={p.name} fill sizes="32px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FiPackage className="w-4 h-4 text-gray-300" /></div>}
                                </div>
                                <span className="font-medium text-gray-800 flex-1 truncate">{p.name}</span>
                                <span className="text-[var(--primary)] font-semibold shrink-0">৳{p.price}</span>
                              </button>
                            )
                          ))}
                          {matched.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-gray-400">{t("empty.products")}</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  {editForm.items.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-xl">{t("search.products")}</div>
                  ) : (
                    <div className="space-y-2">
                      {editForm.items.map((item, idx) => (
                        <div key={item.product_id} className="bg-gray-50 rounded-xl px-2.5 py-2 border border-gray-100">
                          {/* Top row: image + name + remove */}
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative cursor-pointer"
                              onMouseEnter={(e) => { if (!item.image) return; const r = e.currentTarget.getBoundingClientRect(); setHoverPreview({ image: item.image, x: r.left + r.width / 2, y: r.top }); }}
                              onMouseLeave={() => setHoverPreview(null)}
                              onClick={() => item.image && setPreviewImage(item.image)}>
                              {item.image ? <SafeNextImage src={item.image} alt={item.product_name} fill sizes="36px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FiPackage className="w-4 h-4 text-gray-300" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 break-words leading-tight">
                                {item.product_name}
                                {item.variant_label && <span className="text-[var(--primary)] font-normal"> — {item.variant_label}</span>}
                              </p>
                              <p className="text-[11px] text-gray-400">৳{item.price} × {item.quantity}</p>
                            </div>
                            <button type="button" onClick={() => {
                              const items = [...editForm.items]; items.splice(idx, 1); setEditForm({ ...editForm, items });
                            }} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
                              <FiX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {/* Bottom row: qty controls + total */}
                          <div className="flex items-center justify-between gap-2 mt-1.5 pl-11">
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => {
                                const items = [...editForm.items];
                                if (items[idx].quantity <= 1) items.splice(idx, 1);
                                else items[idx] = { ...items[idx], quantity: items[idx].quantity - 1 };
                                setEditForm({ ...editForm, items });
                              }} className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-bold">−</button>
                              <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                              <button type="button" onClick={() => {
                                const items = [...editForm.items];
                                items[idx] = { ...items[idx], quantity: items[idx].quantity + 1 };
                                setEditForm({ ...editForm, items });
                              }} className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-bold">+</button>
                            </div>
                            <span className="text-sm font-bold text-[var(--primary)]">৳{item.price * item.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment & Shipping */}
                <div className="space-y-3">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.paymentMethod")}</label>
                        <InlineSelect fullWidth value={editForm.payment_method} options={[
                          { value: "cod", label: t("payment.cod") },
                          { value: "bkash", label: t("payment.bkash") },
                          { value: "nagad", label: t("payment.nagad") },
                          { value: "bank", label: t("payment.bank") },
                        ]} onChange={(v) => setEditForm({ ...editForm, payment_method: v })} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Discount (৳)</label>
                        <input type="number" min="0" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })} className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.shippingCost")}</label>
                      <InlineSelect fullWidth value={editForm.shipping_cost} options={shippingZones.map(z => ({ value: String(z.rate), label: `${z.name} — ৳${z.rate}` }))} onChange={(v) => setEditForm({ ...editForm, shipping_cost: v })} />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.notes")}</label>
                  <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className={inputCls + " resize-none"} placeholder="অর্ডার সম্পর্কে নোট..." />
                </div>

                {/* Courier — manual attach (for orders sent outside the dashboard).
                    Lets admin tag an order with provider + consignment ID after
                    the fact. Backend auto-flips status to "shipped" + stamps
                    courierSentAt the first time a consignment is attached. */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wide">
                      {lang === "en" ? "Courier" : "কুরিয়ার"}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      {lang === "en" ? "Optional — for manual tracking" : "ঐচ্ছিক — ম্যানুয়াল ট্র্যাকিং এর জন্য"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {lang === "en" ? "Provider" : "প্রোভাইডার"}
                      </label>
                      <InlineSelect
                        fullWidth
                        value={editForm.courier_type}
                        options={[
                          { value: "", label: lang === "en" ? "— None —" : "— নেই —" },
                          // Show all configured couriers; if none configured yet,
                          // still show both so the admin can tag retroactively.
                          ...(activeCouriers.length > 0
                            ? activeCouriers.map((c) => ({ value: c.id, label: c.label }))
                            : [
                                { value: "steadfast", label: "Steadfast" },
                                { value: "pathao", label: "Pathao" },
                              ]),
                        ]}
                        onChange={(v) => setEditForm({ ...editForm, courier_type: v })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {lang === "en" ? "Consignment ID" : "কনসাইনমেন্ট আইডি"}
                      </label>
                      <input
                        type="text"
                        value={editForm.consignment_id}
                        onChange={(e) => setEditForm({ ...editForm, consignment_id: e.target.value })}
                        className={inputCls}
                        placeholder={lang === "en" ? "e.g. 244522177" : "যেমন 244522177"}
                      />
                    </div>
                  </div>
                  {editForm.consignment_id && !editForm.courier_type && (
                    <p className="text-[11px] text-amber-600">
                      {lang === "en"
                        ? "Tip: pick a provider so courier-status refresh knows where to poll."
                        : "টিপ: প্রোভাইডার নির্বাচন করুন যাতে কুরিয়ার-স্ট্যাটাস রিফ্রেশ ঠিকঠাক কাজ করে।"}
                    </p>
                  )}
                </div>

                {/* Summary */}
                {(() => {
                  const sub = editForm.items.reduce((s, i) => s + i.price * i.quantity, 0);
                  const ship = Number(editForm.shipping_cost || 0);
                  const disc = Number(editForm.discount || 0);
                  return (
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">{t("form.subtotal")}</span><span className="font-medium">৳{sub}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{t("form.shippingCost")}</span><span className="font-medium">৳{ship}</span></div>
                      {disc > 0 && <div className="flex justify-between"><span className="text-green-600">Discount</span><span className="font-medium text-green-600">-৳{disc}</span></div>}
                      <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-1 mt-1"><span>{t("th.total")}</span><span className="text-[var(--primary)]">৳{Math.max(0, sub + ship - disc)}</span></div>
                    </div>
                  );
                })()}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditOrder(null)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    {t("btn.cancel")}
                  </button>
                  <button type="submit" disabled={editSaving}
                    className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-50">
                    {editSaving ? t("btn.saving") : t("btn.update")}
                  </button>
                </div>
              </form>
        )}
      </Modal>

      {/* Score Detail Popup */}
      <Modal open={!!scorePopup} onClose={() => setScorePopup(null)} title="Customer Success Rate" size="sm">
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

              <div className="flex items-center justify-between p-3 bg-[var(--primary)]/5 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                    <FiTruck className="w-4 h-4 text-[var(--primary)]" />
                  </div>
                  <span className="text-sm font-medium text-[var(--primary)]">Combined Ratio</span>
                </div>
                <span className="text-lg font-bold text-[var(--primary)]">{scorePopup.success_ratio}</span>
              </div>
            </div>

            {/* Per-courier breakdown */}
            {scorePopup.providers && scorePopup.providers.length > 0 && (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">By courier</div>
                {scorePopup.providers.map((p) => (
                  <div key={p.provider} className={`flex items-center justify-between p-2.5 rounded-lg border ${p.ok ? "bg-white border-gray-200" : "bg-amber-50 border-amber-200"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-gray-800 capitalize">{p.provider}</span>
                      {p.ok ? (
                        <span className="text-xs text-gray-500">{p.total_delivered}/{p.total_parcels} delivered</span>
                      ) : (
                        <span className="text-xs text-amber-700 truncate" title={p.error}>{p.error}</span>
                      )}
                      {p.rating && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{p.rating.replace(/_/g, " ")}</span>
                      )}
                    </div>
                    {p.ok && (
                      <span className={`text-sm font-bold ${
                        parseFloat(p.success_ratio) >= 70 ? "text-green-600" :
                        parseFloat(p.success_ratio) >= 40 ? "text-yellow-600" : "text-red-600"
                      }`}>{p.success_ratio}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Pathao prefill modal — review/edit before send (city/zone/area required) */}
      <PathaoSendModal
        open={!!pathaoModalOrder}
        order={pathaoModalOrder as any}
        onClose={() => setPathaoModalOrder(null)}
        onSent={(cid) => {
          if (!pathaoModalOrder) return;
          const oid = pathaoModalOrder.id;
          setOrders((prev) => prev.map((o) => o.id === oid ? { ...o, courier_sent: true, courier_type: "pathao", consignment_id: cid, courier_status: "pending" } : o));
          if (detailOrder?.id === oid) setDetailOrder((prev) => prev ? { ...prev, courier_sent: true, courier_type: "pathao", consignment_id: cid, courier_status: "pending" } : prev);
          setActiveCourier("pathao");
          showToast("Pathao-এ পাঠানো হয়েছে!");
        }}
      />

      {/* Pathao bulk review modal — Option B: review/edit each order's matched location before bulk send */}
      <PathaoBulkReviewModal
        open={!!pathaoBulkReviewIds}
        orderIds={pathaoBulkReviewIds || []}
        onClose={() => setPathaoBulkReviewIds(null)}
        onDone={({ sent, failed, results }) => {
          for (const r of results) {
            if (r.status === "success" && r.consignment_id) {
              setOrders((prev) => prev.map((o) => o.id === r.order_id ? { ...o, courier_sent: true, courier_type: "pathao", consignment_id: r.consignment_id, courier_status: "pending" } : o));
            }
          }
          setSelectedOrders(new Set());
          setActiveCourier("pathao");
          showToast(`${sent} sent to Pathao${failed > 0 ? `, ${failed} failed` : ""}`, failed > 0 ? "error" : "success");
        }}
      />

      {/* Courier Chooser Popup — shown when 2+ couriers configured */}
      <Modal
        open={!!chooserPending}
        onClose={() => setChooserPending(null)}
        title={lang === "en" ? "Choose Courier" : "কুরিয়ার নির্বাচন করুন"}
        size="sm"
      >
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-600">
            {chooserPending?.kind === "bulk"
              ? (lang === "en"
                  ? `Send ${chooserPending.orderIds.length} orders via:`
                  : `${chooserPending.orderIds.length}টি অর্ডার পাঠাবেন:`)
              : (lang === "en" ? "Send this order via:" : "এই অর্ডার পাঠাবেন:")}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {availableCouriers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleChooserPick(c.id)}
                className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all"
              >
                <span className="flex items-center gap-2 font-medium text-gray-800">
                  <FiTruck className="w-4 h-4 text-[var(--primary)]" />
                  {c.label}
                </span>
                <span className="text-xs text-gray-400">→</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Bulk Courier Refresh Popup */}
      <Modal open={bulkRefreshOpen} onClose={() => !bulkRefreshing && setBulkRefreshOpen(false)} title={lang === "en" ? "Refresh Courier Status" : "কুরিয়ার স্ট্যাটাস রিফ্রেশ"} size="sm">
        <div className="p-6">
          {bulkRefreshing ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                  <FiRefreshCw className="w-7 h-7 text-[var(--primary)] animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">{lang === "en" ? "Checking..." : "চেক হচ্ছে..."} {bulkRefreshProgress.done}/{bulkRefreshProgress.total}</p>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-[var(--primary)] h-full rounded-full transition-all duration-300" style={{ width: `${bulkRefreshProgress.total > 0 ? (bulkRefreshProgress.done / bulkRefreshProgress.total) * 100 : 0}%` }} />
                </div>
                {bulkRefreshProgress.delivered > 0 && (
                  <p className="mt-2 text-xs text-green-600 font-medium">
                    {lang === "en" ? `${bulkRefreshProgress.delivered} auto-delivered` : `${bulkRefreshProgress.delivered}টি অটো-ডেলিভারড হয়েছে`}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                {lang === "en" ? "Which orders should be refreshed?" : "কোন অর্ডারগুলোর কুরিয়ার স্ট্যাটাস রিফ্রেশ করবেন?"}
              </p>
              <div className="space-y-2.5">
                <button type="button" onClick={() => handleBulkCourierRefresh("page")}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-[var(--primary)]/10 transition-colors">
                    <FiRefreshCw className="w-5 h-5 text-blue-600 group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">{lang === "en" ? "Current Page" : "বর্তমান পেজ"}</p>
                    <p className="text-xs text-gray-500">{lang === "en" ? "Check all orders on this page" : "এই পেজের সব অর্ডার চেক করুন"}</p>
                  </div>
                </button>
                <button type="button" onClick={() => handleBulkCourierRefresh("pending")}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center group-hover:bg-[var(--primary)]/10 transition-colors">
                    <FiTruck className="w-5 h-5 text-orange-600 group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">{lang === "en" ? "All Pending Orders" : "সব পেন্ডিং অর্ডার"}</p>
                    <p className="text-xs text-gray-500">{lang === "en" ? "Check all orders except delivered" : "ডেলিভারড ছাড়া সব অর্ডার চেক করুন"}</p>
                  </div>
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                {lang === "en"
                  ? "Delivered & cancelled orders will be skipped. Orders marked delivered by courier will be auto-updated."
                  : "ডেলিভারড ও বাতিল অর্ডার স্কিপ হবে। কুরিয়ার ডেলিভারড হলে অর্ডার অটো-ডেলিভারড হবে।"}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Bulk Score Check Popup */}
      <Modal open={bulkScoreOpen} onClose={() => !bulkScoreChecking && setBulkScoreOpen(false)} title={lang === "en" ? "Bulk Score Check" : "বাল্ক স্কোর চেক"} size="sm">
        <div className="p-6">
          {bulkScoreChecking ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                  <FiRefreshCw className="w-7 h-7 text-[var(--primary)] animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">{lang === "en" ? "Checking..." : "চেক হচ্ছে..."} {bulkScoreProgress.done}/{bulkScoreProgress.total}</p>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-[var(--primary)] h-full rounded-full transition-all duration-300" style={{ width: `${bulkScoreProgress.total > 0 ? (bulkScoreProgress.done / bulkScoreProgress.total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                {lang === "en" ? "Which orders should be score-checked?" : "কোন অর্ডারগুলোর স্কোর চেক করবেন?"}
              </p>
              <div className="space-y-2.5">
                <button type="button" onClick={() => handleBulkScoreCheck("page")}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-[var(--primary)]/10 transition-colors">
                    <FiRefreshCw className="w-5 h-5 text-blue-600 group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">{lang === "en" ? "Current Page" : "বর্তমান পেজ"}</p>
                    <p className="text-xs text-gray-500">{lang === "en" ? "Check unchecked orders on this page" : "এই পেজের আনচেকড অর্ডার চেক করুন"}</p>
                  </div>
                </button>
                <button type="button" onClick={() => handleBulkScoreCheck("all")}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center group-hover:bg-[var(--primary)]/10 transition-colors">
                    <FiCheckCircle className="w-5 h-5 text-orange-600 group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">{lang === "en" ? "All Unchecked Orders" : "সব আনচেকড অর্ডার"}</p>
                    <p className="text-xs text-gray-500">{lang === "en" ? "Check all orders without a score" : "স্কোর ছাড়া সব অর্ডার চেক করুন"}</p>
                  </div>
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                {lang === "en"
                  ? "Already scored & delivered orders will be skipped."
                  : "স্কোর থাকা ও ডেলিভারড অর্ডার স্কিপ হবে।"}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Create Order Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={`${t("btn.add")} ${t("dash.orders")}`} size="lg">
        <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
          {/* Customer info — search integrated into name/phone fields */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wide">{t("misc.customerInfo")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.name")} *</label>
                <input required value={createForm.customer_name} onChange={(e) => {
                  setCreateForm({ ...createForm, customer_name: e.target.value });
                  handleCustomerSearch(e.target.value);
                }} className={inputCls} placeholder={lang === "en" ? "Type to search..." : "নাম লিখুন..."} />
                {customerResults.length > 0 && customerSearch.length >= 2 && (
                  <div className="absolute top-full left-0 right-[calc(-100%-12px)] mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {customerResults.map((c, i) => (
                      <button type="button" key={`${c.phone}-${i}`} onClick={() => { selectCustomer(c); setCustomerResults([]); }}
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
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.phone")} *</label>
                <input required value={createForm.customer_phone} onChange={(e) => {
                  setCreateForm({ ...createForm, customer_phone: e.target.value });
                  handleCustomerSearch(e.target.value);
                }} className={inputCls} placeholder="01XXXXXXXXX" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.email")}</label>
              <input type="email" value={createForm.customer_email} onChange={(e) => setCreateForm({ ...createForm, customer_email: e.target.value })}
                className={inputCls} />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.address")} *</label>
            <textarea rows={2} required value={createForm.customer_address} onChange={(e) => setCreateForm({ ...createForm, customer_address: e.target.value })}
              className={inputCls + " resize-none"} />
          </div>

          {/* Product Picker */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wide">{t("misc.productItems")}</p>

            {/* Search products */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={t("search.products")}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-[var(--primary)] focus:outline-none"
              />
              {/* Dropdown results */}
              {productSearch.trim() && (() => {
                const matched = filterPicker(createForm.items, productSearch).slice(0, 8);
                return (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                    {matched.map((p) => (
                      p.has_variations && p.variants?.length ? (
                        <div key={`p-${p.id}`} className="border-b border-gray-50 last:border-b-0">
                          <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-[var(--primary)]/5 to-transparent">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                              {p.image ? <SafeNextImage src={p.image} alt={p.name} fill sizes="32px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FiPackage className="w-4 h-4 text-gray-300" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                              <p className="text-[10px] text-gray-400">{lang === "en" ? "Pick a variant" : "ভ্যারিয়েন্ট নির্বাচন করুন"}</p>
                            </div>
                          </div>
                          {p.variants.filter((v) => v.is_active !== false).map((v) => {
                            const added = createForm.items.some((i) => i.product_id === p.id && (i.variant_id || 0) === v.id);
                            return (
                              <button type="button" key={`v-${v.id}`} disabled={added} onClick={() => addProductToOrder(p, v)}
                                className={`w-full flex items-center gap-3 pl-10 pr-3 py-1.5 text-sm text-left transition-colors ${added ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"}`}>
                                <div className="w-7 h-7 rounded-md overflow-hidden bg-gray-100 shrink-0 relative">
                                  {(v.image || p.image) ? <SafeNextImage src={v.image || p.image || ""} alt={v.label} fill sizes="28px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FiPackage className="w-3 h-3 text-gray-300" /></div>}
                                </div>
                                <span className="flex-1 truncate text-[var(--primary)] font-medium">{v.label}</span>
                                <span className="text-[var(--primary)] font-semibold shrink-0">৳{v.price}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <button type="button" key={p.id} onClick={() => addProductToOrder(p)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-sm text-left transition-colors cursor-pointer">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative cursor-pointer"
                            onMouseEnter={(e) => { if (!p.image) return; e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setHoverPreview({ image: p.image, x: r.left + r.width / 2, y: r.top }); }}
                            onMouseLeave={() => setHoverPreview(null)}
                            onClick={(e) => { if (p.image) { e.stopPropagation(); e.preventDefault(); setPreviewImage(p.image); } }}>
                            {p.image ? <SafeNextImage src={p.image} alt={p.name} fill sizes="32px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FiPackage className="w-4 h-4 text-gray-300" /></div>}
                          </div>
                          <span className="font-medium text-gray-800 flex-1 truncate">{p.name}</span>
                          <span className="text-[var(--primary)] font-semibold shrink-0">৳{p.price}</span>
                        </button>
                      )
                    ))}
                    {matched.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-gray-400">{t("empty.products")}</div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Selected items */}
            {createForm.items.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-xl">{t("search.products")}</div>
            ) : (
              <div className="space-y-2">
                {createForm.items.map((item, idx) => (
                  <div key={item.product_id} className="bg-gray-50 rounded-xl px-2.5 py-2 border border-gray-100">
                    {/* Top row: image + name + remove */}
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative cursor-pointer"
                        onMouseEnter={(e) => { if (!item.image) return; const r = e.currentTarget.getBoundingClientRect(); setHoverPreview({ image: item.image, x: r.left + r.width / 2, y: r.top }); }}
                        onMouseLeave={() => setHoverPreview(null)}
                        onClick={() => item.image && setPreviewImage(item.image)}>
                        {item.image ? <SafeNextImage src={item.image} alt={item.product_name} fill sizes="36px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FiPackage className="w-4 h-4 text-gray-300" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 break-words leading-tight">
                          {item.product_name}
                          {item.variant_label && <span className="text-[var(--primary)] font-normal"> — {item.variant_label}</span>}
                        </p>
                        <p className="text-[11px] text-gray-400">৳{item.price} × {item.quantity}</p>
                      </div>
                      <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Bottom row: qty controls + total */}
                    <div className="flex items-center justify-between gap-2 mt-1.5 pl-11">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => updateItemQty(idx, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-bold">−</button>
                        <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                        <button type="button" onClick={() => updateItemQty(idx, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-bold disabled:opacity-30">+</button>
                      </div>
                      <span className="text-sm font-bold text-[var(--primary)]">৳{item.price * item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment, Discount, Shipping */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Discount (৳)</label>
                <input type="number" min="0" value={createForm.discount} onChange={(e) => setCreateForm({ ...createForm, discount: e.target.value })}
                  className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("form.shippingCost")}</label>
              <InlineSelect fullWidth value={createForm.shipping_cost} options={shippingZones.map(z => ({ value: String(z.rate), label: `${z.name} — ৳${z.rate}` }))} onChange={(v) => setCreateForm({ ...createForm, shipping_cost: v })} />
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
            <div className="flex justify-between font-bold text-[var(--primary)] text-base border-t border-gray-200 pt-1.5">
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
              className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-50">
              {createSaving ? t("btn.saving") : t("btn.create")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Hover Tooltip Preview — floats above image */}
      {hoverPreview && (
        <div className="fixed z-[9999] pointer-events-none"
          style={{ left: hoverPreview.x, top: hoverPreview.y, transform: "translate(-50%, -100%) translateY(-8px)" }}>
          <div className="w-56 h-56 rounded-2xl overflow-hidden border-2 border-white shadow-2xl bg-white relative">
            <SafeNextImage src={hoverPreview.image} alt="" fill sizes="224px" className="object-cover" />
          </div>
        </div>
      )}

      {/* Click Fullscreen Preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="relative aspect-square">
                  <SafeNextImage src={previewImage} alt="Preview" fill sizes="384px" className="object-contain" />
                </div>
              </div>
              <button onClick={() => setPreviewImage(null)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
                <FiX className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
