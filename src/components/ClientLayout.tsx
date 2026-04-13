"use client";

import { useState, lazy, Suspense } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/AuthContext";
import { CartProvider } from "@/lib/CartContext";
import { LanguageProvider } from "@/lib/LanguageContext";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FooterBottom from "./FooterBottom";

// Non-critical UI — load after hydration, not in initial bundle
const FloatingWidgets = dynamic(() => import("./FloatingWidgets"), { ssr: false });

// Lazy-load heavy modals — not needed on initial paint
const CartDrawer = lazy(() => import("./CartDrawer"));
const SearchModal = lazy(() => import("./SearchModal"));
const AuthModal = lazy(() => import("./AuthModal"));

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const isDashboard = pathname.startsWith("/dashboard");
  const isLandingPage = pathname.startsWith("/lp/");

  return (
    <LanguageProvider>
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
          <Footer />
          <FooterBottom />
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
    </LanguageProvider>
  );
}
