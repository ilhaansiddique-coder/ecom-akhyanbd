"use client";

import { useState, lazy, Suspense } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
// PreviewBridge mount is split out + wrapped in Suspense below because
// useSearchParams() forces dynamic rendering in any sync caller, which
// breaks prerendering of /_not-found and other static error pages.
import { AuthProvider } from "@/lib/AuthContext";
import { CartProvider } from "@/lib/CartContext";
import { LanguageProvider } from "@/lib/LanguageContext";
import { SiteSettingsProvider } from "@/lib/SiteSettingsContext";
import ThemeStyleSync from "./ThemeStyleSync";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FooterBottom from "./FooterBottom";

// Non-critical UI — load after hydration, not in initial bundle
const FloatingWidgets = dynamic(() => import("./FloatingWidgets"), { ssr: false });
const FingerprintCollector = dynamic(() => import("./FingerprintCollector"), { ssr: false });
// FacebookPixel + GoogleTagManager are owned by DeferredAnalytics, which
// holds them until the browser is idle (or until the user interacts) on
// non-conversion pages — protects LCP/TBT without breaking attribution.
const DeferredAnalytics = dynamic(() => import("./DeferredAnalytics"), { ssr: false });

// Lazy-load heavy modals — not needed on initial paint
const CartDrawer = lazy(() => import("./CartDrawer"));
const SearchModal = lazy(() => import("./SearchModal"));
const AuthModal = lazy(() => import("./AuthModal"));

// Customizer iframe bridge — only mounted in preview mode
const PreviewBridge = dynamic(() => import("./PreviewBridge"), { ssr: false });

// Background route pre-warmer — kicks in 500ms after first paint and
// prefetches static routes + top product/LP slugs so subsequent navigations
// feel instant. Client-only; never blocks the initial page.
const RoutePrewarmer = dynamic(() => import("./RoutePrewarmer"), { ssr: false });

// Top-of-page progress bar shown during route transitions. Replaces the
// loading.tsx skeletons we removed, with a far less jarring affordance.
const NavigationProgress = dynamic(() => import("./NavigationProgress"), { ssr: false });

/**
 * Tiny wrapper that reads `?preview=1` and conditionally mounts the bridge.
 * Isolated so the useSearchParams call can be wrapped in <Suspense> without
 * forcing the whole app shell to opt out of static prerendering.
 */
function PreviewBridgeGate() {
  const searchParams = useSearchParams();
  const isPreview = searchParams?.get("preview") === "1";
  return isPreview ? <PreviewBridge /> : null;
}

export default function ClientLayout({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: Record<string, string | null>;
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const isDashboard = pathname.startsWith("/dashboard");
  const isLandingPage = pathname.startsWith("/lp/");
  // Checkout intentionally hides the footer to keep focus on order completion.
  const isCheckout = pathname === "/checkout" || pathname.startsWith("/checkout/");

  return (
    <LanguageProvider>
    <SiteSettingsProvider initialSettings={initialSettings}>
    <ThemeStyleSync />
    {!isDashboard && <RoutePrewarmer />}
    {!isDashboard && <NavigationProgress />}
    <Suspense fallback={null}><PreviewBridgeGate /></Suspense>
    {/* Analytics — storefront only. Skip dashboard so admin clicks don't pollute
        Pixel/GTM events or trigger PageView spam in the merchant's data.
        DeferredAnalytics defers the actual Pixel/GTM load until the browser
        is idle (or until first user interaction), except on conversion paths
        (/checkout, /lp/*, /order/*) where it mounts immediately so funnel
        events are not lost. */}
    {!isDashboard && <DeferredAnalytics />}
    <FingerprintCollector />
    <AuthProvider>
    <CartProvider>
      {!isDashboard && !isLandingPage && (
        <Navbar
          onSearchOpen={() => setSearchOpen(true)}
          onCartOpen={() => setCartOpen(true)}
          onAuthOpen={() => setAuthOpen(true)}
        />
      )}
      <main>{children}</main>
      {!isDashboard && !isLandingPage && (
        <>
          {!isCheckout && <Footer />}
          {!isCheckout && <FooterBottom />}
          <FloatingWidgets />
          <Suspense fallback={null}>
            {cartOpen && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
            {searchOpen && <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />}
            {authOpen && <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />}
          </Suspense>
        </>
      )}
    </CartProvider>
    </AuthProvider>
    </SiteSettingsProvider>
    </LanguageProvider>
  );
}
