import { FiFileText } from "react-icons/fi";
import { TText } from "@/components/ProductDetailClient";
import { prisma } from "@/lib/prisma";
import { toBilingual, type Bilingual } from "@/lib/bilingual";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PolicySection { title: Bilingual; content: Bilingual }
interface PolicyContent {
  title: Bilingual;
  lastUpdated: Bilingual;
  intro: Bilingual;
  sections: PolicySection[];
}

const DEFAULT_TERMS: PolicyContent = {
  title: { en: "Terms & Conditions", bn: "শর্তাবলী" },
  lastUpdated: { en: "January 1, 2025", bn: "১ জানুয়ারি ২০২৫" },
  intro: {
    en: "Please read these terms and conditions carefully before using our website and services.",
    bn: "আমাদের ওয়েবসাইট ও সেবা ব্যবহার করার আগে অনুগ্রহ করে এই শর্তাবলী মনোযোগ দিয়ে পড়ুন।",
  },
  sections: [],
};

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

async function getContent(): Promise<PolicyContent> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "page_terms" } });
    if (setting?.value) return normalizePolicy(JSON.parse(setting.value), DEFAULT_TERMS);
  } catch { /* */ }
  return DEFAULT_TERMS;
}

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContent();
  return {
    title: content.title.bn || content.title.en || "Terms & Conditions",
    description: content.intro.bn || content.intro.en,
  };
}

export default async function TermsPage() {
  const content = await getContent();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-linear-to-br from-primary via-primary-light to-primary-dark py-14 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-4">
            <FiFileText className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            <TText en={content.title.en} bn={content.title.bn} />
          </h1>
          <p className="text-white/75 text-base max-w-lg mx-auto">
            <TText en="Last updated: " bn="সর্বশেষ আপডেট: " />
            <TText en={content.lastUpdated.en} bn={content.lastUpdated.bn} />
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 mb-10">
              <p className="text-text-body text-sm leading-relaxed">
                <TText en={content.intro.en} bn={content.intro.bn} />
              </p>
            </div>

            <div className="space-y-10">
              {content.sections.map((section, idx) => (
                <div key={idx}>
                  <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                    <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <TText en={section.title.en} bn={section.title.bn} />
                  </h2>
                  <div className="pl-11 text-text-body text-sm leading-relaxed whitespace-pre-line">
                    <TText en={section.content.en} bn={section.content.bn} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
