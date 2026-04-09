"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import LanguageToggle from "./LanguageToggle";
import {
  FiHome,
  FiBox,
  FiTag,
  FiAward,
  FiShoppingBag,
  FiUsers,
  FiStar,
  FiZap,
  FiPercent,
  FiImage,
  FiMenu as FiMenuIcon,
  FiFileText,
  FiLayout,
  FiTruck,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: NavItem[];
  href?: string;
}

function buildNavGroups(t: (key: string) => string): NavGroup[] {
  return [
    {
      label: t("dash.dashboard"),
      icon: FiHome,
      href: "/dashboard",
    },
    {
      label: t("dash.productMgmt"),
      icon: FiBox,
      items: [
        { label: t("dash.products"), href: "/dashboard/products", icon: FiBox },
        { label: t("dash.categories"), href: "/dashboard/categories", icon: FiTag },
        { label: t("dash.brands"), href: "/dashboard/brands", icon: FiAward },
      ],
    },
    {
      label: t("dash.orderMgmt"),
      icon: FiShoppingBag,
      items: [
        { label: t("dash.orders"), href: "/dashboard/orders", icon: FiShoppingBag },
      ],
    },
    {
      label: t("dash.customer"),
      icon: FiUsers,
      items: [
        { label: t("dash.users"), href: "/dashboard/users", icon: FiUsers },
        { label: t("dash.reviews"), href: "/dashboard/reviews", icon: FiStar },
      ],
    },
    {
      label: t("dash.marketing"),
      icon: FiZap,
      items: [
        { label: t("dash.flashSales"), href: "/dashboard/flash-sales", icon: FiZap },
        { label: t("dash.coupons"), href: "/dashboard/coupons", icon: FiPercent },
      ],
    },
    {
      label: t("dash.content"),
      icon: FiLayout,
      items: [
        { label: t("dash.banners"), href: "/dashboard/banners", icon: FiImage },
        { label: t("dash.menus"), href: "/dashboard/menus", icon: FiMenuIcon },
        { label: t("dash.blog"), href: "/dashboard/blog", icon: FiFileText },
        { label: t("dash.landingPages"), href: "/dashboard/landing-pages", icon: FiLayout },
      ],
    },
    {
      label: t("dash.settings"),
      icon: FiSettings,
      items: [
        { label: t("dash.shippingZones"), href: "/dashboard/shipping", icon: FiTruck },
        { label: t("dash.siteSettings"), href: "/dashboard/settings", icon: FiSettings },
      ],
    },
  ];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { t } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const navGroups = buildNavGroups(t);

  // Auto-expand the active group when pathname changes
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      navGroups.forEach((g) => {
        if (g.items) {
          const isActive = g.items.some((item) => pathname === item.href || pathname.startsWith(item.href));
          if (isActive) next[g.label] = true;
        }
      });
      return next;
    });
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const shouldRedirect = !loading && (!user || user.role !== "admin");

  useEffect(() => {
    if (shouldRedirect) router.push("/");
  }, [shouldRedirect, router]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="text-white font-bold text-lg leading-tight">{t("footer.companyName")}</div>
        <div className="text-white/60 text-xs mt-1 font-medium tracking-wide uppercase">{t("dash.adminPanel")}</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navGroups.map((group) => {
          if (!group.items) {
            // Single link (Dashboard)
            const isActive = pathname === group.href;
            return (
              <Link
                key={group.label}
                href={group.href!}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <group.icon className="w-4 h-4 flex-shrink-0" />
                <span>{group.label}</span>
              </Link>
            );
          }

          const isGroupActive = group.items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href)
          );
          const isOpen = openGroups[group.label] ?? isGroupActive;

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isGroupActive
                    ? "text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <group.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                {isOpen ? (
                  <FiChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <FiChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pt-0.5 pb-1 space-y-0.5">
                      {group.items.map((item) => {
                        const isItemActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                              isItemActive
                                ? "bg-white/20 text-white font-semibold"
                                : "text-white/60 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{user?.name}</div>
            <div className="text-white/50 text-xs truncate">{user?.email}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 bg-[#0f5931]">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed left-0 top-0 bottom-0 w-[260px] bg-[#0f5931] z-50 lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-end px-4 py-3">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-white/70 hover:text-white p-1"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {sidebarContent}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
          >
            <FiMenu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800 flex-1">{title}</h1>
          <div className="flex items-center gap-3">
            <LanguageToggle compact />
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#0f5931] hover:bg-green-50 rounded-lg transition-colors"
            >
              <FiHome className="w-4 h-4" />
              <span className="hidden sm:block">{t("dash.homepage")}</span>
            </Link>
            <span className="hidden sm:block text-sm text-gray-600 font-medium">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
              <span className="hidden sm:block">{t("dash.logout")}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
