"use client";

/**
 * Side-effect-only component that owns inline-script work that React 19
 * refuses to render directly in JSX.
 *
 *  - Adds the `js-ready` class to <html> on mount (used by CSS to swap
 *    no-JS fallbacks for the JS-enhanced UI).
 *  - Injects the Organization JSON-LD as a real <script type="application/ld+json">
 *    into <head>. Google Search executes JS before crawling, so a client-injected
 *    LD block is still picked up.
 *
 * Rendering nothing keeps it out of the React tree.
 */

import { useEffect } from "react";

interface JsonLd {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
}

export default function HeadScripts({ orgJsonLd }: { orgJsonLd?: JsonLd }) {
  useEffect(() => {
    document.documentElement.classList.add("js-ready");

    if (orgJsonLd && !document.getElementById("org-jsonld")) {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.id = "org-jsonld";
      s.text = JSON.stringify(orgJsonLd);
      document.head.appendChild(s);
    }
  }, [orgJsonLd]);

  return null;
}
