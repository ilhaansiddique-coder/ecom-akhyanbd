"use client";

/**
 * Keeps `<style id="theme-tokens">` in sync with the live SiteSettings.
 *
 * The root layout SSR-injects the style block once with whatever settings the
 * DB had at request time. After that, soft navigations (router.push) reuse the
 * same DOM and never re-render <head>. So when an admin saves new theme tokens
 * in the customizer, the dashboard chrome — which uses bg-[var(--primary)],
 * etc. — keeps the stale colors until a hard reload.
 *
 * This component bridges that gap: it watches the SiteSettingsContext (which
 * the customizer pushes overrides into via PreviewBridge, and which gets
 * re-fetched / re-hydrated after a save) and rewrites the style tag's text
 * content whenever the theme tokens change. Result: theme color changes apply
 * to the dashboard (and every other page) live.
 */

import { useEffect } from "react";
import { useSiteSettings } from "@/lib/SiteSettingsContext";
import { buildThemeCss, TOKEN_KEYS } from "@/lib/theme-tokens";

export default function ThemeStyleSync() {
  const settings = useSiteSettings();

  // Cheap hash of just the theme-relevant keys so we don't rewrite on
  // unrelated settings changes (logo, phone, etc.).
  const sig = TOKEN_KEYS.map((k) => `${k}=${settings[k] ?? ""}`).join("|");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const css = buildThemeCss(settings);
    let el = document.getElementById("theme-tokens") as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = "theme-tokens";
      document.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return null;
}
