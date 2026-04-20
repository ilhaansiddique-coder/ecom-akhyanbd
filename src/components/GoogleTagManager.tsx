"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useSiteSettings } from "@/lib/SiteSettingsContext";

export default function GoogleTagManager() {
  const settings = useSiteSettings();
  const gtmId = settings.gtm_id?.trim();

  // Cleanup on unmount — when user navigates from storefront into /dashboard,
  // ClientLayout stops rendering this component, but the script tag injected
  // by the inline IIFE (and the `dataLayer` global) persist and keep firing.
  // Strip them so admin clicks don't pollute GTM events.
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      document
        .querySelectorAll('script[src*="googletagmanager.com/gtm.js"]')
        .forEach((s) => s.remove());
      document.getElementById("gtm-script")?.remove();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).dataLayer;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).google_tag_manager;
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dataLayer = undefined;
      }
    };
  }, []);

  if (!gtmId) return null;

  return (
    <>
      {/* GTM Script — head */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
      {/* GTM noscript — body fallback */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
