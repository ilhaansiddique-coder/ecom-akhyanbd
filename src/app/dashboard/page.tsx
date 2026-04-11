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
} from "react-icons/fi";
import DashboardLayout from "@/components/DashboardLayout";
import { useLang } from "@/lib/LanguageContext";

// ─── Status labels ───────────────────────────────────────────────────────────
const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "অপেক্ষমাণ", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "নিশ্চিত", color: "bg-blue-100 text-blue-800" },
  processing: { label: "প্রসেসিং", color: "bg-indigo-100 text-indigo-800" },
  shipped: { label: "শিপড", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "ডেলিভারি সম্পন্ন", color: "bg-green-100 text-green-800" },
  cancelled: { label: "বাতিল", color: "bg-red-100 text-red-800" },
};

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
  total_customers: number;
  total_products: number;
  pending_orders: number;
  low_stock: number;
}
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-800">{toBn(value)}</div>
        <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      </div>
    </motion.div>
  );
}

function AdminDashboard() {
  const { t, lang } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.dashboard()
      .then((res) => {
        setStats(res.stats || null);
        setRecentOrders(res.recent_orders || []);
        setTopProducts(res.top_products || []);
        setLowStockItems(res.low_stock || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <StatsSkeleton />;
  }

  const statCards = [
    { icon: FiShoppingBag, label: t("dash.totalOrders"), value: stats?.total_orders ?? 0, color: "bg-[#0f5931]", delay: 0 },
    { icon: FiClock, label: t("dash.todayOrders"), value: stats?.today_orders ?? 0, color: "bg-blue-500", delay: 0.05 },
    { icon: FiDollarSign, label: t("dash.totalRevenue"), value: stats?.total_revenue ?? 0, color: "bg-emerald-500", delay: 0.1 },
    { icon: FiUsers, label: t("dash.customers"), value: stats?.total_customers ?? 0, color: "bg-violet-500", delay: 0.15 },
    { icon: FiBox, label: t("dash.productCount"), value: stats?.total_products ?? 0, color: "bg-orange-500", delay: 0.2 },
    { icon: FiAlertCircle, label: t("dash.pendingOrders"), value: stats?.pending_orders ?? 0, color: "bg-yellow-500", delay: 0.25 },
    { icon: FiTrendingUp, label: t("dash.lowStock"), value: stats?.low_stock ?? 0, color: "bg-red-500", delay: 0.3 },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
        >
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
                    const st = statusLabels[o.status] || { label: o.status, color: "bg-gray-100 text-gray-800" };
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
        >
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm"
        >
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
                        const st = statusLabels[order.status] || { label: order.status, color: "bg-gray-100 text-gray-800" };
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
                                const stepLabels: Record<string, string> = { pending: "অপেক্ষমাণ", confirmed: "নিশ্চিত", processing: "প্রসেসিং", shipped: "শিপড", delivered: "ডেলিভারি" };
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
