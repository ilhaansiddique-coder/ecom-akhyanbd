"use client";

import { useState, useEffect } from "react";
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
import { useLang } from "@/lib/LanguageContext";
import dynamic from "next/dynamic";

const RechartsBarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const RechartsPieChart = dynamic(() => import("recharts").then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => m.Cell), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });

// ─── Status labels ───────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  trashed: "bg-gray-100 text-gray-500",
};
const statusLabelsBn: Record<string, string> = {
  pending: "অপেক্ষমাণ", confirmed: "নিশ্চিত", processing: "প্রসেসিং",
  shipped: "শিপড", delivered: "ডেলিভারি সম্পন্ন", cancelled: "বাতিল", trashed: "ট্র্যাশ",
};
const statusLabelsEn: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", processing: "Processing",
  shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled", trashed: "Trashed",
};
const getStatusLabel = (status: string, lang: string) => ({
  label: (lang === "en" ? statusLabelsEn[status] : statusLabelsBn[status]) || status,
  color: statusColors[status] || "bg-gray-100 text-gray-800",
});

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
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
}
interface OrderCounts {
  pending: number; confirmed: number; processing: number;
  shipped: number; delivered: number; cancelled: number;
}
interface DailyOrder { date: string; count: number; }
interface TopProduct {
  id: number;
  name: string;
  sold: number;
  revenue: number;
  image?: string;
}
interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  image?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
  raw,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  delay: number;
  raw?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 flex items-center gap-3 md:gap-4 shadow-sm"
    >
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-lg md:text-2xl font-bold text-gray-800 truncate">{raw ? value : toBn(value)}</div>
        <div className="text-xs md:text-sm text-gray-500 mt-0.5 truncate">{label}</div>
      </div>
    </motion.div>
  );
}

const PIE_COLORS = ["#eab308", "#3b82f6", "#6366f1", "#8b5cf6", "#0f5931", "#ef4444"];

function AdminDashboard() {
  const { t, lang } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [orderCounts, setOrderCounts] = useState<OrderCounts>({ pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 });
  const [revByStatus, setRevByStatus] = useState<OrderCounts>({ pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 });
  const [dailyOrders, setDailyOrders] = useState<DailyOrder[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.dashboard()
      .then((res) => {
        setStats(res.stats || null);
        setOrderCounts(res.order_counts || {});
        setRevByStatus(res.revenue_by_status || {});
        setDailyOrders(res.daily_orders || []);
        setRecentOrders(res.recent_orders || []);
        setTopProducts((res.top_products || []).map((p: any) => ({
          id: p.id, name: p.name,
          sold: p.sold_count ?? p.sold ?? 0,
          revenue: (p.sold_count ?? p.sold ?? 0) * (p.price ?? 0),
          image: p.image,
        })));
        setLowStockItems(res.low_stock || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <StatsSkeleton />;

  const row1 = [
    { icon: FiShoppingBag, label: t("dash.totalOrders"), value: stats?.total_orders ?? 0, color: "bg-[#0f5931]" },
    { icon: FiClock, label: t("dash.pendingOrders"), value: orderCounts.pending, color: "bg-yellow-500" },
    { icon: FiCheckCircle, label: t("dash.confirmed"), value: orderCounts.confirmed, color: "bg-blue-500" },
    { icon: FiXCircle, label: t("dash.cancelled"), value: orderCounts.cancelled, color: "bg-red-500" },
  ];
  const row2 = [
    { icon: FiDollarSign, label: t("dash.totalRevenue"), value: `৳${toBn(stats?.total_revenue ?? 0)}`, color: "bg-emerald-500", raw: true },
    { icon: FiDollarSign, label: t("dash.pendingRev"), value: `৳${toBn(revByStatus.pending)}`, color: "bg-yellow-500", raw: true },
    { icon: FiDollarSign, label: t("dash.confirmedRev"), value: `৳${toBn(revByStatus.confirmed)}`, color: "bg-blue-500", raw: true },
    { icon: FiDollarSign, label: t("dash.cancelledAmt"), value: `৳${toBn(revByStatus.cancelled)}`, color: "bg-red-500", raw: true },
  ];
  const row3 = [
    { icon: FiCalendar, label: t("dash.todayOrders"), value: stats?.today_orders ?? 0, color: "bg-indigo-500" },
    { icon: FiTrendingUp, label: t("dash.todayRevenue"), value: `৳${toBn(stats?.today_revenue ?? 0)}`, color: "bg-emerald-600", raw: true },
    { icon: FiUsers, label: t("dash.customers"), value: stats?.total_customers ?? 0, color: "bg-violet-500" },
    { icon: FiAlertCircle, label: t("dash.lowStock"), value: stats?.low_stock_count ?? stats?.low_stock ?? 0, color: "bg-orange-500" },
  ];

  const pieData = [
    { name: lang === "en" ? "Pending" : "অপেক্ষমাণ", value: orderCounts.pending },
    { name: lang === "en" ? "Confirmed" : "নিশ্চিত", value: orderCounts.confirmed },
    { name: lang === "en" ? "Processing" : "প্রসেসিং", value: orderCounts.processing },
    { name: lang === "en" ? "Shipped" : "শিপড", value: orderCounts.shipped },
    { name: lang === "en" ? "Delivered" : "ডেলিভারি", value: orderCounts.delivered },
    { name: lang === "en" ? "Cancelled" : "বাতিল", value: orderCounts.cancelled },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Row 1: Order Counts */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {row1.map((s, i) => <StatCard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} delay={i * 0.05} />)}
      </div>

      {/* Row 2: Revenue Breakdown */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {row2.map((s, i) => <StatCard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} delay={0.2 + i * 0.05} raw={s.raw} />)}
      </div>

      {/* Row 3: Business Health */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {row3.map((s, i) => <StatCard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} delay={0.4 + i * 0.05} raw={s.raw} />)}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart — Last 7 Days */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 mb-4">{t("dash.weeklyOrders")}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={dailyOrders} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="count" fill="#0f5931" radius={[6, 6, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pie Chart — Status Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 mb-4">{t("dash.statusBreakdown")}</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 py-16 text-center">{t("empty.orders")}</p>
          ) : (
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
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
                        <td className="py-2.5 text-[#0f5931] font-semibold">৳{toBn(o.total)}</td>
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
                      <td className="py-2.5 text-[#0f5931] font-semibold">৳{toBn(p.revenue)}</td>
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
              <div key={item.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <FiBox className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                  <div className="text-xs text-red-600 font-semibold">{t("cust.stockLabel")}: {toBn(item.stock)}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Customer Dashboard ───────────────────────────────────────────────────────
function CustomerDashboard({ user }: { user: { id: number; name: string; email: string; phone?: string; role: string } }) {
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
                              <span className="text-lg font-bold text-primary">৳{toBn(order.total)}</span>
                            </div>

                            {/* Order Tracking Timeline */}
                            <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                              {(["pending", "confirmed", "processing", "shipped", "delivered"] as const).map((step, i) => {
                                const stepLabels: Record<string, string> = lang === "en"
                                  ? { pending: "Pending", confirmed: "Confirmed", processing: "Processing", shipped: "Shipped", delivered: "Delivered" }
                                  : { pending: "অপেক্ষমাণ", confirmed: "নিশ্চিত", processing: "প্রসেসিং", shipped: "শিপড", delivered: "ডেলিভারি" };
                                const stepOrder = ["pending", "confirmed", "processing", "shipped", "delivered"];
                                const currentIdx = stepOrder.indexOf(order.status);
                                const isCancelled = order.status === "cancelled";
                                const isActive = !isCancelled && i <= currentIdx;
                                const isCurrent = !isCancelled && i === currentIdx;
                                return (
                                  <div key={step} className="flex items-center gap-1 shrink-0">
                                    {i > 0 && <div className={`w-6 h-0.5 ${isActive ? "bg-primary" : "bg-gray-200"}`} />}
                                    <div className="flex flex-col items-center">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCurrent ? "bg-primary text-white ring-2 ring-primary/30" : isActive ? "bg-primary text-white" : "bg-gray-200 text-gray-400"}`}>
                                        {isActive ? "✓" : toBn(i + 1)}
                                      </div>
                                      <span className={`text-[10px] mt-1 whitespace-nowrap ${isCurrent ? "text-primary font-bold" : isActive ? "text-text-body" : "text-text-light"}`}>{stepLabels[step]}</span>
                                    </div>
                                  </div>
                                );
                              })}
                              {order.status === "cancelled" && (
                                <div className="flex items-center gap-1 ml-2">
                                  <div className="w-6 h-6 rounded-full bg-sale-red text-white flex items-center justify-center text-xs font-bold">✕</div>
                                  <span className="text-[10px] text-sale-red font-bold">বাতিল</span>
                                </div>
                              )}
                            </div>

                            {order.items && order.items.length > 0 && (
                              <div className="text-sm text-text-body space-y-1">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex justify-between">
                                    <span>{item.product_name} × {toBn(item.quantity)}</span>
                                    <span className="text-text-muted">৳{toBn(item.price * item.quantity)}</span>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { t, lang } = useLang();

  if (loading) {
    return <TableSkeleton rows={3} cols={3} />;
  }

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
