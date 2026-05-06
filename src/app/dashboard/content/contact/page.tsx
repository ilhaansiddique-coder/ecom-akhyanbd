import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import ContactPageEditor, { type ContactContent } from "./ContactPageEditor";

export const dynamic = "force-dynamic";

const DEFAULT_CONTACT: ContactContent = {
  heroBadge: { en: "Talk to us", bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¸à¦¾à¦¥à§‡ à¦•à¦¥à¦¾ à¦¬à¦²à§à¦¨" },
  heroTitle: { en: "Contact Us", bn: "à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦—" },
  heroSubtitle: { en: "Have a question? We're here to help.", bn: "à¦•à§‹à¦¨à§‹ à¦ªà§à¦°à¦¶à§à¦¨ à¦†à¦›à§‡? à¦†à¦®à¦°à¦¾ à¦¸à¦¾à¦¹à¦¾à¦¯à§à¦¯à§‡à¦° à¦œà¦¨à§à¦¯ à¦†à¦›à¦¿à¥¤" },
  formTitle: { en: "Send us a message", bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦à¦•à¦Ÿà¦¿ à¦¬à¦¾à¦°à§à¦¤à¦¾ à¦ªà¦¾à¦ à¦¾à¦¨" },
  formNameLabel: { en: "Your Name", bn: "à¦†à¦ªà¦¨à¦¾à¦° à¦¨à¦¾à¦®" },
  formEmailLabel: { en: "Email", bn: "à¦‡à¦®à§‡à¦‡à¦²" },
  formPhoneLabel: { en: "Phone", bn: "à¦«à§‹à¦¨" },
  formSubjectLabel: { en: "Subject", bn: "à¦¬à¦¿à¦·à¦¯à¦¼" },
  formMessageLabel: { en: "Message", bn: "à¦¬à¦¾à¦°à§à¦¤à¦¾" },
  formSubmitText: { en: "Send Message", bn: "à¦¬à¦¾à¦°à§à¦¤à¦¾ à¦ªà¦¾à¦ à¦¾à¦¨" },
  formSuccessText: { en: "Thank you! We received your message.", bn: "à¦§à¦¨à§à¦¯à¦¬à¦¾à¦¦! à¦†à¦®à¦°à¦¾ à¦†à¦ªà¦¨à¦¾à¦° à¦¬à¦¾à¦°à§à¦¤à¦¾ à¦ªà§‡à¦¯à¦¼à§‡à¦›à¦¿à¥¤" },
  infoTitle: { en: "Get in touch", bn: "à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦— à¦•à¦°à§à¦¨" },
  infoSubtitle: { en: "Reach us through any channel below", bn: "à¦¨à¦¿à¦šà§‡à¦° à¦¯à§‡à¦•à§‹à¦¨à§‹ à¦®à¦¾à¦§à§à¦¯à¦®à§‡ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦•à¦¾à¦›à§‡ à¦ªà§Œà¦à¦›à¦¾à¦¨" },
  hoursTitle: { en: "Business Hours", bn: "à¦…à¦«à¦¿à¦¸ à¦¸à¦®à¦¯à¦¼" },
  hoursText: { en: "Saturday â€“ Thursday: 9 AM â€“ 9 PM\nFriday: Closed", bn: "à¦¶à¦¨à¦¿à¦¬à¦¾à¦° â€“ à¦¬à§ƒà¦¹à¦¸à§à¦ªà¦¤à¦¿à¦¬à¦¾à¦°: à¦¸à¦•à¦¾à¦² à§¯à¦Ÿà¦¾ â€“ à¦°à¦¾à¦¤ à§¯à¦Ÿà¦¾\nà¦¶à§à¦•à§à¦°à¦¬à¦¾à¦°: à¦¬à¦¨à§à¦§" },
};

function normalize(raw: unknown): ContactContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    heroBadge: toBilingual(r.heroBadge ?? DEFAULT_CONTACT.heroBadge),
    heroTitle: toBilingual(r.heroTitle ?? DEFAULT_CONTACT.heroTitle),
    heroSubtitle: toBilingual(r.heroSubtitle ?? DEFAULT_CONTACT.heroSubtitle),
    formTitle: toBilingual(r.formTitle ?? DEFAULT_CONTACT.formTitle),
    formNameLabel: toBilingual(r.formNameLabel ?? DEFAULT_CONTACT.formNameLabel),
    formEmailLabel: toBilingual(r.formEmailLabel ?? DEFAULT_CONTACT.formEmailLabel),
    formPhoneLabel: toBilingual(r.formPhoneLabel ?? DEFAULT_CONTACT.formPhoneLabel),
    formSubjectLabel: toBilingual(r.formSubjectLabel ?? DEFAULT_CONTACT.formSubjectLabel),
    formMessageLabel: toBilingual(r.formMessageLabel ?? DEFAULT_CONTACT.formMessageLabel),
    formSubmitText: toBilingual(r.formSubmitText ?? DEFAULT_CONTACT.formSubmitText),
    formSuccessText: toBilingual(r.formSuccessText ?? DEFAULT_CONTACT.formSuccessText),
    infoTitle: toBilingual(r.infoTitle ?? DEFAULT_CONTACT.infoTitle),
    infoSubtitle: toBilingual(r.infoSubtitle ?? DEFAULT_CONTACT.infoSubtitle),
    hoursTitle: toBilingual(r.hoursTitle ?? DEFAULT_CONTACT.hoursTitle),
    hoursText: toBilingual(r.hoursText ?? DEFAULT_CONTACT.hoursText),
  };
}

export default async function ContactEditorPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");
  let content = DEFAULT_CONTACT;
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "page_contact" } });
    if (setting?.value) content = normalize(JSON.parse(setting.value));
  } catch { /* */ }
  return <ContactPageEditor initialData={content} />;
}


