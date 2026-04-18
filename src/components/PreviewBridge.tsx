"use client";

/**
 * PreviewBridge — mounted only when the page loads inside the dashboard
 * customizer iframe (?preview=1).
 *
 * Receives two kinds of updates from the parent customizer:
 *
 *   { type: "customizer:tokens", tokens: { [tokenKey]: value, ... } }
 *     → CSS tokens. Injected into a <style id="preview-tokens"> tag that
 *       overrides the server-rendered <style id="theme-tokens">. Doesn't
 *       trigger React re-renders (cheap on every keystroke).
 *
 *   { type: "customizer:options", options: { [optionKey]: value, ... } }
 *     → Non-CSS settings (variant selects, toggles, text). Pushed into
 *       SiteSettingsContext so components re-render with the new values.
 *
 * Iframe → parent on mount: { type: "customizer:ready" }
 */

import { useEffect } from "react";
import { TOKENS_BY_KEY } from "@/lib/theme-tokens";
import { useSiteSettingsInternal } from "@/lib/SiteSettingsContext";

export default function PreviewBridge() {
  const { setPreviewOverrides } = useSiteSettingsInternal();

  useEffect(() => {
    function tokensToCss(tokens: Record<string, string>): string {
      const decls: string[] = [];
      for (const [key, value] of Object.entries(tokens)) {
        const def = TOKENS_BY_KEY[key];
        if (!def || value == null || value === "") continue;
        const final = def.type === "size" && def.unit ? `${value}${def.unit}` : value;
        decls.push(`${def.cssVar}: ${final};`);
      }
      return `:root { ${decls.join(" ")} }`;
    }

    function ensureStyleEl(): HTMLStyleElement {
      let el = document.getElementById("preview-tokens") as HTMLStyleElement | null;
      if (!el) {
        el = document.createElement("style");
        el.id = "preview-tokens";
        document.head.appendChild(el);
      }
      return el;
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data as
        | { type?: string; tokens?: Record<string, string>; options?: Record<string, string>; branding?: Record<string, string> }
        | null;
      if (!data) return;
      if (data.type === "customizer:tokens" && data.tokens) {
        ensureStyleEl().textContent = tokensToCss(data.tokens);
      } else if (data.type === "customizer:options" && data.options) {
        setPreviewOverrides(data.options);
      } else if (data.type === "customizer:branding" && data.branding) {
        // Branding (site name, logo URLs, contact, social) lives in the same
        // settings map — push as overrides so Navbar/Footer re-render live.
        setPreviewOverrides(data.branding);
      }
    }

    window.addEventListener("message", onMessage);
    try {
      window.parent?.postMessage({ type: "customizer:ready" }, window.location.origin);
    } catch {}

    return () => window.removeEventListener("message", onMessage);
  }, [setPreviewOverrides]);

  return null;
}
