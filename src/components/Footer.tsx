"use client";

import Image from "next/image";
import Link from "next/link";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import MotionFadeIn from "./MotionFadeIn";
import T from "./T";
import { useSiteSettings, useOption } from "@/lib/SiteSettingsContext";
import { useLang } from "@/lib/LanguageContext";
import { toBilingual, type Bilingual } from "@/lib/bilingual";

interface HFContent {
  description: Bilingual;
  quickLinksTitle: Bilingual;
  contactTitle: Bilingual;
  legalTitle: Bilingual;
  newsletterTitle: Bilingual;
  newsletterSubtitle: Bilingual;
  newsletterPlaceholder: Bilingual;
  newsletterButton: Bilingual;
}

function readHF(raw: string | null | undefined): Partial<HFContent> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const ft = (parsed?.footer && typeof parsed.footer === "object" ? parsed.footer : {}) as Record<string, unknown>;
    const out: Partial<HFContent> = {};
    if (ft.description) out.description = toBilingual(ft.description);
    if (ft.quickLinksTitle) out.quickLinksTitle = toBilingual(ft.quickLinksTitle);
    if (ft.contactTitle) out.contactTitle = toBilingual(ft.contactTitle);
    if (ft.legalTitle) out.legalTitle = toBilingual(ft.legalTitle);
    if (ft.newsletterTitle) out.newsletterTitle = toBilingual(ft.newsletterTitle);
    if (ft.newsletterSubtitle) out.newsletterSubtitle = toBilingual(ft.newsletterSubtitle);
    if (ft.newsletterPlaceholder) out.newsletterPlaceholder = toBilingual(ft.newsletterPlaceholder);
    if (ft.newsletterButton) out.newsletterButton = toBilingual(ft.newsletterButton);
    return out;
  } catch {
    return null;
  }
}

function pick(b: Bilingual | undefined, lang: string): string | null {
  if (!b) return null;
  return lang === "en" ? (b.en || b.bn) : (b.bn || b.en);
}

const quickLinkKeys = [
  { key: "nav.home", href: "/" },
  { key: "nav.shop", href: "/shop" },
  { key: "nav.about", href: "/about" },
  { key: "nav.contact", href: "/contact" },
  { key: "nav.blog", href: "/blog" },
];

const legalLinkKeys = [
  { key: "footer.privacy", href: "/privacy" },
  { key: "footer.terms", href: "/terms" },
  { key: "footer.refund", href: "/refund" },
];

export default function Footer() {
  const settings = useSiteSettings();
  const { t, lang } = useLang();
  const hf = readHF(settings.page_header_footer);
  const hfDescription = pick(hf?.description, lang);
  const hfQuickLinksTitle = pick(hf?.quickLinksTitle, lang);
  const hfLegalTitle = pick(hf?.legalTitle, lang);
  const hfNewsletterTitle = pick(hf?.newsletterTitle, lang);
  const hfNewsletterSubtitle = pick(hf?.newsletterSubtitle, lang);
  const hfNewsletterPlaceholder = pick(hf?.newsletterPlaceholder, lang);
  const hfNewsletterButton = pick(hf?.newsletterButton, lang);

  // Customizer-driven layout
  const layout         = useOption<string>("footer.layout");      // four_col | three_col | minimal
  const showNewsletter = useOption<boolean>("footer.show_newsletter") && layout === "four_col";
  const showSocials    = useOption<boolean>("footer.show_socials");
  const isMinimal      = layout === "minimal";

  // Fall back through DB keys: general form fields → contact fields → hardcoded defaults
  const siteName = settings.site_name || t("footer.companyName");
  const siteTagline = settings.site_tagline || t("footer.tagline");
  const siteDescription = hfDescription || settings.site_description || t("footer.description");
  const phone = settings.phone || "";
  const email = settings.email || "";
  const address = settings.address || "";
  const facebook = settings.facebook || "";
  const instagram = settings.instagram || "";
  const youtube = settings.youtube || "";

  const socialLinks = [
    ...(facebook ? [{ icon: FaFacebookF, href: facebook, label: "Facebook", color: "hover:bg-facebook" }] : []),
    ...(instagram ? [{ icon: FaInstagram, href: instagram, label: "Instagram", color: "hover:bg-instagram" }] : []),
    ...(youtube ? [{ icon: FaYoutube, href: youtube, label: "YouTube", color: "hover:bg-youtube" }] : []),
  ];

  // Minimal variant: single row with brand + socials, no columns.
  if (isMinimal) {
    return (
      <footer className="bg-primary-dark text-white">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src={settings.site_logo || "/logo.svg"} alt="Site Logo" width={32} height={26} className={`h-7 w-auto ${settings.site_logo ? "" : "brightness-200"}`} unoptimized />
            <span className="font-bold text-white text-sm">{siteName}</span>
          </div>
          {showSocials && socialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" className={`w-9 h-9 rounded-lg bg-white/10 ${social.color} flex items-center justify-center text-white transition-colors`} aria-label={social.label}>
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </footer>
    );
  }

  const gridCols = layout === "three_col"
    ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-3"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <footer className="bg-primary-dark text-white">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className={`grid ${gridCols} gap-10 md:gap-8`}>
          <MotionFadeIn>
            <div className="flex items-center gap-2.5 mb-4">
              <Image src={settings.site_logo || "/logo.svg"} alt="Site Logo" width={40} height={32} className={`h-8 w-auto ${settings.site_logo ? "" : "brightness-200"}`} unoptimized />
              <div>
                <h3 className="text-base font-bold text-white">{siteName}</h3>
                <p className="text-[10px] text-white/60">{siteTagline}</p>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {siteDescription}
            </p>
            <div className="space-y-2.5 text-sm text-white/70">
              {address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 hover:text-white transition-colors"
                >
                  <FiMapPin className="w-4 h-4 mt-0.5 shrink-0 text-white/50" />
                  <span>{address}</span>
                </a>
              )}
              {phone && (
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <FiPhone className="w-4 h-4 text-white/50" />
                  <span>{phone}</span>
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <FiMail className="w-4 h-4 text-white/50" />
                  <span>{email}</span>
                </a>
              )}
            </div>
          </MotionFadeIn>

          <MotionFadeIn delay={0.1}>
            <h4 className="text-base font-bold mb-5 relative inline-block">
              {hfQuickLinksTitle || <T k="footer.quickLinks" />}
              <span className="absolute -bottom-1.5 left-0 w-8 h-0.5 bg-white/30 rounded" />
            </h4>
            <ul className="space-y-2.5">
              {quickLinkKeys.map((link) => (
                <li key={link.key}>
                  <Link href={link.href} className="text-white/70 hover:text-white text-sm transition-colors hover:pl-1 duration-200 inline-block">
                    <T k={link.key} />
                  </Link>
                </li>
              ))}
            </ul>
          </MotionFadeIn>

          <MotionFadeIn delay={0.2}>
            <h4 className="text-base font-bold mb-5 relative inline-block">
              {hfLegalTitle || <T k="footer.legal" />}
              <span className="absolute -bottom-1.5 left-0 w-8 h-0.5 bg-white/30 rounded" />
            </h4>
            <ul className="space-y-2.5">
              {legalLinkKeys.map((link) => (
                <li key={link.key}>
                  <Link href={link.href} className="text-white/70 hover:text-white text-sm transition-colors hover:pl-1 duration-200 inline-block">
                    <T k={link.key} />
                  </Link>
                </li>
              ))}
            </ul>
          </MotionFadeIn>

          {showNewsletter && (
            <MotionFadeIn delay={0.3}>
              <h4 className="text-base font-bold mb-5 relative inline-block">
                {hfNewsletterTitle || <T k="footer.connect" />}
                <span className="absolute -bottom-1.5 left-0 w-8 h-0.5 bg-white/30 rounded" />
              </h4>
              <p className="text-white/70 text-sm mb-4">{hfNewsletterSubtitle || <T k="footer.connectDesc" />}</p>
              <div className="flex gap-2 mb-6">
                <input type="email" placeholder={hfNewsletterPlaceholder || "Email"} className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-colors" />
                <button className="px-4 py-2.5 bg-white text-primary font-bold text-sm rounded-lg hover:bg-white/90 transition-colors shrink-0">{hfNewsletterButton || <T k="footer.subscribe" />}</button>
              </div>
              {showSocials && socialLinks.length > 0 && (
                <div className="flex items-center gap-3">
                  {socialLinks.map((social) => (
                    <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-lg bg-white/10 ${social.color} flex items-center justify-center text-white transition-colors`} aria-label={social.label}>
                      <social.icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              )}
            </MotionFadeIn>
          )}
          {!showNewsletter && showSocials && socialLinks.length > 0 && (
            <MotionFadeIn delay={0.3}>
              <h4 className="text-base font-bold mb-5 relative inline-block">
                {hfNewsletterTitle || <T k="footer.connect" />}
                <span className="absolute -bottom-1.5 left-0 w-8 h-0.5 bg-white/30 rounded" />
              </h4>
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-lg bg-white/10 ${social.color} flex items-center justify-center text-white transition-colors`} aria-label={social.label}>
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </MotionFadeIn>
          )}
        </div>
      </div>
    </footer>
  );
}
