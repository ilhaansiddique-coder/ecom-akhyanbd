import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import HeaderFooterEditor, { type HeaderFooterContent, type HeaderDisplay } from "./HeaderFooterEditor";

export const dynamic = "force-dynamic";

const DEFAULT_HEADER_DISPLAY: HeaderDisplay = {
  layout: "classic",
  sticky: true,
  showTopbar: true,
  showSearch: true,
  showCart: true,
  showLogin: true,
  showBrandText: true,
  showTagline: true,
};

const DEFAULT_HF: HeaderFooterContent = {
  topbar: {
    enabled: true,
    text1: { en: "Fast delivery across Bangladesh", bn: "à¦¸à¦¾à¦°à¦¾ à¦¬à¦¾à¦‚à¦²à¦¾à¦¦à§‡à¦¶à§‡ à¦¦à§à¦°à§à¦¤ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿" },
    text2: { en: "Order with confidence", bn: "à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¨à§à¦¤à§‡ à¦…à¦°à§à¦¡à¦¾à¦° à¦•à¦°à§à¦¨" },
  },
  footer: {
    description: { en: "Welcome to our store. Quality products delivered to your door.", bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¦à§‹à¦•à¦¾à¦¨à§‡ à¦¸à§à¦¬à¦¾à¦—à¦¤à¥¤ à¦®à¦¾à¦¨à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦ªà¦£à§à¦¯ à¦†à¦ªà¦¨à¦¾à¦° à¦¦à§‹à¦°à¦—à§‹à¦¡à¦¼à¦¾à¦¯à¦¼à¥¤" },
    copyrightText: { en: "Â© Contra Digital. All rights reserved.", bn: "Â© Contra Digitalà¥¤ à¦¸à¦°à§à¦¬à¦¸à§à¦¬à¦¤à§à¦¬ à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤à¥¤" },
    quickLinksTitle: { en: "Quick Links", bn: "à¦¦à§à¦°à§à¦¤ à¦²à¦¿à¦‚à¦•" },
    contactTitle: { en: "Contact", bn: "à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦—" },
    legalTitle: { en: "Legal", bn: "à¦†à¦‡à¦¨à¦¿" },
    newsletterTitle: { en: "Subscribe to our newsletter", bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¨à¦¿à¦‰à¦œà¦²à§‡à¦Ÿà¦¾à¦°à§‡ à¦¸à¦¾à¦¬à¦¸à§à¦•à§à¦°à¦¾à¦‡à¦¬ à¦•à¦°à§à¦¨" },
    newsletterSubtitle: { en: "Get updates on new products and offers", bn: "à¦¨à¦¤à§à¦¨ à¦ªà¦£à§à¦¯ à¦“ à¦…à¦«à¦¾à¦°à§‡à¦° à¦†à¦ªà¦¡à§‡à¦Ÿ à¦ªà¦¾à¦¨" },
    newsletterPlaceholder: { en: "Email address", bn: "à¦‡à¦®à§‡à¦‡à¦² à¦ à¦¿à¦•à¦¾à¦¨à¦¾" },
    newsletterButton: { en: "Subscribe", bn: "à¦¸à¦¾à¦¬à¦¸à§à¦•à§à¦°à¦¾à¦‡à¦¬" },
    developedByText: { en: "Developed by", bn: "à¦¡à§‡à¦­à§‡à¦²à¦ª à¦•à¦°à§‡à¦›à§‡à¦¨" },
  },
};

function normalize(raw: unknown): HeaderFooterContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const tb = (r.topbar && typeof r.topbar === "object" ? r.topbar : {}) as Record<string, unknown>;
  const ft = (r.footer && typeof r.footer === "object" ? r.footer : {}) as Record<string, unknown>;
  return {
    topbar: {
      enabled: typeof tb.enabled === "boolean" ? tb.enabled : DEFAULT_HF.topbar.enabled,
      text1: toBilingual(tb.text1 ?? DEFAULT_HF.topbar.text1),
      text2: toBilingual(tb.text2 ?? DEFAULT_HF.topbar.text2),
    },
    footer: {
      description: toBilingual(ft.description ?? DEFAULT_HF.footer.description),
      copyrightText: toBilingual(ft.copyrightText ?? DEFAULT_HF.footer.copyrightText),
      quickLinksTitle: toBilingual(ft.quickLinksTitle ?? DEFAULT_HF.footer.quickLinksTitle),
      contactTitle: toBilingual(ft.contactTitle ?? DEFAULT_HF.footer.contactTitle),
      legalTitle: toBilingual(ft.legalTitle ?? DEFAULT_HF.footer.legalTitle),
      newsletterTitle: toBilingual(ft.newsletterTitle ?? DEFAULT_HF.footer.newsletterTitle),
      newsletterSubtitle: toBilingual(ft.newsletterSubtitle ?? DEFAULT_HF.footer.newsletterSubtitle),
      newsletterPlaceholder: toBilingual(ft.newsletterPlaceholder ?? DEFAULT_HF.footer.newsletterPlaceholder),
      newsletterButton: toBilingual(ft.newsletterButton ?? DEFAULT_HF.footer.newsletterButton),
      developedByText: toBilingual(ft.developedByText ?? DEFAULT_HF.footer.developedByText),
    },
  };
}

/** Coerce any stored value into a boolean â€” DB stores "true"/"false" strings. */
function toBool(v: string | null | undefined, fallback: boolean): boolean {
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return fallback;
}

export default async function HeaderFooterEditorPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  let content = DEFAULT_HF;
  let display = DEFAULT_HEADER_DISPLAY;
  try {
    // Load JSON content + the individual header.* settings in one DB hit.
    // The header.* keys are shared with the existing /dashboard/customizer
    // page; both editors stay in sync because they read/write the same rows.
    const rows = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            "page_header_footer",
            "header.layout",
            "header.sticky",
            "header.show_topbar",
            "header.show_search",
            "header.show_cart",
            "header.show_login",
            "header.show_brand_text",
            "header.show_tagline",
          ],
        },
      },
    });
    const map: Record<string, string | null> = {};
    for (const r of rows) map[r.key] = r.value;

    if (map["page_header_footer"]) content = normalize(JSON.parse(map["page_header_footer"]!));

    const layoutRaw = (map["header.layout"] ?? "classic").toLowerCase();
    display = {
      layout: layoutRaw === "centered" || layoutRaw === "minimal" ? layoutRaw : "classic",
      sticky: toBool(map["header.sticky"], DEFAULT_HEADER_DISPLAY.sticky),
      showTopbar: toBool(map["header.show_topbar"], DEFAULT_HEADER_DISPLAY.showTopbar),
      showSearch: toBool(map["header.show_search"], DEFAULT_HEADER_DISPLAY.showSearch),
      showCart: toBool(map["header.show_cart"], DEFAULT_HEADER_DISPLAY.showCart),
      showLogin: toBool(map["header.show_login"], DEFAULT_HEADER_DISPLAY.showLogin),
      showBrandText: toBool(map["header.show_brand_text"], DEFAULT_HEADER_DISPLAY.showBrandText),
      showTagline: toBool(map["header.show_tagline"], DEFAULT_HEADER_DISPLAY.showTagline),
    };
  } catch { /* */ }

  return <HeaderFooterEditor initialData={content} initialDisplay={display} />;
}


