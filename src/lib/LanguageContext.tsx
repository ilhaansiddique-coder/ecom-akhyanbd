"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

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
  const [lang, setLangState] = useState<Lang>("bn");

  useEffect(() => {
    // 1. Check user's saved preference first
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "en" || saved === "bn") {
      setLangState(saved);
      setNumberLang(saved);
      return;
    }
    // 2. No user preference — fetch site default language
    fetch("/api/v1/checkout-settings", { headers: { Accept: "application/json" } })
      .then(r => r.json())
      .then(data => {
        const siteLang = data?.site_language as Lang | undefined;
        if (siteLang === "en" || siteLang === "bn") {
          setLangState(siteLang);
          setNumberLang(siteLang);
        }
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setNumberLang(l);
    localStorage.setItem("lang", l);
    document.documentElement.lang = l === "en" ? "en" : "bn";
    document.documentElement.classList.toggle("lang-en", l === "en");
    document.documentElement.classList.toggle("lang-bn", l === "bn");
  }, []);

  // Set initial classes
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
