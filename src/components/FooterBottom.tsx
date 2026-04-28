"use client";

import Link from "next/link";
import T, { TNum } from "./T";
import { useSiteSettings } from "@/lib/SiteSettingsContext";
import { useLang } from "@/lib/LanguageContext";
import { toBilingual, type Bilingual } from "@/lib/bilingual";

function pickHF(raw: string | null | undefined, key: "copyrightText" | "developedByText", lang: string): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const ft = (parsed?.footer && typeof parsed.footer === "object" ? parsed.footer : {}) as Record<string, unknown>;
    if (!ft[key]) return null;
    const b: Bilingual = toBilingual(ft[key]);
    return lang === "en" ? (b.en || b.bn) : (b.bn || b.en);
  } catch {
    return null;
  }
}

export default function FooterBottom() {
  const settings = useSiteSettings();
  const { lang } = useLang();
  const copyrightText = settings?.copyright_text?.trim();
  const hfCopyright = pickHF(settings.page_header_footer, "copyrightText", lang);
  const hfDevelopedBy = pickHF(settings.page_header_footer, "developedByText", lang);

  return (
    <div className="bg-primary-darker text-white/60 py-4">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-sm">
        <p className="text-center md:text-left">
          {copyrightText ? (
            <span dangerouslySetInnerHTML={{ __html: copyrightText }} />
          ) : hfCopyright ? (
            <span>{hfCopyright}</span>
          ) : (
            <>
              © <TNum value={new Date().getFullYear()} /> <T k="footer.copyright" />{" "}
              <span className="text-white font-semibold"><T k="footer.companyName" /></span>
            </>
          )}
        </p>
        <p className="text-center text-sm">
          {hfDevelopedBy || <T k="footer.developedBy" />}{" "}
          <a href="https://contradigital.agency/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 transition-colors font-semibold">
            <T k="footer.developerName" />
          </a>
        </p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-white transition-colors"><T k="footer.terms" /></Link>
          <span className="text-white/30">|</span>
          <Link href="/privacy" className="hover:text-white transition-colors"><T k="footer.privacy" /></Link>
        </div>
      </div>
    </div>
  );
}
