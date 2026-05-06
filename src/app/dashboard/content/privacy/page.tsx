import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import PolicyPageEditor, { type PolicyContent } from "./PolicyPageEditor";

export const dynamic = "force-dynamic";

const DEFAULT_PRIVACY: PolicyContent = {
  title: { en: "Privacy Policy", bn: "à¦—à§‹à¦ªà¦¨à§€à¦¯à¦¼à¦¤à¦¾ à¦¨à§€à¦¤à¦¿" },
  lastUpdated: { en: "January 1, 2025", bn: "à§§ à¦œà¦¾à¦¨à§à¦¯à¦¼à¦¾à¦°à¦¿ à§¨à§¦à§¨à§«" },
  intro: {
    en: "We take your privacy very seriously. This privacy policy describes how we collect, use and protect your information when you use our website.",
    bn: "à¦†à¦®à¦°à¦¾ à¦†à¦ªà¦¨à¦¾à¦° à¦—à§‹à¦ªà¦¨à§€à¦¯à¦¼à¦¤à¦¾à¦•à§‡ à¦¸à¦°à§à¦¬à§‹à¦šà§à¦š à¦—à§à¦°à§à¦¤à§à¦¬ à¦¦à¦¿à¦‡à¥¤ à¦à¦‡ à¦—à§‹à¦ªà¦¨à§€à¦¯à¦¼à¦¤à¦¾ à¦¨à§€à¦¤à¦¿à¦Ÿà¦¿ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦“à¦¯à¦¼à§‡à¦¬à¦¸à¦¾à¦‡à¦Ÿ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à¦¾à¦° à¦¸à¦®à¦¯à¦¼ à¦†à¦®à¦°à¦¾ à¦•à§€à¦­à¦¾à¦¬à§‡ à¦†à¦ªà¦¨à¦¾à¦° à¦¤à¦¥à§à¦¯ à¦¸à¦‚à¦—à§à¦°à¦¹, à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦à¦¬à¦‚ à¦¸à§à¦°à¦•à§à¦·à¦¿à¦¤ à¦°à¦¾à¦–à¦¿ à¦¤à¦¾ à¦¬à¦°à§à¦£à¦¨à¦¾ à¦•à¦°à§‡à¥¤",
  },
  sections: [
    {
      title: { en: "Information Collection", bn: "à¦¤à¦¥à§à¦¯ à¦¸à¦‚à¦—à§à¦°à¦¹" },
      content: {
        en: "We may collect the following information to provide our services:\n- Personal information: name, email address, phone number, delivery address.\n- Order information: products you purchased, payment information (securely processed).\n- Browsing information: which products you viewed, how much time you spent.\n- Device information: browser type, IP address, operating system.",
        bn: "à¦†à¦®à¦°à¦¾ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦ªà¦°à¦¿à¦·à§‡à¦¬à¦¾ à¦ªà§à¦°à¦¦à¦¾à¦¨ à¦•à¦°à¦¾à¦° à¦œà¦¨à§à¦¯ à¦¨à¦¿à¦®à§à¦¨à¦²à¦¿à¦–à¦¿à¦¤ à¦¤à¦¥à§à¦¯ à¦¸à¦‚à¦—à§à¦°à¦¹ à¦•à¦°à¦¤à§‡ à¦ªà¦¾à¦°à¦¿:\n- à¦¬à§à¦¯à¦•à§à¦¤à¦¿à¦—à¦¤ à¦¤à¦¥à§à¦¯: à¦¨à¦¾à¦®, à¦‡à¦®à§‡à¦‡à¦² à¦ à¦¿à¦•à¦¾à¦¨à¦¾, à¦«à§‹à¦¨ à¦¨à¦®à§à¦¬à¦°, à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ à¦¿à¦•à¦¾à¦¨à¦¾à¥¤\n- à¦…à¦°à§à¦¡à¦¾à¦° à¦¤à¦¥à§à¦¯: à¦†à¦ªà¦¨à¦¿ à¦¯à§‡ à¦ªà¦£à§à¦¯ à¦•à¦¿à¦¨à§‡à¦›à§‡à¦¨, à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿà§‡à¦° à¦¤à¦¥à§à¦¯ (à¦¨à¦¿à¦°à¦¾à¦ªà¦¦à¦­à¦¾à¦¬à§‡ à¦ªà§à¦°à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾à¦•à§ƒà¦¤)à¥¤\n- à¦¬à§à¦°à¦¾à¦‰à¦œà¦¿à¦‚ à¦¤à¦¥à§à¦¯: à¦†à¦ªà¦¨à¦¿ à¦•à§‹à¦¨ à¦ªà¦£à§à¦¯ à¦¦à§‡à¦–à§‡à¦›à§‡à¦¨, à¦•à¦¤ à¦¸à¦®à¦¯à¦¼ à¦¬à§à¦¯à¦¯à¦¼ à¦•à¦°à§‡à¦›à§‡à¦¨à¥¤\n- à¦¡à¦¿à¦­à¦¾à¦‡à¦¸ à¦¤à¦¥à§à¦¯: à¦¬à§à¦°à¦¾à¦‰à¦œà¦¾à¦°à§‡à¦° à¦§à¦°à¦¨, IP à¦ à¦¿à¦•à¦¾à¦¨à¦¾, à¦…à¦ªà¦¾à¦°à§‡à¦Ÿà¦¿à¦‚ à¦¸à¦¿à¦¸à§à¦Ÿà§‡à¦®à¥¤",
      },
    },
    {
      title: { en: "Use of Information", bn: "à¦¤à¦¥à§à¦¯à§‡à¦° à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦°" },
      content: {
        en: "We use the collected information for the following purposes:\n- Processing your order and ensuring delivery.\n- Providing customer service and resolving issues.\n- Informing you about new products, offers and updates (only with your consent).\n- Improving our website and services.\n- Complying with applicable laws and regulations.",
        bn: "à¦†à¦®à¦°à¦¾ à¦¸à¦‚à¦—à§ƒà¦¹à§€à¦¤ à¦¤à¦¥à§à¦¯ à¦¨à¦¿à¦®à§à¦¨à¦²à¦¿à¦–à¦¿à¦¤ à¦‰à¦¦à§à¦¦à§‡à¦¶à§à¦¯à§‡ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à¦¿:\n- à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦° à¦ªà§à¦°à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾ à¦•à¦°à¦¾ à¦à¦¬à¦‚ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤ à¦•à¦°à¦¾à¥¤\n- à¦—à§à¦°à¦¾à¦¹à¦• à¦¸à§‡à¦¬à¦¾ à¦ªà§à¦°à¦¦à¦¾à¦¨ à¦“ à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¸à¦®à¦¾à¦§à¦¾à¦¨ à¦•à¦°à¦¾à¥¤\n- à¦¨à¦¤à§à¦¨ à¦ªà¦£à§à¦¯, à¦…à¦«à¦¾à¦° à¦“ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦¸à¦®à§à¦ªà¦°à§à¦•à§‡ à¦†à¦ªà¦¨à¦¾à¦•à§‡ à¦œà¦¾à¦¨à¦¾à¦¨à§‹ (à¦¶à§à¦§à§à¦®à¦¾à¦¤à§à¦° à¦†à¦ªà¦¨à¦¾à¦° à¦¸à¦®à§à¦®à¦¤à¦¿à¦¤à§‡)à¥¤\n- à¦†à¦®à¦¾à¦¦à§‡à¦° à¦“à¦¯à¦¼à§‡à¦¬à¦¸à¦¾à¦‡à¦Ÿ à¦“ à¦¸à§‡à¦¬à¦¾à¦° à¦®à¦¾à¦¨ à¦‰à¦¨à§à¦¨à¦¤ à¦•à¦°à¦¾à¥¤\n- à¦ªà§à¦°à¦¯à§‹à¦œà§à¦¯ à¦†à¦‡à¦¨ à¦“ à¦¬à¦¿à¦§à¦¿à¦®à¦¾à¦²à¦¾ à¦®à§‡à¦¨à§‡ à¦šà¦²à¦¾à¥¤",
      },
    },
    {
      title: { en: "Information Security", bn: "à¦¤à¦¥à§à¦¯à§‡à¦° à¦¨à¦¿à¦°à¦¾à¦ªà¦¤à§à¦¤à¦¾" },
      content: {
        en: "The security of your information is extremely important to us. We use industry-standard security measures including SSL/TLS encryption. Payment information is not stored directly on our servers. We conduct regular security audits and updates.",
        bn: "à¦†à¦ªà¦¨à¦¾à¦° à¦¤à¦¥à§à¦¯à§‡à¦° à¦¨à¦¿à¦°à¦¾à¦ªà¦¤à§à¦¤à¦¾ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦•à¦¾à¦›à§‡ à¦…à¦¤à§à¦¯à¦¨à§à¦¤ à¦—à§à¦°à§à¦¤à§à¦¬à¦ªà§‚à¦°à§à¦£à¥¤ à¦†à¦®à¦°à¦¾ à¦¶à¦¿à¦²à§à¦ª-à¦®à¦¾à¦¨à§‡à¦° à¦¨à¦¿à¦°à¦¾à¦ªà¦¤à§à¦¤à¦¾ à¦¬à§à¦¯à¦¬à¦¸à§à¦¥à¦¾ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à¦¿, à¦¯à¦¾à¦° à¦®à¦§à§à¦¯à§‡ à¦°à¦¯à¦¼à§‡à¦›à§‡:\n- SSL/TLS à¦à¦¨à¦•à§à¦°à¦¿à¦ªà¦¶à¦¨ à¦ªà§à¦°à¦¯à§à¦•à§à¦¤à¦¿à¥¤\n- à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦¤à¦¥à§à¦¯ à¦¸à¦°à¦¾à¦¸à¦°à¦¿ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¸à¦¾à¦°à§à¦­à¦¾à¦°à§‡ à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¹à¦¯à¦¼ à¦¨à¦¾à¥¤\n- à¦¨à¦¿à¦¯à¦¼à¦®à¦¿à¦¤ à¦¨à¦¿à¦°à¦¾à¦ªà¦¤à§à¦¤à¦¾ à¦…à¦¡à¦¿à¦Ÿ à¦“ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦ªà¦°à¦¿à¦šà¦¾à¦²à¦¨à¦¾à¥¤\n- à¦•à¦°à§à¦®à§€à¦¦à§‡à¦° à¦¤à¦¥à§à¦¯ à¦¸à§à¦°à¦•à§à¦·à¦¾ à¦¬à¦¿à¦·à¦¯à¦¼à§‡ à¦ªà§à¦°à¦¶à¦¿à¦•à§à¦·à¦£ à¦ªà§à¦°à¦¦à¦¾à¦¨à¥¤",
      },
    },
    {
      title: { en: "Cookie Policy", bn: "à¦•à§à¦•à¦¿ à¦¨à§€à¦¤à¦¿" },
      content: {
        en: "Our website uses cookies. Cookies are small text files stored in your browser. We use essential cookies for website functionality, performance cookies for analytics, and functionality cookies to remember your preferences.",
        bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦“à¦¯à¦¼à§‡à¦¬à¦¸à¦¾à¦‡à¦Ÿ à¦•à§à¦•à¦¿ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à§‡à¥¤ à¦•à§à¦•à¦¿ à¦¹à¦²à§‹ à¦›à§‹à¦Ÿ à¦Ÿà§‡à¦•à§à¦¸à¦Ÿ à¦«à¦¾à¦‡à¦² à¦¯à¦¾ à¦†à¦ªà¦¨à¦¾à¦° à¦¬à§à¦°à¦¾à¦‰à¦œà¦¾à¦°à§‡ à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¹à¦¯à¦¼à¥¤\n- à¦ªà§à¦°à¦¯à¦¼à§‹à¦œà¦¨à§€à¦¯à¦¼ à¦•à§à¦•à¦¿: à¦“à¦¯à¦¼à§‡à¦¬à¦¸à¦¾à¦‡à¦Ÿà§‡à¦° à¦®à§‚à¦² à¦•à¦¾à¦°à§à¦¯à¦•à¦¾à¦°à¦¿à¦¤à¦¾à¦° à¦œà¦¨à§à¦¯ à¦…à¦ªà¦°à¦¿à¦¹à¦¾à¦°à§à¦¯à¥¤\n- à¦ªà¦¾à¦°à¦«à¦°à¦®à§à¦¯à¦¾à¦¨à§à¦¸ à¦•à§à¦•à¦¿: à¦“à¦¯à¦¼à§‡à¦¬à¦¸à¦¾à¦‡à¦Ÿà§‡à¦° à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦¬à¦¿à¦¶à§à¦²à§‡à¦·à¦£à§‡à¦° à¦œà¦¨à§à¦¯à¥¤\n- à¦«à¦¾à¦‚à¦¶à¦¨à¦¾à¦²à¦¿à¦Ÿà¦¿ à¦•à§à¦•à¦¿: à¦†à¦ªà¦¨à¦¾à¦° à¦ªà¦›à¦¨à§à¦¦ à¦“ à¦¸à§‡à¦Ÿà¦¿à¦‚à¦¸ à¦®à¦¨à§‡ à¦°à¦¾à¦–à¦¾à¦° à¦œà¦¨à§à¦¯à¥¤",
      },
    },
    {
      title: { en: "Third Parties", bn: "à¦¤à§ƒà¦¤à§€à¦¯à¦¼ à¦ªà¦•à§à¦·" },
      content: {
        en: "We work with trusted third parties to provide certain services. These third parties may only use your information for their designated tasks: payment gateways, delivery services, analytics services, and customer support tools. We never sell or rent your information to advertisers.",
        bn: "à¦†à¦®à¦°à¦¾ à¦¨à¦¿à¦°à§à¦¦à¦¿à¦·à§à¦Ÿ à¦ªà¦°à¦¿à¦·à§‡à¦¬à¦¾ à¦ªà§à¦°à¦¦à¦¾à¦¨à§‡à¦° à¦œà¦¨à§à¦¯ à¦¬à¦¿à¦¶à§à¦¬à¦¸à§à¦¤ à¦¤à§ƒà¦¤à§€à¦¯à¦¼ à¦ªà¦•à§à¦·à§‡à¦° à¦¸à¦¾à¦¥à§‡ à¦•à¦¾à¦œ à¦•à¦°à¦¿:\n- à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦—à§‡à¦Ÿà¦“à¦¯à¦¼à§‡: à¦¨à¦¿à¦°à¦¾à¦ªà¦¦ à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦ªà§à¦°à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾à¦•à¦°à¦£à§‡à¦° à¦œà¦¨à§à¦¯à¥¤\n- à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¸à¦¾à¦°à§à¦­à¦¿à¦¸: à¦ªà¦£à§à¦¯ à¦ªà§Œà¦à¦›à§‡ à¦¦à§‡à¦“à¦¯à¦¼à¦¾à¦° à¦œà¦¨à§à¦¯à¥¤\n- à¦…à§à¦¯à¦¾à¦¨à¦¾à¦²à¦¿à¦Ÿà¦¿à¦•à§à¦¸ à¦¸à¦¾à¦°à§à¦­à¦¿à¦¸: à¦“à¦¯à¦¼à§‡à¦¬à¦¸à¦¾à¦‡à¦Ÿà§‡à¦° à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦¬à¦¿à¦¶à§à¦²à§‡à¦·à¦£à§‡à¦° à¦œà¦¨à§à¦¯à¥¤\n- à¦•à¦¾à¦¸à§à¦Ÿà¦®à¦¾à¦° à¦¸à¦¾à¦ªà§‹à¦°à§à¦Ÿ à¦Ÿà§à¦²à¦¸: à¦†à¦ªà¦¨à¦¾à¦•à§‡ à¦¸à¦¹à¦¾à¦¯à¦¼à¦¤à¦¾ à¦•à¦°à¦¾à¦° à¦œà¦¨à§à¦¯à¥¤",
      },
    },
    {
      title: { en: "Contact", bn: "à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦—" },
      content: {
        en: "For any privacy-related questions or concerns, please visit our contact page.",
        bn: "à¦—à§‹à¦ªà¦¨à§€à¦¯à¦¼à¦¤à¦¾ à¦¸à¦‚à¦•à§à¦°à¦¾à¦¨à§à¦¤ à¦¯à§‡à¦•à§‹à¦¨à§‹ à¦ªà§à¦°à¦¶à§à¦¨ à¦¬à¦¾ à¦‰à¦¦à§à¦¬à§‡à¦—à§‡à¦° à¦œà¦¨à§à¦¯ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦— à¦ªà§‡à¦œ à¦¦à§‡à¦–à§à¦¨à¥¤",
      },
    },
  ],
};

/** Normalize stored data â€” lift any legacy plain-string fields into {en,bn}. */
function normalizePolicy(raw: unknown, fallback: PolicyContent): PolicyContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sections = Array.isArray(r.sections) ? r.sections : fallback.sections;
  return {
    title: toBilingual(r.title ?? fallback.title),
    lastUpdated: toBilingual(r.lastUpdated ?? fallback.lastUpdated),
    intro: toBilingual(r.intro ?? fallback.intro),
    sections: sections.map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      return { title: toBilingual(o.title), content: toBilingual(o.content) };
    }),
  };
}

export default async function PrivacyEditorPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "page_privacy" } });
    const data = setting?.value
      ? normalizePolicy(JSON.parse(setting.value), DEFAULT_PRIVACY)
      : DEFAULT_PRIVACY;
    return <PolicyPageEditor initialData={data} settingKey="page_privacy" pageLabel="Privacy Policy" />;
  } catch {
    return <PolicyPageEditor initialData={DEFAULT_PRIVACY} settingKey="page_privacy" pageLabel="Privacy Policy" />;
  }
}


