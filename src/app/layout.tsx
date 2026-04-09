import type { Metadata } from "next";
import { Hind_Siliguri, Playfair_Display, Manrope } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mavesoj.com";

export const metadata: Metadata = {
  title: {
    default: "মা ভেষজ বাণিজ্যালয় — প্রাকৃতিক ভেষজ পণ্যের দোকান",
    template: "%s — মা ভেষজ বাণিজ্যালয়",
  },
  description:
    "প্রকৃতির শক্তিতে সুস্থ থাকুন। ভেষজ গুঁড়ো, চা, হার্ট কেয়ার ও প্রাকৃতিক পণ্য — সরাসরি প্রকৃতি থেকে আপনার দোরগোড়ায়।",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "bn_BD",
    siteName: "মা ভেষজ বাণিজ্যালয়",
    title: "মা ভেষজ বাণিজ্যালয় — প্রাকৃতিক ভেষজ পণ্যের দোকান",
    description: "প্রকৃতির শক্তিতে সুস্থ থাকুন। ভেষজ গুঁড়ো, চা, হার্ট কেয়ার ও প্রাকৃতিক পণ্য।",
    url: SITE_URL,
    images: [{ url: "/logo.svg", width: 512, height: 512, alt: "মা ভেষজ বাণিজ্যালয়" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "মা ভেষজ বাণিজ্যালয়",
    description: "প্রকৃতির শক্তিতে সুস্থ থাকুন। ভেষজ গুঁড়ো, চা, হার্ট কেয়ার ও প্রাকৃতিক পণ্য।",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiOrigin = (() => {
    try { return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001").origin; }
    catch { return "http://localhost:8001"; }
  })();

  return (
    <html lang="bn" className={`${hindSiliguri.variable} ${playfairDisplay.variable} ${manrope.variable} antialiased lang-bn`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Preconnect to API for faster data fetches */}
        <link rel="preconnect" href={apiOrigin} />
        <link rel="dns-prefetch" href={apiOrigin} />
      </head>
      <body className="min-h-screen bg-background" suppressHydrationWarning>
        {/* Mark JS as active so fade-in animations only apply after hydration.
            Without this, content stays visible (no invisible flash). */}
        <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("js-ready")' }} />
        {/* Organization JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "মা ভেষজ বাণিজ্যালয়",
              alternateName: "Ma Vesoj",
              url: SITE_URL,
              logo: `${SITE_URL}/logo.svg`,
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+880-1731492117",
                contactType: "customer service",
                availableLanguage: ["Bengali", "English"],
              },
              sameAs: ["https://www.facebook.com/mavesoj", "https://www.instagram.com/mavesoj", "https://www.youtube.com/@mavesoj"],
            }),
          }}
        />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
