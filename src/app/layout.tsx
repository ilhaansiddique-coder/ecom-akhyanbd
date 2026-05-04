import type { Metadata } from "next";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Hind_Siliguri, Playfair_Display, Manrope, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import ClientLayout from "@/components/ClientLayout";
import HeadScripts from "@/components/HeadScripts";
import { prisma } from "@/lib/prisma";
import { buildThemeCss } from "@/lib/theme-tokens";
import { autoCaptureSiteUrl } from "@/lib/auto-site-url";

// Font loading strategy (perf-tuned for mobile LCP):
//   - PRIMARY body font (Hind Siliguri) stays on display: "block" + preload:
//     it carries Bengali script and a fallback swap is jarring (English glyphs
//     paint first, then snap to Bengali). adjustFontFallback keeps metrics
//     stable so there's still no CLS.
//   - HEADING font (Bricolage) moved to display: "swap" + dropped preload.
//     "block" was hiding hero h1 text until the WOFF2 arrived, killing LCP
//     on slow mobile networks. With "swap" the system fallback paints
//     instantly, then the webfont swaps in (adjustFontFallback prevents
//     visible reflow).
//   - Secondary fonts (Playfair, Manrope) keep "swap" — only used in
//     customizer-selectable spots, never on the critical path.
//   - Weights trimmed to the ones the UI actually renders. Each extra
//     weight = a separate WOFF2 fetch.
//   - All four are kept declared because the dashboard customizer lets
//     admins pick any of them as the live heading/body font.
const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "700"],
  // "swap" instead of "block": shows fallback metrics-matched text immediately,
  // then snaps to Hind Siliguri when loaded. With "block" the browser waited
  // up to 3s for the font, and on slow mobile / Vercel cold cache it would
  // give up — Bengali rendered with system Serif glyphs (looked broken).
  // adjustFontFallback keeps metrics close so there's no visible CLS on swap.
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});


const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  adjustFontFallback: true,
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  adjustFontFallback: true,
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Two layers of caching keep this off Postgres:
//
//  1. `unstable_cache` — cross-request shared cache, 60s TTL, tagged so the
//     admin Settings PUT (which calls revalidateAll("settings")) busts it
//     immediately. Settings change rarely; 60s lag is fine for SEO/branding.
//  2. `cache()` — per-request dedupe so the metadata generator and the
//     SiteSettingsContext provider (both called in the same render pipeline)
//     share one fetch instead of two.
//
// Before this layer, every page load did 2 full `siteSetting.findMany()`
// queries — pg_stat_activity showed it hammering Neon every ~3s.
const fetchSiteSettings = unstable_cache(
  async (): Promise<Record<string, string | null>> => {
    const rows = await prisma.siteSetting.findMany({
      select: { key: true, value: true },
    });
    const out: Record<string, string | null> = {};
    for (const r of rows) out[r.key] = r.value ?? null;
    return out;
  },
  ["site-settings"],
  { tags: ["settings"], revalidate: 60 },
);
const loadSiteSettings = cache(async (): Promise<Record<string, string | null>> => {
  try { return await fetchSiteSettings(); }
  catch { return {}; }
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSiteSettings();
  const siteName = settings.site_name || "Site";
  const description = settings.site_description || settings.meta_description || "";
  const logo = settings.site_logo || "/logo.svg";
  // Favicon comes from the dashboard setting; fall back to the site logo, then a default.
  // Append a short hash so browsers refetch when the admin uploads a new one.
  const faviconRaw = settings.favicon || settings.site_logo || "/logo.svg";
  const faviconVersion = (faviconRaw.match(/\d{6,}/)?.[0] ?? "1").slice(-6);
  const faviconUrl = `${faviconRaw}${faviconRaw.includes("?") ? "&" : "?"}v=${faviconVersion}`;
  const faviconType = faviconRaw.toLowerCase().endsWith(".svg")
    ? "image/svg+xml"
    : faviconRaw.toLowerCase().endsWith(".ico")
      ? "image/x-icon"
      : "image/png";
  return {
    title: {
      default: siteName,
      template: `%s — ${siteName}`,
    },
    description,
    metadataBase: new URL(SITE_URL),
    icons: {
      icon: [{ url: faviconUrl, type: faviconType }],
      shortcut: [{ url: faviconUrl, type: faviconType }],
      apple: [{ url: faviconUrl }],
    },
    openGraph: {
      type: "website",
      siteName,
      title: siteName,
      description,
      url: SITE_URL,
      images: [{ url: logo, width: 512, height: 512, alt: siteName }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description,
      images: [logo],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Load all site settings server-side so the SiteSettingsContext hydrates synchronously.
  // This eliminates the logo flash on reload caused by the previous client-side fetch.
  const allSettings = await loadSiteSettings();

  // STRIP PRIVATE KEYS before passing to the client. SiteSettingsContext is
  // serialized into the HTML payload that ships to every visitor's browser
  // — without this filter, FB CAPI tokens, SMTP password, courier creds,
  // etc. would be readable by anyone hitting View Source. Mirrors the same
  // PRIVATE_KEYS list the public /api/v1/settings endpoint enforces.
  const PRIVATE_KEYS = new Set([
    "fb_capi_access_token",
    "fb_test_event_code",
    "steadfast_api_key",
    "steadfast_secret_key",
    "smtp_pass",
    "smtp_user",
    "pathao_client_id",
    "pathao_client_secret",
    "pathao_username",
    "pathao_password",
    "pathao_access_token",
    "pathao_refresh_token",
    "pathao_token_expires_at",
    "pathao_web_token",
    "pathao_web_token_auto",
    "admin_email",
  ]);
  const settings: Record<string, string | null> = {};
  for (const k of Object.keys(allSettings)) {
    if (!PRIVATE_KEYS.has(k)) settings[k] = allSettings[k];
  }

  // Auto-capture the production site URL from the request host the first time
  // a non-local request reaches us. Fixes localhost-link-in-emails forever
  // without requiring the admin to set NEXT_PUBLIC_SITE_URL or APP_URL by hand.
  // Idempotent + non-blocking — a no-op once set.
  void autoCaptureSiteUrl();
  const fbDomainVerification = settings.fb_domain_verification || null;
  const siteName = settings.site_name || "Site";
  const siteLogoUrl = settings.site_logo
    ? (settings.site_logo.startsWith("http") ? settings.site_logo : `${SITE_URL}${settings.site_logo}`)
    : `${SITE_URL}/logo.svg`;
  const orgPhone = settings.phone || "";
  const sameAs = [settings.facebook, settings.instagram, settings.youtube].filter(Boolean) as string[];

  // Build the theme CSS variables block from saved customizer tokens.
  // Rendered into <head> so it overrides the defaults in globals.css before paint (no FOUC).
  const themeCss = buildThemeCss(settings);

  // Resolve the active language SERVER-SIDE so initial paint already matches
  // the user's saved preference. Without this, every dashboard refresh would
  // flash Bangla → English (or vice-versa) as the client useEffect catches up.
  // Path comes from middleware via the x-pathname header.
  const reqHeaders = await headers();
  const pathname = reqHeaders.get("x-pathname") || "";
  const isDashboardPath = pathname.startsWith("/dashboard");
  const dashboardLang = (settings.dashboard_language === "en" ? "en" : settings.dashboard_language === "bn" ? "bn" : "en");
  const siteLang = (settings.site_language === "en" ? "en" : "bn");
  const initialLang: "en" | "bn" = isDashboardPath ? dashboardLang as "en" | "bn" : siteLang;
  const langClass = initialLang === "en" ? "lang-en" : "lang-bn";

  return (
    <html lang={initialLang} className={`${hindSiliguri.variable} ${playfairDisplay.variable} ${manrope.variable} ${bricolage.variable} antialiased ${langClass}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {fbDomainVerification && (
          <meta name="facebook-domain-verification" content={fbDomainVerification} />
        )}
        {/* Resource hints: warm up TLS to hot 3rd-party origins before the
            browser even discovers their requests. Saves 100-300ms on slow
            mobile. preconnect = full handshake; dns-prefetch = name only.
            CDN gets full preconnect (every page hits it for images).
            Tracking gets dns-prefetch only (tracking is deferred via
            ClientLayout, full preconnect would waste a connection slot). */}
        <link rel="preconnect" href="https://cdn.akhiyanbd.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />
        <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="min-h-screen bg-background" suppressHydrationWarning>
        {/* React 19 refuses to render inline <script> in JSX (even via next/script).
            HeadScripts is a client-only side-effect component that injects
            the JSON-LD + js-ready class via the DOM API after mount. */}
        <HeadScripts
          orgJsonLd={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteName,
            url: SITE_URL,
            logo: siteLogoUrl,
            ...(orgPhone && {
              contactPoint: {
                "@type": "ContactPoint",
                telephone: orgPhone,
                contactType: "customer service",
                availableLanguage: ["Bengali", "English"],
              },
            }),
            ...(sameAs.length > 0 && { sameAs }),
          }}
        />
        <ClientLayout initialSettings={settings} initialLang={initialLang}>{children}</ClientLayout>
      </body>
    </html>
  );
}
