"use client";

import { useState, useEffect, createContext, useContext } from "react";

// Context lets a single outer shell (dashboard/layout.tsx) own the persistent
// sidebar/header. Nested <DashboardLayout title="..."> calls inside individual
// pages then just publish their title up to the shell and render children
// directly — no double sidebar, and the sidebar doesn't unmount on navigation.
interface ShellCtx { setTitle: (s: string) => void; }
const DashboardShellContext = createContext<ShellCtx | null>(null);
export const useIsInsideDashboardShell = () => useContext(DashboardShellContext) !== null;
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { useSiteSettings } from "@/lib/SiteSettingsContext";
import InstallPwaButton from "@/components/dashboard/InstallPwaButton";

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
  FiLink,
  FiRss,
  FiTruck,
  FiSettings,
  FiDroplet,
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
  FiInfo,
  FiRefreshCw,
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

// Routes a "staff" role can navigate to. Anything outside this list is hidden
// from the sidebar AND blocked by the per-page server guards. Keep in sync
// with the page-level `isStaffOrAdmin` checks in the dashboard route segments.
const STAFF_ALLOWED_PREFIXES = [
  "/dashboard/products",        // products list + new + [id]/edit
  "/dashboard/categories",      // taxonomy needed for product creation
  "/dashboard/brands",          // taxonomy needed for product creation
  "/dashboard/orders",          // orders list + [id]/details
  "/dashboard/spam",            // spam detection (orders-related)
  "/dashboard/landing-pages",   // landing pages list + create + edit
];

export function isStaffAllowedPath(pathname: string): boolean {
  // Exact "/dashboard" or starts with one of the allowed prefixes followed by /
  return STAFF_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function buildNavGroups(t: (key: string) => string, role: string): NavGroup[] {
  const isStaffOnly = role === "staff";

  // Staff sidebar — Products/Categories/Brands + Orders/Spam + Landing Pages.
  // Settings, Users, Customizer, Marketing remain admin-only.
  if (isStaffOnly) {
    return [
      {
        label: t("dash.productMgmt"),
        icon: FiBox,
        items: [
          { label: t("dash.allProducts"), href: "/dashboard/products", icon: FiBox },
          { label: t("dash.categories"), href: "/dashboard/categories", icon: FiTag },
          { label: t("dash.brands"), href: "/dashboard/brands", icon: FiAward },
        ],
      },
      {
        label: t("dash.orderMgmt"),
        icon: FiShoppingBag,
        items: [
          { label: t("dash.allOrders"), href: "/dashboard/orders", icon: FiShoppingBag },
          { label: t("dash.incompleteOrders") || "Incomplete Orders", href: "/dashboard/orders/incomplete", icon: FiShoppingBag },
          { label: t("dash.spamDetection") || "Spam Detection", href: "/dashboard/spam", icon: FiShield },
        ],
      },
      {
        label: t("dash.content"),
        icon: FiLayout,
        items: [
          { label: t("dash.landingPages"), href: "/dashboard/landing-pages", icon: FiLayout },
        ],
      },
    ];
  }

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
        { label: t("dash.incompleteOrders") || "Incomplete Orders", href: "/dashboard/orders/incomplete", icon: FiShoppingBag },
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
        { label: t("dash.shortlinks") || "Shortlinks", href: "/dashboard/shortlinks", icon: FiLink },
      ],
    },
    {
      label: t("dash.content"),
      icon: FiLayout,
      items: [
        { label: "Header & Footer", href: "/dashboard/content/header-footer", icon: FiLayout },
        { label: "Home", href: "/dashboard/homepage", icon: FiHome },
        { label: "Shop", href: "/dashboard/content/shop", icon: FiShoppingBag },
        { label: "About Us", href: "/dashboard/content/about", icon: FiInfo },
        { label: "Contact Us", href: "/dashboard/content/contact", icon: FiMail },
        { label: t("dash.blog"), href: "/dashboard/blog", icon: FiFileText },
        { label: "Email", href: "/dashboard/content/email", icon: FiMail },
        { label: "Privacy", href: "/dashboard/content/privacy", icon: FiShield },
        { label: "Terms", href: "/dashboard/content/terms", icon: FiFileText },
        { label: "Refund", href: "/dashboard/content/refund", icon: FiRefreshCw },
      ],
    },
    // Promoted out of Content — top-level menu items (no submenu).
    { label: t("dash.banners"), icon: FiImage, href: "/dashboard/banners" },
    { label: t("dash.menus"), icon: FiMenuIcon, href: "/dashboard/menus" },
    { label: t("dash.landingPages"), icon: FiLayout, href: "/dashboard/landing-pages" },
    { label: t("dash.feeds") || "Product Feeds", icon: FiRss, href: "/dashboard/feeds" },
    {
      label: t("dash.settings"),
      icon: FiSettings,
      items: [
        { label: "Customizer", href: "/dashboard/customizer", icon: FiDroplet },
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

// Read collapsed state from localStorage. Used in a post-mount effect so SSR
// markup (always expanded) matches first client render — preventing hydration
// mismatch — and the real preference is applied immediately after.
function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("sidebar_collapsed") === "true";
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const outerShell = useContext(DashboardShellContext);
  // When an outer shell is present, just publish title and render children inline.
  useEffect(() => {
    if (outerShell) outerShell.setTitle(title);
  }, [outerShell, title]);
  if (outerShell) return <>{children}</>;
  return <DashboardLayoutShell initialTitle={title}>{children}</DashboardLayoutShell>;
}

// The shell is the actual sidebar + header + main wrapper. It can be mounted
// once at dashboard/layout.tsx, OR (legacy) by a single per-page DashboardLayout.
export function DashboardLayoutShell({ children, initialTitle = "" }: { children: React.ReactNode; initialTitle?: string }) {
  const [title, setTitle] = useState(initialTitle);
  const pathname = usePathname();
  // NOTE: the customizer-route bypass MUST come after all hook calls below —
  // an early return before later hooks would flip the hook count on
  // navigation and trigger "Rendered fewer hooks than expected".
  const isCustomizerRoute = !!pathname?.startsWith("/dashboard/customizer");
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { t } = useLang();
  const settings = useSiteSettings();
  const siteLogo = settings.site_logo || "/logo.svg";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Start expanded on both SSR + first client render to avoid hydration mismatch,
  // then sync to the persisted preference in a layout effect (runs before paint).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { setCollapsed(readCollapsed()); }, []);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const navGroups = buildNavGroups(t, user?.role ?? "");

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

  // Redirect rules:
  //   - Not logged in or customer role → kick to home.
  //   - Staff role → allowed only on STAFF_ALLOWED_PREFIXES; if they land on
  //     anything else (e.g. /dashboard/customizer via direct URL), bounce to
  //     /dashboard so they get a graceful experience instead of a 403.
  const isStaff = user?.role === "staff";
  const isAdmin = user?.role === "admin";
  const shouldRedirectHome = !loading && (!user || (!isAdmin && !isStaff));
  const shouldRedirectStaff = !loading && isStaff && !isStaffAllowedPath(pathname ?? "");

  useEffect(() => {
    if (shouldRedirectHome) router.push("/");
    // Staff have no /dashboard home anymore — send them to their first allowed page.
    else if (shouldRedirectStaff) router.push("/dashboard/products");
  }, [shouldRedirectHome, shouldRedirectStaff, router]);

  // Expanded sidebar content (used for desktop expanded + mobile)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-5 border-b border-white/10 flex justify-center">
        <Image src={siteLogo} alt="Site Logo" width={160} height={48} className="h-10 w-auto" unoptimized onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block"; }} />
        <div className="hidden text-center">
          <div className="text-white font-bold text-lg leading-tight">{t("footer.companyName")}</div>
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
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold" suppressHydrationWarning>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate" suppressHydrationWarning>{user?.name}</div>
            <div className="text-white/50 text-xs truncate" suppressHydrationWarning>{user?.email}</div>
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
        <Image src={siteLogo} alt="Site Logo" width={36} height={28} className="h-7 w-auto" unoptimized onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"; }} />
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
                <div className="absolute left-full ml-3 px-3 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-xl whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-[100] shadow-lg border border-white/10">
                  {group.label}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[var(--primary)] rotate-45 border-l border-b border-white/10" />
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
              {/* Flyout menu — vertically centered on icon, clamped to viewport, scrolls if too tall */}
              <div
                className="absolute left-full ml-3 bg-[var(--primary)] rounded-xl shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] min-w-[200px] flex flex-col"
                style={{
                  top: "50%",
                  transform: "translateY(-50%)",
                  maxHeight: "calc(100vh - 2rem)",
                }}
              >
                <div className="px-3.5 py-2 text-white/50 text-[10px] font-bold uppercase tracking-wider border-b border-white/10 shrink-0">{group.label}</div>
                <div className="overflow-y-auto py-1 sidebar-nav">
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
                        <span className="whitespace-nowrap">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-[var(--primary)] rotate-45 border-l border-b border-white/10" />
              </div>
            </div>
          );
        })}
      </nav>

      {/* User avatar at bottom */}
      <div className="py-4 border-t border-white/10 w-full flex justify-center">
        <div className="relative group">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold cursor-pointer" suppressHydrationWarning>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="absolute left-full ml-3 px-3 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-xl whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-[100] shadow-lg border border-white/10" suppressHydrationWarning>
            {user?.name}
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[var(--primary)] rotate-45 border-l border-b border-white/10" />
          </div>
        </div>
      </div>
    </div>
  );

  // Customizer renders its own fullscreen chrome — bypass the sidebar/header.
  // Placed after all hook calls above to keep the hook order stable.
  if (isCustomizerRoute) {
    return (
      <DashboardShellContext.Provider value={{ setTitle }}>
        {children}
      </DashboardShellContext.Provider>
    );
  }

  return (
    <DashboardShellContext.Provider value={{ setTitle }}>
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar — no width transition to prevent flash on navigation.
          Inline style mirrors the Tailwind class but also gives a hard fallback
          (#0f5931) so the sidebar still renders themed even if the
          <style id="theme-tokens"> block is missing/empty during a fast HMR
          reload or before the SiteSettingsProvider has hydrated. */}
      <aside
        style={{ backgroundColor: "var(--primary, #0f5931)" }}
        className={`hidden lg:flex flex-col flex-shrink-0 relative ${
          collapsed ? "w-[68px] overflow-visible" : "w-[260px]"
        }`}
      >
        {collapsed ? collapsedSidebarContent : sidebarContent}
        {/* Collapse toggle button */}
        <button
          onClick={toggleCollapsed}
          style={{ backgroundColor: "var(--primary, #0f5931)" }}
          className="absolute -right-3 top-8 w-6 h-6 border-2 border-gray-200 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-opacity z-10 shadow-sm"
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
              style={{ backgroundColor: "var(--primary, #0f5931)" }}
              className="fixed left-0 top-0 bottom-0 w-[260px] z-50 lg:hidden flex flex-col"
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
          <h1 className="text-lg font-bold text-gray-800 flex-1" suppressHydrationWarning>{title}</h1>
          <div className="flex items-center gap-3">
            <InstallPwaButton />
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--primary)] hover:bg-green-50 rounded-lg transition-colors"
            >
              <FiHome className="w-4 h-4" />
              <span className="hidden sm:block">{t("dash.homepage")}</span>
            </Link>
            <span className="hidden sm:block text-sm text-gray-600 font-medium" suppressHydrationWarning>{user?.name}</span>
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
    </DashboardShellContext.Provider>
  );
}
