"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export type Lang = "bn" | "en";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

/* --------------- translations --------------- */
import { bn } from "@/i18n/bn";
import { en } from "@/i18n/en";
import { setNumberLang } from "@/utils/toBn";

const dicts: Record<Lang, Record<string, string>> = { bn, en };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard") || pathname?.startsWith("/cdlogin");
  // Pick the initial language SYNCHRONOUSLY from the route so the first paint
  // is already in the right language. Dashboard → English by default, public
  // storefront → Bengali. Without this, state starts as "bn" and flips to "en"
  // after the settings fetch resolves, causing a visible BN→EN flash on every
  // dashboard load.
  // Read cached preference synchronously so first paint matches the value the
  // settings fetch will resolve to. Without this, every refresh flashes the
  // hardcoded default ("en" for dashboard / "bn" for storefront) before the
  // fetch resolves and switches to the user's actual saved preference.
  const [lang, setLangState] = useState<Lang>(() => {
    const fallback: Lang = isDashboard ? "en" : "bn";
    if (typeof window === "undefined") return fallback;
    try {
      const key = isDashboard ? "akhiyan_dashboard_lang" : "akhiyan_site_lang";
      const cached = window.localStorage.getItem(key);
      if (cached === "en" || cached === "bn") return cached;
    } catch {}
    return fallback;
  });
  const settingsRef = useRef<{ site_language?: string; dashboard_language?: string } | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Fetch settings once, then apply based on current route
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      try {
        fetch("/api/v1/checkout-settings", { headers: { Accept: "application/json" } })
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(data => {
            settingsRef.current = data || {};
            applyLang(data);
          })
          .catch(() => {
            // Fallback: use defaults
            settingsRef.current = {};
          });
      } catch {
        settingsRef.current = {};
      }
    } else if (settingsRef.current) {
      applyLang(settingsRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDashboard]);

  function applyLang(data: Record<string, string | undefined>) {
    const frontendLang = (data?.site_language || "bn") as Lang;
    const dashboardLang = (data?.dashboard_language || "en") as Lang;
    const activeLang = isDashboard ? dashboardLang : frontendLang;

    if (activeLang === "en" || activeLang === "bn") {
      setLangState(activeLang);
      setNumberLang(activeLang);
      // Cache for next refresh so initial paint matches
      try {
        const key = isDashboard ? "akhiyan_dashboard_lang" : "akhiyan_site_lang";
        window.localStorage.setItem(key, activeLang);
      } catch {}
    }
  }

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setNumberLang(l);
    document.documentElement.lang = l === "en" ? "en" : "bn";
    document.documentElement.classList.toggle("lang-en", l === "en");
    document.documentElement.classList.toggle("lang-bn", l === "bn");
    try {
      const key = isDashboard ? "akhiyan_dashboard_lang" : "akhiyan_site_lang";
      window.localStorage.setItem(key, l);
    } catch {}
  }, [isDashboard]);

  // Set HTML lang classes
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "bn";
    document.documentElement.classList.toggle("lang-en", lang === "en");
    document.documentElement.classList.toggle("lang-bn", lang === "bn");
  }, [lang]);

  const t = useCallback((key: string): string => {
    const val = dicts[lang][key] ?? dicts.bn[key];
    return val !== undefined ? val : key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
