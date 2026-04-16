"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";

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
  FiChevronLeft,
  FiShoppingCart,
  FiMail,
  FiGlobe,
  FiShield,
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
        { label: t("dash.spamDetection") || "Spam Detection", href: "/dashboard/spam", icon: FiShield },
      ],
    },
    {
      label: t("dash.customer"),
      icon: FiUsers,
      items: [
        { label: t("dash.users"), href: "/dashboard/users", icon: FiUsers },
        { label: t("dash.reviews"), href: "/dashboard/reviews", icon: FiStar },
        { label: t("dash.formSubmissions"), href: "/dashboard/form-submissions", icon: FiMail },
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
        { label: t("dash.homepageContent") || "Homepage", href: "/dashboard/homepage", icon: FiLayout },
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
        { label: t("dash.checkoutSettings"), href: "/dashboard/settings/checkout", icon: FiShoppingCart },
        { label: t("dash.courierSettings"), href: "/dashboard/settings/courier", icon: FiTruck },
        { label: t("dash.emailSettings"), href: "/dashboard/settings/email", icon: FiMail },
        { label: t("dash.languageSettings"), href: "/dashboard/settings/language", icon: FiGlobe },
      ],
    },
  ];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

// Read collapsed state synchronously to prevent flash on navigation
function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("sidebar_collapsed") === "true";
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { t } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const navGroups = buildNavGroups(t);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar_collapsed", String(!prev));
      return !prev;
    });
  };

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

  // Expanded sidebar content (used for desktop expanded + mobile)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-5 border-b border-white/10 flex justify-center">
        <Image src="/logo.svg" alt="মা ভেষজ বাণিজ্যালয়" width={160} height={48} className="h-10 w-auto" unoptimized onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block"; }} />
        <div className="hidden text-center">
          <div className="text-white font-bold text-lg leading-tight">মা ভেষজ বাণিজ্যালয়</div>
          <div className="text-white/60 text-xs mt-1 font-medium tracking-wide uppercase">{t("dash.adminPanel")}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto sidebar-nav px-3 py-4 space-y-0.5">
        {navGroups.map((group) => {
          if (!group.items) {
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

  // Collapsed sidebar content (icon-only)
  const collapsedSidebarContent = (
    <div className="flex flex-col h-full items-center overflow-visible">
      {/* Collapsed header */}
      <div className="py-5 border-b border-white/10 w-full flex justify-center">
        <Image src="/logo.svg" alt="মা ভেষজ বাণিজ্যালয়" width={36} height={28} className="h-7 w-auto" unoptimized onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"; }} />
        <div className="hidden w-9 h-9 rounded-xl bg-white/20 items-center justify-center text-white font-bold text-sm">ম</div>
      </div>

      {/* Nav icons */}
      <nav className="flex-1 overflow-visible py-4 px-2 space-y-1 w-full">
        {navGroups.map((group) => {
          if (!group.items) {
            const isActive = pathname === group.href;
            return (
              <Link
                key={group.label}
                href={group.href!}
                className={`relative group flex items-center justify-center w-full h-10 rounded-xl transition-all ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <group.icon className="w-5 h-5" />
                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-3 py-2 bg-[#0f5931] text-white text-xs font-semibold rounded-xl whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-[100] shadow-lg border border-white/10">
                  {group.label}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#0f5931] rotate-45 border-l border-b border-white/10" />
                </div>
              </Link>
            );
          }

          const isGroupActive = group.items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href)
          );

          return (
            <div key={group.label} className="relative group">
              <div
                className={`flex items-center justify-center w-full h-10 rounded-xl transition-all cursor-pointer ${
                  isGroupActive
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <group.icon className="w-5 h-5" />
              </div>
              {/* Flyout menu */}
              <div className="absolute left-full top-0 ml-3 py-2 bg-[#0f5931] rounded-xl shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] min-w-[200px]">
                <div className="px-3.5 py-2 text-white/50 text-[10px] font-bold uppercase tracking-wider border-b border-white/10 mb-1">{group.label}</div>
                {group.items.map((item) => {
                  const isItemActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                        isItemActive
                          ? "text-white bg-white/15"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <div className="absolute top-3 -left-1.5 w-3 h-3 bg-[#0f5931] rotate-45 border-l border-b border-white/10" />
              </div>
            </div>
          );
        })}
      </nav>

      {/* User avatar at bottom */}
      <div className="py-4 border-t border-white/10 w-full flex justify-center">
        <div className="relative group">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold cursor-pointer">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="absolute left-full ml-3 px-3 py-2 bg-[#0f5931] text-white text-xs font-semibold rounded-xl whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-[100] shadow-lg border border-white/10">
            {user?.name}
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#0f5931] rotate-45 border-l border-b border-white/10" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar — no width transition to prevent flash on navigation */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-[#0f5931] relative ${
          collapsed ? "w-[68px] overflow-visible" : "w-[260px]"
        }`}
      >
        {collapsed ? collapsedSidebarContent : sidebarContent}
        {/* Collapse toggle button */}
        <button
          onClick={toggleCollapsed}
          className="absolute -right-3 top-8 w-6 h-6 bg-[#0f5931] border-2 border-gray-200 rounded-full flex items-center justify-center text-white hover:bg-[#12693a] transition-colors z-10 shadow-sm"
        >
          {collapsed ? (
            <FiChevronRight className="w-3 h-3" />
          ) : (
            <FiChevronLeft className="w-3 h-3" />
          )}
        </button>
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
              {/* Close button floating top-right */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-1 z-10"
              >
                <FiX className="w-5 h-5" />
              </button>
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
        <main className="flex-1 overflow-y-auto inline-select-scroll p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
