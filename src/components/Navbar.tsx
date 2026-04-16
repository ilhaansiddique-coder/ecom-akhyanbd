"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiSearch, FiShoppingCart, FiMenu, FiX, FiPhone, FiUser, FiLogOut } from "react-icons/fi";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { useLang } from "@/lib/LanguageContext";
import { useSiteSettings } from "@/lib/SiteSettingsContext";
import { toBn } from "@/utils/toBn";

interface NavbarProps {
  onSearchOpen: () => void;
  onCartOpen: () => void;
  onAuthOpen: () => void;
}

const menuKeys = [
  { key: "nav.home", href: "/" },
  { key: "nav.shop", href: "/shop" },
  { key: "nav.about", href: "/about" },
  { key: "nav.contact", href: "/contact" },
  { key: "nav.blog", href: "/blog" },
];

function AuthButton({ onAuthOpen, mobile = false }: { onAuthOpen: () => void; mobile?: boolean }) {
  const { user, logout } = useAuth();
  const { t } = useLang();

  if (user) {
    return (
      <div className={`${mobile ? "flex" : "hidden sm:flex"} items-center bg-primary/10 rounded-xl`}>
        <Link href="/dashboard" className="flex items-center gap-2 pl-3 pr-2 py-1.5 hover:bg-primary/15 rounded-l-xl transition-colors">
          <FiUser className="w-4 h-4 text-primary shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground truncate max-w-25 leading-tight">{user.name}</span>
            <span className="text-[10px] text-primary leading-none">{t("nav.dashboard")}</span>
          </div>
        </Link>
        <button
          onClick={logout}
          className="p-2 mr-0.5 hover:bg-sale-red/10 rounded-lg transition-colors text-text-muted hover:text-sale-red"
          aria-label={t("nav.logout")}
        >
          <FiLogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onAuthOpen}
      className={`${mobile ? "flex" : "hidden sm:flex"} items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors`}
    >
      <FiUser className="w-4 h-4" />
      <span>{t("nav.login")}</span>
    </button>
  );
}

export default function Navbar({ onSearchOpen, onCartOpen, onAuthOpen }: NavbarProps) {
  const { totalItems } = useCart();
  const { t, lang } = useLang();
  const settings = useSiteSettings();
  const headerPhone = settings.phone || "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Top Bar */}
      <div className="bg-primary text-white text-sm py-2 hidden md:block">
        <div className="container mx-auto px-4 flex items-center justify-between">
          {headerPhone && (
            <a href={`tel:${headerPhone}`} className="flex items-center gap-2 hover:text-white/80 transition-colors">
              <FiPhone className="w-3.5 h-3.5" />
              <span>{headerPhone}</span>
            </a>
          )}
          <p className="text-white/90 text-xs">
            {t("nav.topbar.delivery")}
          </p>
          <p className="text-white/90 text-xs">
            {t("nav.topbar.order")}
          </p>
        </div>
      </div>

      {/* Main Nav */}
      <nav className={`bg-white sticky top-0 z-50 w-full transition-shadow duration-300 ${scrolled ? "shadow-md" : "shadow-sm"}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <button
              className="lg:hidden p-2 -ml-2 text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={t("nav.menuToggle")}
            >
              {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Image src="/logo.svg" alt={t("hero.title")} width={48} height={38} className="h-9 lg:h-11" style={{ width: "auto" }} priority />
              <div className="hidden sm:block">
                <h1 className="text-base lg:text-lg font-bold text-primary leading-tight tracking-tight">
                  {t("hero.title")}
                </h1>
                <p className="text-[10px] lg:text-[11px] text-text-muted -mt-0.5">
                  {t("footer.tagline")}
                </p>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-1">
              {menuKeys.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="px-4 py-2 text-foreground hover:text-primary font-medium transition-colors rounded-lg hover:bg-primary/5"
                >
                  {t(item.key)}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSearchOpen}
                className="p-2.5 hover:bg-background-alt rounded-full transition-colors text-foreground hover:text-primary"
                aria-label={t("nav.search")}
              >
                <FiSearch className="w-5 h-5" />
              </button>
              <button
                onClick={onCartOpen}
                className="relative p-2.5 hover:bg-background-alt rounded-full transition-colors text-foreground hover:text-primary"
                aria-label={t("nav.cart")}
              >
                <FiShoppingCart className="w-5 h-5" />
                {totalItems > 0 && <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-sale-red text-white text-[10px] font-bold rounded-full flex items-center justify-center" suppressHydrationWarning>{toBn(totalItems)}</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden border-t border-border overflow-hidden bg-white transition-all duration-250 ease-out ${mobileMenuOpen ? "max-h-[70vh] opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="py-3 px-4 space-y-1 max-h-[70vh] overflow-y-auto">

            {menuKeys.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="block py-3 px-4 text-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t(item.key)}
              </Link>
            ))}

            {headerPhone && (
              <div className="pt-3 mt-3 border-t border-border">
                <a href={`tel:${headerPhone}`} className="flex items-center gap-2 text-sm text-text-muted px-4 py-2 hover:text-primary transition-colors">
                  <FiPhone className="w-4 h-4" />
                  <span>{headerPhone}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
