import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import ContactPageEditor, { type ContactContent } from "./ContactPageEditor";

export const dynamic = "force-dynamic";

const DEFAULT_CONTACT: ContactContent = {
  heroBadge: { en: "Talk to us", bn: "আমাদের সাথে কথা বলুন" },
  heroTitle: { en: "Contact Us", bn: "যোগাযোগ" },
  heroSubtitle: { en: "Have a question? We're here to help.", bn: "কোনো প্রশ্ন আছে? আমরা সাহায্যের জন্য আছি।" },
  formTitle: { en: "Send us a message", bn: "আমাদের একটি বার্তা পাঠান" },
  formNameLabel: { en: "Your Name", bn: "আপনার নাম" },
  formEmailLabel: { en: "Email", bn: "ইমেইল" },
  formPhoneLabel: { en: "Phone", bn: "ফোন" },
  formSubjectLabel: { en: "Subject", bn: "বিষয়" },
  formMessageLabel: { en: "Message", bn: "বার্তা" },
  formSubmitText: { en: "Send Message", bn: "বার্তা পাঠান" },
  formSuccessText: { en: "Thank you! We received your message.", bn: "ধন্যবাদ! আমরা আপনার বার্তা পেয়েছি।" },
  infoTitle: { en: "Get in touch", bn: "যোগাযোগ করুন" },
  infoSubtitle: { en: "Reach us through any channel below", bn: "নিচের যেকোনো মাধ্যমে আমাদের কাছে পৌঁছান" },
  hoursTitle: { en: "Business Hours", bn: "অফিস সময়" },
  hoursText: { en: "Saturday – Thursday: 9 AM – 9 PM\nFriday: Closed", bn: "শনিবার – বৃহস্পতিবার: সকাল ৯টা – রাত ৯টা\nশুক্রবার: বন্ধ" },
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
