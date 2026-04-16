"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useSiteSettings } from "@/lib/SiteSettingsContext";
import { setPixelId, trackPageView } from "@/lib/analytics";

export default function FacebookPixel() {
  const settings = useSiteSettings();
  const pixelId = settings.fb_pixel_id || "";
  const pathname = usePathname();
  const initialized = useRef(false);

  // Track PageView on route change — sends to both browser pixel + server CAPI
  useEffect(() => {
    if (!pixelId || typeof window === "undefined") return;
    if (!initialized.current) return;
    // Use trackPageView() which fires both pixel and CAPI with deduplication
    trackPageView();
  }, [pathname, pixelId]);

  // Store pixel ID + send initial PageView to server CAPI
  useEffect(() => {
    if (pixelId) {
      setPixelId(pixelId);
      // Send initial PageView to server (browser pixel already fired via inline script)
      fetch("/api/v1/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: "PageView",
          event_id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          event_source_url: window.location.href,
          custom_data: {},
          user_data: {
            fbp: document.cookie.match(/(?:^|; )_fbp=([^;]*)/)?.[1],
            fbc: document.cookie.match(/(?:^|; )_fbc=([^;]*)/)?.[1],
          },
        }),
        keepalive: true,
      }).catch(() => {});
    }
  }, [pixelId]);

  if (!pixelId) return null;

  return (
    <>
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('set', 'autoConfig', false, '${pixelId}');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      {/* Mark pixel as initialized after script loads */}
      <Script
        id="fb-pixel-ready"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.__fbPixelReady = true;`,
        }}
        onLoad={() => { initialized.current = true; }}
      />
    </>
  );
}
