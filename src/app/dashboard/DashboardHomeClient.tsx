"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { toBn } from "@/utils/toBn";
import { StatsSkeleton, TableSkeleton } from "@/components/DashboardSkeleton";
import {
  FiShoppingBag,
  FiUsers,
  FiBox,
  FiAlertCircle,
  FiDollarSign,
  FiClock,
  FiTrendingUp,
  FiUser,
  FiPackage,
  FiLock,
  FiEdit3,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
} from "react-icons/fi";
import DashboardLayout from "@/components/DashboardLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { useLang } from "@/lib/LanguageContext";
// Normal imports (not dynamic ssr:false) â€” file is already "use client" so
// recharts only ships on client anyway, and the dynamic wrapper caused a
// mount race where ResponsiveContainer measured its parent before layout,
// producing "width(-1) and height(-1)" console warnings.
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

// â”€â”€â”€ Status labels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-indigo-100 text-indigo-800",
  on_hold: "bg-orange-100 text-orange-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  trashed: "bg-gray-100 text-gray-500",
};
const statusLabelsBn: Record<string, string> = {
  pending: "à¦…à¦ªà§‡à¦•à§à¦·à¦®à¦¾à¦£", processing: "à¦ªà§à¦°à¦¸à§‡à¦¸à¦¿à¦‚", on_hold: "à¦…à¦¨ à¦¹à§‹à¦²à§à¦¡",
  confirmed: "à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤", shipped: "à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾à¦° à¦ªà¦¾à¦ à¦¾à¦¨à§‹ à¦¹à¦¯à¦¼à§‡à¦›à§‡", delivered: "à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¸à¦®à§à¦ªà¦¨à§à¦¨",
  cancelled: "à¦¬à¦¾à¦¤à¦¿à¦²", trashed: "à¦Ÿà§à¦°à§à¦¯à¦¾à¦¶",
};
const statusLabelsEn: Record<string, string> = {
  pending: "Pending", processing: "Processing", on_hold: "On Hold",
  confirmed: "Confirmed", shipped: "Courier Sent", delivered: "Delivered",
  cancelled: "Cancelled", trashed: "Trashed",
};
const getStatusLabel = (status: string, lang: string) => ({
  label: (lang === "en" ? statusLabelsEn[status] : statusLabelsBn[status]) || status,
  color: statusColors[status] || "bg-gray-100 text-gray-800",
});

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  items: OrderItem[];
}

// â”€â”€â”€ Admin Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Stats {
  total_orders: number;
  today_orders: number;
  total_revenue: number;
  today_revenue: number;
  total_customers: number;
  total_products: number;
  pending_orders: number;
  low_stock: number;
  low_stock_count: number;
  cancelled_revenue?: number;
  // Courier-sent ("actual sales") stats
  shipped_orders?: number;
  shipped_revenue?: number;
  today_shipped?: number;
  today_shipped_revenue?: number;
  shipped_customers?: number;
}
interface OrderCounts {
  pending: number; confirmed: number; processing: number;
  shipped: number; delivered: number; cancelled: number;
}
interface DailyOrder { date: string; count: number; }
interface TopProduct { id: number; name: string; sold: number; revenue: number; image?: string; }
interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  image?: string;
  // Present only for variable products. Each entry is an active variant whose
  // stock â‰¤ 10 (the threshold used by the SSR + API queries). Renderer shows
  // these as chips instead of a misleading sum.
  variants?: { label: string; stock: number }[];
}

/** Simple stat card for the bottom row (today / customers / low-stock) */
function StatCard({
  icon: Icon, label, value, color, delay, raw, href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; color: string;
  delay: number; raw?: boolean; href?: string;
}) {
  const inner = (
    <>
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-lg md:text-2xl font-bold text-gray-800 truncate">{raw ? value : toBn(value)}</div>
        <div className="text-xs md:text-sm text-gray-500 mt-0.5 truncate">{label}</div>
      </div>
    </>
  );
  const baseCls = "bg-white rounded-2xl border border-gray-100 p-4 md:p-5 flex items-center gap-3 md:gap-4 shadow-sm";
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
      {href ? (
        <Link href={href} className={`${baseCls} block hover:border-[var(--primary)] hover:shadow-md transition-all cursor-pointer`}>
          <div className="flex items-center gap-3 md:gap-4 w-full">{inner}</div>
        </Link>
      ) : (
        <div className={baseCls}>{inner}</div>
      )}
    </motion.div>
  );
}

/** Combined card: shows both order count (top) and revenue (bottom) for a status */
function CombinedStatCard({
  countIcon: CIcon, revenueIcon: RIcon,
  countLabel, revenueLabel,
  count, revenue,
  color, delay, href,
}: {
  countIcon: React.ComponentType<{ className?: string }>;
  revenueIcon: React.ComponentType<{ className?: string }>;
  countLabel: string; revenueLabel: string;
  count: number; revenue: number;
  color: string; delay: number; href?: string;
}) {
  const inner = (
    <div className="flex flex-col gap-0">
      {/* Count row */}
      <div className="flex items-center gap-3 p-4 md:p-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <CIcon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-xl md:text-2xl font-bold text-gray-800">{toBn(count)}</div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">{countLabel}</div>
        </div>
      </div>
      {/* Divider */}
      <div className="mx-4 border-t border-gray-100" />
      {/* Revenue row */}
      <div className="flex items-center gap-3 p-4 md:p-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color} opacity-80`}>
          <RIcon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-base md:text-lg font-bold text-gray-800 truncate">à§³{toBn(revenue)}</div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">{revenueLabel}</div>
        </div>
      </div>
    </div>
  );
  const baseCls = "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden";
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
      {href ? (
        <Link href={href} className={`${baseCls} block hover:border-[var(--primary)] hover:shadow-md transition-all cursor-pointer`}>
          {inner}
        </Link>
      ) : (
        <div className={baseCls}>{inner}</div>
      )}
    </motion.div>
  );
}

const PIE_COLORS = ["#eab308", "#3b82f6", "#6366f1", "#8b5cf6", "var(--primary)", "#ef4444"];

/**
 * Measures its container with ResizeObserver and exposes the width via a
 * render prop. Use this instead of Recharts <ResponsiveContainer> â€” the
 * latter logs "width(-1) and height(-1)" during its very first render
 * because its internal dimension state defaults to -1 before mount effects
 * resolve. Passing numeric width/height directly to BarChart/PieChart
 * avoids ResponsiveContainer entirely â†’ no warning, ever.
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

interface DashboardInitialData {
  stats: Stats | null;
  orderCounts: OrderCounts;
  revByStatus: OrderCounts;
  dailyOrders: DailyOrder[];
  recentOrders: Order[];
  topProducts: TopProduct[];
  lowStockItems: LowStockItem[];
  initialFrom?: string;
  initialTo?: string;
}

/** Return today's date in YYYY-MM-DD using BD time (UTC+6) */
function bdToday(): string {
  const nowBD = new Date(Date.now() + 6 * 60 * 60 * 1000);
  return nowBD.toISOString().slice(0, 10);
}

function AdminDashboard({ initialData }: { initialData?: DashboardInitialData }) {
  const emptyOrderCounts: OrderCounts = { pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
  const { t, lang } = useLang();
  const [stats, setStats] = useState<Stats | null>(initialData?.stats ?? null);
  const [orderCounts, setOrderCounts] = useState<OrderCounts>(initialData?.orderCounts ?? emptyOrderCounts);
  const [revByStatus, setRevByStatus] = useState<OrderCounts>(initialData?.revByStatus ?? emptyOrderCounts);
  const [dailyOrders, setDailyOrders] = useState<DailyOrder[]>(initialData?.dailyOrders ?? []);
  const [recentOrders, setRecentOrders] = useState<Order[]>(initialData?.recentOrders ?? []);
  const [topProducts, setTopProducts] = useState<TopProduct[]>(initialData?.topProducts ?? []);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>(initialData?.lowStockItems ?? []);
  const [loading, setLoading] = useState(!initialData);

  // â”€â”€ Date filter â€” default to today â”€â”€
  const [fromDate, setFromDate] = useState(initialData?.initialFrom ?? bdToday());
  const [toDate, setToDate] = useState(initialData?.initialTo ?? bdToday());
  const [filtering, setFiltering] = useState(false);

  const applyData = useCallback((res: any) => {
    setStats(res.stats || null);
    setOrderCounts(res.order_counts || emptyOrderCounts);
    setRevByStatus(res.revenue_by_status || emptyOrderCounts);
    setDailyOrders(res.daily_orders || []);
    setRecentOrders(res.recent_orders || []);
    setTopProducts((res.top_products || []).map((p: any) => ({
      id: p.id, name: p.name,
      sold: p.sold_count ?? p.sold ?? 0,
      revenue: (p.sold_count ?? p.sold ?? 0) * (p.price ?? 0),
      image: p.image,
    })));
    setLowStockItems(res.low_stock || []);
  }, []);

  // Initial load â€” always default to today
  useEffect(() => {
    if (initialData) return; // SSR already provides today-scoped data
    const today = bdToday();
    api.admin.dashboard(`from=${today}&to=${today}`)
      .then(applyData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch when date range changes
  const fetchFiltered = useCallback(async (from: string, to: string) => {
    setFiltering(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to)   params.set("to",   to);
      const res = await api.admin.dashboard(params.toString());
      applyData(res);
    } catch {}
    finally { setFiltering(false); }
  }, [applyData]);

  if (loading) return <StatsSkeleton />;

  const todayStr = bdToday();
  const cancelledRev = stats?.cancelled_revenue ?? revByStatus.cancelled ?? 0;

  const combinedCards = [
    {
      countIcon: FiShoppingBag, revenueIcon: FiDollarSign,
      countLabel: lang === "en" ? "Total Orders"     : "à¦®à§‹à¦Ÿ à¦…à¦°à§à¦¡à¦¾à¦°",
      revenueLabel: lang === "en" ? "Total Revenue"  : "à¦®à§‹à¦Ÿ à¦†à¦¯à¦¼",
      count: stats?.total_orders ?? 0,
      revenue: stats?.total_revenue ?? 0,
      color: "bg-[var(--primary)]",
      href: "/dashboard/orders",
    },
    {
      countIcon: FiClock, revenueIcon: FiDollarSign,
      countLabel: lang === "en" ? "Pending Orders"    : "à¦®à§à¦²à¦¤à§à¦¬à¦¿ à¦…à¦°à§à¦¡à¦¾à¦°",
      revenueLabel: lang === "en" ? "Pending Revenue" : "à¦®à§à¦²à¦¤à§à¦¬à¦¿ à¦†à¦¯à¦¼",
      count: orderCounts.pending,
      revenue: revByStatus.pending,
      color: "bg-yellow-500",
      href: "/dashboard/orders?status=pending",
    },
    {
      countIcon: FiCheckCircle, revenueIcon: FiDollarSign,
      countLabel: lang === "en" ? "Confirmed Orders"    : "à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤ à¦…à¦°à§à¦¡à¦¾à¦°",
      revenueLabel: lang === "en" ? "Confirmed Revenue" : "à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤ à¦†à¦¯à¦¼",
      count: orderCounts.confirmed,
      revenue: revByStatus.confirmed,
      color: "bg-blue-500",
      href: "/dashboard/orders?status=confirmed",
    },
    {
      countIcon: FiXCircle, revenueIcon: FiDollarSign,
      countLabel: lang === "en" ? "Cancelled Orders"  : "à¦¬à¦¾à¦¤à¦¿à¦² à¦…à¦°à§à¦¡à¦¾à¦°",
      revenueLabel: lang === "en" ? "Cancelled Amount (excl. shipping)" : "à¦¬à¦¾à¦¤à¦¿à¦² à¦ªà¦°à¦¿à¦®à¦¾à¦£ (à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¬à¦¾à¦¦à§‡)",
      count: orderCounts.cancelled,
      revenue: cancelledRev,
      color: "bg-red-500",
      href: "/dashboard/orders?status=cancelled",
    },
  ];

  const row2 = [
    { icon: FiCalendar, label: lang === "en" ? "Today's Orders"  : "à¦†à¦œà¦•à§‡à¦° à¦…à¦°à§à¦¡à¦¾à¦°",  value: stats?.today_orders ?? 0, color: "bg-indigo-500", href: `/dashboard/orders?from=${todayStr}&to=${todayStr}` },
    { icon: FiTrendingUp, label: lang === "en" ? "Today's Revenue" : "à¦†à¦œà¦•à§‡à¦° à¦†à¦¯à¦¼",    value: `à§³${toBn(stats?.today_revenue ?? 0)}`, color: "bg-emerald-600", raw: true },
    { icon: FiUsers, label: t("dash.customers"), value: stats?.total_customers ?? 0, color: "bg-violet-500", href: "/dashboard/users" },
    { icon: FiAlertCircle, label: t("dash.lowStock"), value: stats?.low_stock_count ?? stats?.low_stock ?? 0, color: "bg-orange-500", href: "/dashboard/products?filter=low_stock" },
  ];

  const pieData = [
    { name: lang === "en" ? "Pending"    : "à¦…à¦ªà§‡à¦•à§à¦·à¦®à¦¾à¦£",              value: orderCounts.pending },
    { name: lang === "en" ? "Confirmed"  : "à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤",               value: orderCounts.confirmed },
    { name: lang === "en" ? "Processing" : "à¦ªà§à¦°à¦¸à§‡à¦¸à¦¿à¦‚",              value: orderCounts.processing },
    { name: lang === "en" ? "Courier Sent" : "à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾à¦° à¦ªà¦¾à¦ à¦¾à¦¨à§‹ à¦¹à¦¯à¦¼à§‡à¦›à§‡", value: orderCounts.shipped },
    { name: lang === "en" ? "Delivered"  : "à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿",              value: orderCounts.delivered },
    { name: lang === "en" ? "Cancelled"  : "à¦¬à¦¾à¦¤à¦¿à¦²",                 value: orderCounts.cancelled },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">

      {/* â”€â”€ Date Filter Bar â”€â”€ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-700 shrink-0">
            <FiCalendar className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-sm font-bold">{lang === "en" ? "Filter by Date" : "à¦¤à¦¾à¦°à¦¿à¦– à¦«à¦¿à¦²à§à¦Ÿà¦¾à¦°"}</span>
          </div>
          <DateRangePicker
            from={fromDate}
            to={toDate}
            onChange={(f, t) => {
              setFromDate(f);
              setToDate(t);
              fetchFiltered(f, t);
            }}
          />
          {filtering && (
            <span className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </motion.div>

      {/* â”€â”€ Combined stat cards (count + revenue per status) â”€â”€ */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${filtering ? "opacity-50 pointer-events-none" : ""}`}>
        {combinedCards.map((c, i) => (
          <CombinedStatCard
            key={i}
            countIcon={c.countIcon}
            revenueIcon={c.revenueIcon}
            countLabel={c.countLabel}
            revenueLabel={c.revenueLabel}
            count={c.count}
            revenue={c.revenue}
            color={c.color}
            delay={i * 0.05}
            href={c.href}
          />
        ))}
      </div>

      {/* â”€â”€ Actual Sales (courier-sent) combined cards â”€â”€ */}
      <div className={`transition-opacity ${filtering ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-2 h-2 rounded-full bg-teal-500" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {lang === "en" ? "Actual Sales â€” Courier Sent" : "à¦ªà§à¦°à¦•à§ƒà¦¤ à¦¬à¦¿à¦•à§à¦°à¦¯à¦¼ â€” à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾à¦° à¦ªà¦¾à¦ à¦¾à¦¨à§‹"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Courier Sent count + revenue */}
          <CombinedStatCard
            countIcon={FiPackage}
            revenueIcon={FiDollarSign}
            countLabel={lang === "en" ? "Courier Sent Orders" : "à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾à¦° à¦ªà¦¾à¦ à¦¾à¦¨à§‹ à¦…à¦°à§à¦¡à¦¾à¦°"}
            revenueLabel={lang === "en" ? "Sales Revenue (excl. shipping)" : "à¦¬à¦¿à¦•à§à¦°à¦¯à¦¼ à¦†à¦¯à¦¼ (à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¬à¦¾à¦¦à§‡)"}
            count={stats?.shipped_orders ?? 0}
            revenue={stats?.shipped_revenue ?? 0}
            color="bg-teal-500"
            delay={0.05}
            href="/dashboard/orders?status=shipped"
          />
          {/* Card 2: Today's courier count + today's revenue */}
          <CombinedStatCard
            countIcon={FiCalendar}
            revenueIcon={FiDollarSign}
            countLabel={lang === "en" ? "Today's Courier" : "à¦†à¦œà¦•à§‡à¦° à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾à¦°"}
            revenueLabel={lang === "en" ? "Today's Sales" : "à¦†à¦œà¦•à§‡à¦° à¦¬à¦¿à¦•à§à¦°à¦¯à¦¼"}
            count={stats?.today_shipped ?? 0}
            revenue={stats?.today_shipped_revenue ?? 0}
            color="bg-indigo-500"
            delay={0.1}
            href={`/dashboard/orders?status=shipped&from=${todayStr}&to=${todayStr}`}
          />
          {/* Card 3: Customers + avg order value */}
          <CombinedStatCard
            countIcon={FiUsers}
            revenueIcon={FiTrendingUp}
            countLabel={lang === "en" ? "Customers (Shipped)" : "à¦—à§à¦°à¦¾à¦¹à¦• (à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾à¦°)"}
            revenueLabel={lang === "en" ? "Avg Order Value" : "à¦—à¦¡à¦¼ à¦…à¦°à§à¦¡à¦¾à¦° à¦®à§‚à¦²à§à¦¯"}
            count={stats?.shipped_customers ?? 0}
            revenue={(stats?.shipped_orders ?? 0) > 0
              ? Math.round((stats?.shipped_revenue ?? 0) / (stats?.shipped_orders ?? 1))
              : 0}
            color="bg-violet-500"
            delay={0.15}
          />
          {/* Card 4: Delivered count + delivered revenue */}
          <CombinedStatCard
            countIcon={FiPackage}
            revenueIcon={FiDollarSign}
            countLabel={lang === "en" ? "Delivered Orders" : "à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¸à¦®à§à¦ªà¦¨à§à¦¨"}
            revenueLabel={lang === "en" ? "Delivered Revenue" : "à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦†à¦¯à¦¼"}
            count={orderCounts.delivered}
            revenue={revByStatus.delivered}
            color="bg-emerald-500"
            delay={0.2}
            href="/dashboard/orders?status=delivered"
          />
        </div>
      </div>


      {/* Charts */}
      <div className={`grid lg:grid-cols-2 gap-6 transition-opacity ${filtering ? "opacity-50 pointer-events-none" : ""}`}>
        {/* Bar Chart â€” Last 7 Days */}
        {/* min-w-0 on grid item: lets it shrink below its content's intrinsic
            width so ResponsiveContainer can measure a real width instead of -1. */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm min-w-0">
          <h2 className="text-base font-bold text-gray-800 mb-4">{t("dash.weeklyOrders")}</h2>
          <MeasuredChart height={256}>
            {(w, h) => (
              <RechartsBarChart width={w} height={h} data={dailyOrders} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </RechartsBarChart>
            )}
          </MeasuredChart>
        </motion.div>

        {/* Pie Chart â€” Status Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm min-w-0">
          <h2 className="text-base font-bold text-gray-800 mb-4">{t("dash.statusBreakdown")}</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 py-16 text-center">{t("empty.orders")}</p>
          ) : (
            <MeasuredChart height={256}>
              {(w, h) => (
                <RechartsPieChart width={w} height={h}>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                </RechartsPieChart>
              )}
            </MeasuredChart>
          )}
        </motion.div>
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 mb-4">{t("dash.recentOrders")}</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t("empty.orders")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">{t("th.customer")}</th>
                    <th className="pb-2 font-medium">{t("th.total")}</th>
                    <th className="pb-2 font-medium">{t("th.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.slice(0, 8).map((o) => {
                    const st = getStatusLabel(o.status, lang);
                    return (
                      <tr key={o.id}>
                        <td className="py-2.5 text-gray-500">#{toBn(o.id)}</td>
                        <td className="py-2.5 font-medium text-gray-700 max-w-30 truncate">{o.customer_name}</td>
                        <td className="py-2.5 text-[var(--primary)] font-semibold">à§³{toBn(o.total)}</td>
                        <td className="py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Top Products */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 mb-4">{t("dash.topProducts")}</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t("empty.products")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">{t("dash.products")}</th>
                    <th className="pb-2 font-medium">{t("th.sales")}</th>
                    <th className="pb-2 font-medium">{t("th.total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topProducts.slice(0, 8).map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 font-medium text-gray-700 max-w-37.5 truncate">{p.name}</td>
                      <td className="py-2.5 text-gray-600">{toBn(p.sold)}</td>
                      <td className="py-2.5 text-[var(--primary)] font-semibold">à§³{toBn(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
          <h2 className="text-base font-bold text-red-700 mb-4 flex items-center gap-2">
            <FiAlertCircle className="w-5 h-5" />
            {t("dash.lowStockAlert")}
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <FiBox className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                  {item.variants && item.variants.length > 0 ? (
                    // Variable product: list each low variant. Sum would be
                    // misleading ("Stock: 143" on a product flagged because one
                    // size is at 2).
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.variants.map((v) => (
                        <span key={v.label} className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                          {v.label}: {toBn(v.stock)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-red-600 font-semibold">{t("cust.stockLabel")}: {toBn(item.stock)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// â”€â”€â”€ Customer Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CustomerDashboard({ user }: { user: { id: string; name: string; email: string; phone?: string; role: string } }) {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<"profile" | "orders" | "password">("profile");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passErr, setPassErr] = useState("");
  const [passSaving, setPassSaving] = useState(false);

  useEffect(() => {
    if (tab === "orders") {
      setOrdersLoading(true);
      api.getOrders()
        .then((res) => setOrders(res.data || []))
        .catch(() => {})
        .finally(() => setOrdersLoading(false));
    }
  }, [tab]);

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileMsg(""); setProfileErr(""); setProfileSaving(true);
    try {
      await api.updateProfile({ name, email, phone });
      setProfileMsg(t("cust.profileUpdated"));
    } catch (err: unknown) {
      const error = err as { message?: string };
      setProfileErr(error.message || t("toast.error"));
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPassMsg(""); setPassErr(""); setPassSaving(true);
    try {
      await api.updatePassword({ current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword });
      setPassMsg(t("cust.passwordChanged"));
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: unknown) {
      const error = err as { message?: string; errors?: Record<string, string[]> };
      if (error.errors) {
        setPassErr(Object.values(error.errors).flat().join(", "));
      } else {
        setPassErr(error.message || t("toast.error"));
      }
    } finally {
      setPassSaving(false);
    }
  };

  const tabs = [
    { id: "profile" as const, label: t("cust.profile"), icon: FiUser },
    { id: "orders" as const, label: t("cust.myOrders"), icon: FiPackage },
    { id: "password" as const, label: t("cust.password"), icon: FiLock },
  ];

  return (
    <section className="py-8 md:py-12 bg-background-alt min-h-[70vh]">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("cust.dashboard")}</h1>
            <p className="text-text-muted text-sm mt-1">{t("cust.welcome")}, {user.name}</p>
          </div>
          <div className="grid lg:grid-cols-[260px_1fr] gap-6">
            <div className="bg-white rounded-2xl border border-border p-4 h-fit">
              <div className="flex flex-col gap-1">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? "bg-primary text-white" : "text-foreground hover:bg-primary/5 hover:text-primary"}`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                    <FiChevronRight className="w-3.5 h-3.5 ml-auto" />
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-border p-6 md:p-8">
              {tab === "profile" && (
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6">
                    <FiEdit3 className="w-5 h-5 text-primary" />
                    {t("cust.profileInfo")}
                  </h2>
                  {profileMsg && <div className="p-3 mb-4 bg-green-50 text-green-700 text-sm rounded-lg">{profileMsg}</div>}
                  {profileErr && <div className="p-3 mb-4 bg-red-50 text-sale-red text-sm rounded-lg">{profileErr}</div>}
                  <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{t("form.name")}</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{t("form.email")}</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{t("form.phone")}</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <button type="submit" disabled={profileSaving} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light transition-colors disabled:opacity-50">
                      {profileSaving ? t("btn.saving") : t("cust.updateProfile")}
                    </button>
                  </form>
                </div>
              )}
              {tab === "orders" && (
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6">
                    <FiPackage className="w-5 h-5 text-primary" />
                    {t("cust.myOrders")}
                  </h2>
                  {ordersLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <FiPackage className="w-12 h-12 text-text-muted mx-auto mb-3" />
                      <p className="text-text-muted">{t("cust.noOrders")}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => {
                        const st = getStatusLabel(order.status, lang);
                        return (
                          <div key={order.id} className="border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-foreground">{t("cust.order")} #{toBn(order.id)}</span>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${order.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                                  {order.payment_status === "paid" ? t("cust.paymentDone") : t("cust.paymentPending")}
                                </span>
                              </div>
                              <span className="text-lg font-bold text-primary">à§³{toBn(order.total)}</span>
                            </div>

                            {/* Order Tracking Timeline */}
                            <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                              {(["pending", "processing", "confirmed", "shipped", "delivered"] as const).map((step, i) => {
                                const stepLabels: Record<string, string> = lang === "en"
                                  ? { pending: "Pending", processing: "Processing", confirmed: "Confirmed", shipped: "Courier Sent", delivered: "Delivered" }
                                  : { pending: "à¦…à¦ªà§‡à¦•à§à¦·à¦®à¦¾à¦£", processing: "à¦ªà§à¦°à¦¸à§‡à¦¸à¦¿à¦‚", confirmed: "à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤", shipped: "à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾à¦° à¦ªà¦¾à¦ à¦¾à¦¨à§‹ à¦¹à¦¯à¦¼à§‡à¦›à§‡", delivered: "à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿" };
                                const stepOrder = ["pending", "processing", "confirmed", "shipped", "delivered"];
                                const currentIdx = stepOrder.indexOf(order.status);
                                const isCancelled = order.status === "cancelled";
                                const isActive = !isCancelled && i <= currentIdx;
                                const isCurrent = !isCancelled && i === currentIdx;
                                return (
                                  <div key={step} className="flex items-center gap-1 shrink-0">
                                    {i > 0 && <div className={`w-6 h-0.5 ${isActive ? "bg-primary" : "bg-gray-200"}`} />}
                                    <div className="flex flex-col items-center">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCurrent ? "bg-primary text-white ring-2 ring-primary/30" : isActive ? "bg-primary text-white" : "bg-gray-200 text-gray-400"}`}>
                                        {isActive ? "âœ“" : toBn(i + 1)}
                                      </div>
                                      <span className={`text-[10px] mt-1 whitespace-nowrap ${isCurrent ? "text-primary font-bold" : isActive ? "text-text-body" : "text-text-light"}`}>{stepLabels[step]}</span>
                                    </div>
                                  </div>
                                );
                              })}
                              {order.status === "cancelled" && (
                                <div className="flex items-center gap-1 ml-2">
                                  <div className="w-6 h-6 rounded-full bg-sale-red text-white flex items-center justify-center text-xs font-bold">âœ•</div>
                                  <span className="text-[10px] text-sale-red font-bold">à¦¬à¦¾à¦¤à¦¿à¦²</span>
                                </div>
                              )}
                            </div>

                            {order.items && order.items.length > 0 && (
                              <div className="text-sm text-text-body space-y-1">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex justify-between">
                                    <span>{item.product_name} Ã— {toBn(item.quantity)}</span>
                                    <span className="text-text-muted">à§³{toBn(item.price * item.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
                              <span>{new Date(order.created_at).toLocaleDateString(lang === "en" ? "en-US" : "bn-BD")}</span>
                              <span>{order.payment_method === "cod" ? t("payment.cod") : order.payment_method === "bkash" ? t("payment.bkash") : order.payment_method === "nagad" ? t("payment.nagad") : order.payment_method}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {tab === "password" && (
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6">
                    <FiLock className="w-5 h-5 text-primary" />
                    {t("cust.changePassword")}
                  </h2>
                  {passMsg && <div className="p-3 mb-4 bg-green-50 text-green-700 text-sm rounded-lg">{passMsg}</div>}
                  {passErr && <div className="p-3 mb-4 bg-red-50 text-sale-red text-sm rounded-lg">{passErr}</div>}
                  <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{t("cust.currentPassword")}</label>
                      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{t("cust.newPassword")}</label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{t("cust.confirmPassword")}</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <button type="submit" disabled={passSaving} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light transition-colors disabled:opacity-50">
                      {passSaving ? t("cust.changing") : t("cust.changePassword")}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function DashboardPage({ initialData }: { initialData?: DashboardInitialData }) {
  const { user, loading } = useAuth();
  const { t } = useLang();

  // Server already verified admin and passed initialData â€” render immediately, no skeleton
  if (initialData) {
    return (
      <DashboardLayout title={t("dash.dashboard")}>
        <AdminDashboard initialData={initialData} />
      </DashboardLayout>
    );
  }

  // Client-side fallback (non-admin users or SSR without initialData)
  if (loading) return null; // blank instead of skeleton flash

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <FiUser className="w-16 h-16 text-text-muted" />
        <p className="text-lg text-text-muted">{t("cust.loginRequired")}</p>
      </div>
    );
  }

  if (user.role === "admin") {
    return (
      <DashboardLayout title={t("dash.dashboard")}>
        <AdminDashboard />
      </DashboardLayout>
    );
  }

  return <CustomerDashboard user={user} />;
}

