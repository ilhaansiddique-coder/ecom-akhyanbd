import { FiHeart, FiTarget, FiUsers, FiAward, FiStar, FiShield, FiTruck, FiSmile } from "react-icons/fi";
import MotionFadeIn from "@/components/MotionFadeIn";
import { MotionStaggerContainer, MotionStaggerItem } from "@/components/MotionStagger";
import { TText } from "@/components/ProductDetailClient";
import { prisma } from "@/lib/prisma";
import { toBilingual, type Bilingual } from "@/lib/bilingual";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface StatItem { value: Bilingual; label: Bilingual }
interface TimelineItem { year: Bilingual; event: Bilingual }
interface WhyUsItem { title: Bilingual; desc: Bilingual; icon?: string }
interface TeamMember { name: Bilingual; role: Bilingual; initials: string }

interface AboutContent {
  heroBadge: Bilingual;
  heroTitle: Bilingual;
  heroSubtitle: Bilingual;
  missionTitle: Bilingual;
  missionDescription: Bilingual;
  stats: StatItem[];
  storyTitle: Bilingual;
  storyP1: Bilingual;
  storyP2: Bilingual;
  storyP3: Bilingual;
  timeline: TimelineItem[];
  whyUsTitle: Bilingual;
  whyUsSubtitle: Bilingual;
  whyUsItems: WhyUsItem[];
  teamTitle: Bilingual;
  teamSubtitle: Bilingual;
  teamMembers: TeamMember[];
}

const DEFAULT_ABOUT: AboutContent = {
  heroBadge: { en: "Best for kids", bn: "শিশুদের জন্য সেরা" },
  heroTitle: { en: "About Us", bn: "আমাদের সম্পর্কে" },
  heroSubtitle: {
    en: "We are a trusted children's fashion brand in Bangladesh.",
    bn: "আমরা বাংলাদেশের একটি বিশ্বস্ত শিশু ফ্যাশন ব্র্যান্ড।",
  },
  missionTitle: { en: "Our Mission", bn: "আমাদের লক্ষ্য" },
  missionDescription: {
    en: "Where style meets joy — kids shine like the sun. Our mission is to deliver superior quality, comfortable and affordable children's clothing to every family in Bangladesh.",
    bn: "যেখানে স্টাইল মিলিত হয় আনন্দে — শিশুরা ঝলমলিয়ে ওঠে সূর্যের মতো।",
  },
  stats: [
    { value: { en: "200+", bn: "২০০+" }, label: { en: "Fashion Items", bn: "ফ্যাশন আইটেম" } },
    { value: { en: "10,000+", bn: "১০,০০০+" }, label: { en: "Happy Families", bn: "সন্তুষ্ট পরিবার" } },
    { value: { en: "5+", bn: "৫+" }, label: { en: "Years of Experience", bn: "বছরের অভিজ্ঞতা" } },
  ],
  storyTitle: { en: "How Our Journey Began", bn: "কীভাবে শুরু হলো আমাদের যাত্রা" },
  storyP1: {
    en: "Our journey started from a simple dream — to dress every child in the best clothing.",
    bn: "আমাদের যাত্রা শুরু হয়েছিল একটি সাধারণ স্বপ্ন থেকে।",
  },
  storyP2: {
    en: "Since our founding, we have used carefully selected soft, skin-friendly fabric.",
    bn: "প্রতিষ্ঠার পর থেকে আমরা যত্নসহকারে নির্বাচিত নরম, ত্বক-বান্ধব কাপড় ব্যবহার করে আসছি।",
  },
  storyP3: {
    en: "Today we are proud that thousands of families trust us.",
    bn: "আজ আমরা গর্বিত যে হাজার হাজার পরিবার আমাদের বিশ্বাস করেন।",
  },
  timeline: [
    { year: { en: "2018", bn: "২০১৮" }, event: { en: "Brand established", bn: "ব্র্যান্ড প্রতিষ্ঠা" } },
    { year: { en: "2020", bn: "২০২০" }, event: { en: "Online sales launched", bn: "অনলাইন বিক্রয় শুরু" } },
    { year: { en: "2022", bn: "২০২২" }, event: { en: "10,000 families milestone", bn: "১০,০০০ পরিবারের মাইলফলক" } },
    { year: { en: "2024", bn: "২০২৪" }, event: { en: "200+ fashion items collection", bn: "২০০+ ফ্যাশন আইটেমের কালেকশন" } },
  ],
  whyUsTitle: { en: "Why Choose Us?", bn: "কেন আমাদের বেছে নেবেন?" },
  whyUsSubtitle: {
    en: "We don't just sell clothing — we care about your child's comfort and style.",
    bn: "আমরা শুধু পোশাক বিক্রি করি না — আপনার সন্তানের আরাম ও স্টাইলের যত্ন নিই।",
  },
  whyUsItems: [
    { title: { en: "Skin-Friendly Fabric", bn: "ত্বক-বান্ধব কাপড়" }, desc: { en: "All our clothing is made from carefully selected soft and skin-friendly fabric.", bn: "আমাদের সকল পোশাক যত্নসহকারে নির্বাচিত নরম ও ত্বক-বান্ধব কাপড়ে তৈরি।" }, icon: "shield" },
    { title: { en: "Fast Delivery", bn: "দ্রুত ডেলিভারি" }, desc: { en: "Fastest delivery across Bangladesh. Usually delivered within 3–5 business days.", bn: "সারা বাংলাদেশে দ্রুততম সময়ে ডেলিভারি।" }, icon: "truck" },
    { title: { en: "Affordable Price", bn: "সাশ্রয়ী মূল্য" }, desc: { en: "Premium quality children's clothing at the most affordable price.", bn: "প্রিমিয়াম মানের শিশু পোশাক সবচেয়ে সাশ্রয়ী মূল্যে।" }, icon: "star" },
    { title: { en: "Free Returns", bn: "ফ্রি রিটার্ন" }, desc: { en: "Easy return and exchange policy — your complete satisfaction guaranteed.", bn: "সহজ রিটার্ন ও এক্সচেঞ্জ পলিসি।" }, icon: "smile" },
  ],
  teamTitle: { en: "Our Team", bn: "আমাদের দল" },
  teamSubtitle: {
    en: "Our experienced and dedicated team is always at your service.",
    bn: "আমাদের অভিজ্ঞ ও নিবেদিতপ্রাণ দলটি সর্বদা আপনার সেবায় নিয়োজিত।",
  },
  teamMembers: [
    { name: { en: "Rahim Uddin", bn: "রহিম উদ্দিন" }, role: { en: "Founder & CEO", bn: "প্রতিষ্ঠাতা ও প্রধান নির্বাহী" }, initials: "R" },
    { name: { en: "Sumaiya Begum", bn: "সুমাইয়া বেগম" }, role: { en: "Fashion Designer", bn: "ফ্যাশন ডিজাইনার" }, initials: "S" },
    { name: { en: "Karim Hossain", bn: "করিম হোসেন" }, role: { en: "Head of Sales & Marketing", bn: "বিক্রয় ও বিপণন প্রধান" }, initials: "K" },
    { name: { en: "Najma Akhtar", bn: "নাজমা আক্তার" }, role: { en: "Head of Customer Service", bn: "গ্রাহক সেবা প্রধান" }, initials: "N" },
  ],
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: FiShield,
  truck: FiTruck,
  star: FiStar,
  smile: FiSmile,
};

function normalize(raw: unknown): AboutContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const stats = Array.isArray(r.stats) ? r.stats : DEFAULT_ABOUT.stats;
  const timeline = Array.isArray(r.timeline) ? r.timeline : DEFAULT_ABOUT.timeline;
  const whyUsItems = Array.isArray(r.whyUsItems) ? r.whyUsItems : DEFAULT_ABOUT.whyUsItems;
  const teamMembers = Array.isArray(r.teamMembers) ? r.teamMembers : DEFAULT_ABOUT.teamMembers;
  return {
    heroBadge: toBilingual(r.heroBadge ?? DEFAULT_ABOUT.heroBadge),
    heroTitle: toBilingual(r.heroTitle ?? DEFAULT_ABOUT.heroTitle),
    heroSubtitle: toBilingual(r.heroSubtitle ?? DEFAULT_ABOUT.heroSubtitle),
    missionTitle: toBilingual(r.missionTitle ?? DEFAULT_ABOUT.missionTitle),
    missionDescription: toBilingual(r.missionDescription ?? DEFAULT_ABOUT.missionDescription),
    stats: stats.map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      return { value: toBilingual(o.value), label: toBilingual(o.label) };
    }),
    storyTitle: toBilingual(r.storyTitle ?? DEFAULT_ABOUT.storyTitle),
    storyP1: toBilingual(r.storyP1 ?? DEFAULT_ABOUT.storyP1),
    storyP2: toBilingual(r.storyP2 ?? DEFAULT_ABOUT.storyP2),
    storyP3: toBilingual(r.storyP3 ?? DEFAULT_ABOUT.storyP3),
    timeline: timeline.map((t) => {
      const o = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
      return { year: toBilingual(o.year), event: toBilingual(o.event) };
    }),
    whyUsTitle: toBilingual(r.whyUsTitle ?? DEFAULT_ABOUT.whyUsTitle),
    whyUsSubtitle: toBilingual(r.whyUsSubtitle ?? DEFAULT_ABOUT.whyUsSubtitle),
    whyUsItems: whyUsItems.map((w) => {
      const o = (w && typeof w === "object" ? w : {}) as Record<string, unknown>;
      return {
        title: toBilingual(o.title),
        desc: toBilingual(o.desc),
        icon: typeof o.icon === "string" ? o.icon : undefined,
      };
    }),
    teamTitle: toBilingual(r.teamTitle ?? DEFAULT_ABOUT.teamTitle),
    teamSubtitle: toBilingual(r.teamSubtitle ?? DEFAULT_ABOUT.teamSubtitle),
    teamMembers: teamMembers.map((m) => {
      const o = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
      return {
        name: toBilingual(o.name),
        role: toBilingual(o.role),
        initials: typeof o.initials === "string" ? o.initials : "",
      };
    }),
  };
}

async function getContent(): Promise<AboutContent> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "page_about" } });
    if (setting?.value) return normalize(JSON.parse(setting.value));
  } catch { /* */ }
  return DEFAULT_ABOUT;
}

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContent();
  return {
    title: content.heroTitle.bn || content.heroTitle.en,
    description: content.heroSubtitle.bn || content.heroSubtitle.en,
  };
}

export default async function AboutPage() {
  const content = await getContent();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-linear-to-br from-primary via-primary-light to-primary-dark overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-28 -left-28 w-[420px] h-[420px] bg-white/5 rounded-full" />
        </div>
        <div className="container mx-auto px-4 py-20 md:py-28 relative z-10 text-center">
          <MotionFadeIn>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 rounded-full text-white/90 text-sm mb-6 backdrop-blur-sm">
              <FiHeart className="w-4 h-4 text-red-300" />
              <TText en={content.heroBadge.en} bn={content.heroBadge.bn} />
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-5">
              <TText en={content.heroTitle.en} bn={content.heroTitle.bn} />
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              <TText en={content.heroSubtitle.en} bn={content.heroSubtitle.bn} />
            </p>
          </MotionFadeIn>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <MotionFadeIn className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6">
              <FiTarget className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 section-heading">
              <TText en={content.missionTitle.en} bn={content.missionTitle.bn} />
            </h2>
            <p className="text-text-body text-lg leading-relaxed mt-6">
              <TText en={content.missionDescription.en} bn={content.missionDescription.bn} />
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {content.stats.map((stat, i) => (
                <div key={i} className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
                  <p className="text-4xl font-bold text-primary mb-1">
                    <TText en={stat.value.en} bn={stat.value.bn} />
                  </p>
                  <p className="text-text-muted font-medium">
                    <TText en={stat.label.en} bn={stat.label.bn} />
                  </p>
                </div>
              ))}
            </div>
          </MotionFadeIn>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 md:py-20 bg-background-alt">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <MotionFadeIn direction="right">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
                <FiHeart className="w-4 h-4" />
                <TText en="Our Story" bn="আমাদের গল্প" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                <TText en={content.storyTitle.en} bn={content.storyTitle.bn} />
              </h2>
              <div className="space-y-4 text-text-body leading-relaxed">
                <p><TText en={content.storyP1.en} bn={content.storyP1.bn} /></p>
                <p><TText en={content.storyP2.en} bn={content.storyP2.bn} /></p>
                <p><TText en={content.storyP3.en} bn={content.storyP3.bn} /></p>
              </div>
            </MotionFadeIn>
            <MotionFadeIn direction="left" delay={0.15}>
              <div className="bg-linear-to-br from-primary/10 to-primary/5 border border-primary/15 rounded-3xl p-8 md:p-10">
                <div className="text-center mb-8"><span className="text-7xl">👶</span></div>
                <div className="space-y-4">
                  {content.timeline.map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg shrink-0 mt-0.5">
                        <TText en={item.year.en} bn={item.year.bn} />
                      </span>
                      <p className="text-text-body text-sm">
                        <TText en={item.event.en} bn={item.event.bn} />
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <MotionFadeIn className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
              <FiAward className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground section-heading">
              <TText en={content.whyUsTitle.en} bn={content.whyUsTitle.bn} />
            </h2>
            <p className="text-text-muted mt-6 max-w-xl mx-auto">
              <TText en={content.whyUsSubtitle.en} bn={content.whyUsSubtitle.bn} />
            </p>
          </MotionFadeIn>
          <MotionStaggerContainer staggerDelay={0.12} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.whyUsItems.map((item, i) => {
              const IconComp = ICON_MAP[item.icon ?? ""] ?? FiStar;
              return (
                <MotionStaggerItem
                  key={i}
                  className="bg-white border border-border rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="w-14 h-14 mx-auto bg-primary/10 group-hover:bg-primary rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300">
                    <IconComp className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="font-bold text-foreground text-base mb-2">
                    <TText en={item.title.en} bn={item.title.bn} />
                  </h3>
                  <p className="text-text-muted text-sm leading-relaxed">
                    <TText en={item.desc.en} bn={item.desc.bn} />
                  </p>
                </MotionStaggerItem>
              );
            })}
          </MotionStaggerContainer>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-20 bg-primary">
        <div className="container mx-auto px-4">
          <MotionFadeIn className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-4">
              <FiUsers className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              <TText en={content.teamTitle.en} bn={content.teamTitle.bn} />
            </h2>
            <p className="text-white/70 max-w-xl mx-auto">
              <TText en={content.teamSubtitle.en} bn={content.teamSubtitle.bn} />
            </p>
          </MotionFadeIn>
          <MotionStaggerContainer staggerDelay={0.12} className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {content.teamMembers.map((member, i) => (
              <MotionStaggerItem
                key={i}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center hover:bg-white/20 transition-colors"
              >
                <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-white">{member.initials}</span>
                </div>
                <h3 className="font-bold text-white text-sm md:text-base">
                  <TText en={member.name.en} bn={member.name.bn} />
                </h3>
                <p className="text-white/60 text-xs mt-1">
                  <TText en={member.role.en} bn={member.role.bn} />
                </p>
              </MotionStaggerItem>
            ))}
          </MotionStaggerContainer>
        </div>
      </section>
    </div>
  );
}
