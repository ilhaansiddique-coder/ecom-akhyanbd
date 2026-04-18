"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useSiteSettings } from "@/lib/SiteSettingsContext";
import { setPixelId, setDeferPurchase, trackPageView } from "@/lib/analytics";

export default function FacebookPixel() {
  const settings = useSiteSettings();
  const pixelId = settings.fb_pixel_id || "";
  const deferPurchase = settings.fb_deferred_purchase === "true";
  const pathname = usePathname();
  const initialized = useRef(false);

  // Mirror the deferred-purchase setting into the analytics module so
  // trackPurchase skips the browser pixel fire when ON.
  useEffect(() => {
    setDeferPurchase(deferPurchase);
  }, [deferPurchase]);

  // Fire PageView through analytics on every route change (and on first load
  // once the pixel script is ready). This keeps browser pixel ↔ server CAPI
  // sharing the same event_id so Facebook can dedupe both halves.
  useEffect(() => {
    if (!pixelId || typeof window === "undefined") return;
    if (!initialized.current) return;
    trackPageView();
  }, [pathname, pixelId]);

  // Store pixel ID — also kicks off the first PageView once the script is
  // ready (a tiny poll is cheaper than wiring an onLoad chain through Script).
  useEffect(() => {
    if (!pixelId) return;
    setPixelId(pixelId);
    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        initialized.current = true;
        trackPageView();
        clearInterval(id);
      } else if (attempts > 50) {
        clearInterval(id); // give up after ~5s
      }
    }, 100);
    return () => clearInterval(id);
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
            // PageView is fired by analytics.trackPageView with a shared
            // event_id so the server CAPI side can dedupe. Don't fire here.
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
