import { FiMail } from "react-icons/fi";
import MotionFadeIn from "@/components/MotionFadeIn";
import ContactForm from "@/components/ContactForm";
import ContactInfo from "@/components/ContactInfo";
import { TText } from "@/components/ProductDetailClient";
import { prisma } from "@/lib/prisma";
import { toBilingual, type Bilingual } from "@/lib/bilingual";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface ContactContent {
  heroBadge: Bilingual;
  heroTitle: Bilingual;
  heroSubtitle: Bilingual;
  formTitle: Bilingual;
  formNameLabel: Bilingual;
  formEmailLabel: Bilingual;
  formPhoneLabel: Bilingual;
  formSubjectLabel: Bilingual;
  formMessageLabel: Bilingual;
  formSubmitText: Bilingual;
  formSuccessText: Bilingual;
  infoTitle: Bilingual;
  infoSubtitle: Bilingual;
  hoursTitle: Bilingual;
  hoursText: Bilingual;
}

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

async function getContent(): Promise<ContactContent> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "page_contact" } });
    if (setting?.value) return normalize(JSON.parse(setting.value));
  } catch { /* */ }
  return DEFAULT_CONTACT;
}

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return {
    title: c.heroTitle.bn || c.heroTitle.en,
    description: c.heroSubtitle.bn || c.heroSubtitle.en,
  };
}

export default async function ContactPage() {
  const c = await getContent();
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-linear-to-br from-primary via-primary-light to-primary-dark overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-28 -left-28 w-[420px] h-[420px] bg-white/5 rounded-full" />
        </div>
        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10 text-center">
          <MotionFadeIn>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 rounded-full text-white/90 text-sm mb-6 backdrop-blur-sm">
              <FiMail className="w-4 h-4" />
              <TText en={c.heroBadge.en} bn={c.heroBadge.bn} />
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              <TText en={c.heroTitle.en} bn={c.heroTitle.bn} />
            </h1>
            <p className="text-white/80 text-lg max-w-xl mx-auto leading-relaxed">
              <TText en={c.heroSubtitle.en} bn={c.heroSubtitle.bn} />
            </p>
          </MotionFadeIn>
        </div>
      </section>

      {/* Main */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
            {/* Form */}
            <MotionFadeIn className="lg:col-span-2">
              <div className="bg-white border border-border rounded-2xl p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  <TText en={c.formTitle.en} bn={c.formTitle.bn} />
                </h2>
                <ContactForm />
              </div>
            </MotionFadeIn>

            {/* Sidebar — dynamic from site settings */}
            <ContactInfo />
          </div>
        </div>
      </section>
    </div>
  );
}
