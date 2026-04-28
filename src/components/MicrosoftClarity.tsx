"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useSiteSettings } from "@/lib/SiteSettingsContext";

/**
 * Microsoft Clarity — session recording + heatmaps.
 *
 * Loaded via DeferredAnalytics so it respects the same idle/interaction
 * deferral as Facebook Pixel and GTM. Storefront only — skipped on /dashboard
 * (ClientLayout gates DeferredAnalytics behind !isDashboard).
 *
 * Admin sets `clarity_project_id` in Site Settings → the script auto-activates.
 * Leave the setting empty to fully disable Clarity (no script injected at all).
 */
export default function MicrosoftClarity() {
  const settings = useSiteSettings();
  const projectId = settings.clarity_project_id || "";

  // Cleanup on unmount (e.g. storefront → dashboard navigation).
  // Removes the injected <script> tag and the window.clarity global so
  // the merchant's Clarity project doesn't receive dashboard admin clicks.
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      document
        .querySelectorAll('script[src*="clarity.ms"]')
        .forEach((s) => s.remove());
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).clarity;
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).clarity = undefined;
      }
    };
  }, []);

  if (!projectId) return null;

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window,document,"clarity","script","${projectId}");
        `,
      }}
    />
  );
}
