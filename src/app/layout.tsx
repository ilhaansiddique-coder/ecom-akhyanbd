import type { Metadata } from "next";
import { Hind_Siliguri, Playfair_Display, Manrope, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { prisma } from "@/lib/prisma";
import { buildThemeCss } from "@/lib/theme-tokens";

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});


const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function loadSiteSettings(): Promise<Record<string, string | null>> {
  try {
    const rows = await prisma.siteSetting.findMany();
    const out: Record<string, string | null> = {};
    for (const r of rows) out[r.key] = r.value ?? null;
    return out;
  } catch {
    return {};
  }
}

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
  const settings = await loadSiteSettings();
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

  return (
    <html lang="bn" className={`${hindSiliguri.variable} ${playfairDisplay.variable} ${manrope.variable} ${bricolage.variable} antialiased lang-bn`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {fbDomainVerification && (
          <meta name="facebook-domain-verification" content={fbDomainVerification} />
        )}
        <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: themeCss }} />
        {/* Inline scripts in <head> are safe in React 19 (the "script in JSX"
            warning only fires for scripts rendered into <body>). */}
        <script
          id="js-ready"
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("js-ready")`,
          }}
        />
        <script
          id="org-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
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
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-background" suppressHydrationWarning>
        <ClientLayout initialSettings={settings}>{children}</ClientLayout>
      </body>
    </html>
  );
}
