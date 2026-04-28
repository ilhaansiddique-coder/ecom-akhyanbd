import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import AboutPageEditor, { type AboutContent } from "./AboutPageEditor";

export const dynamic = "force-dynamic";

const DEFAULT_ABOUT: AboutContent = {
  heroBadge: { en: "Best for kids", bn: "শিশুদের জন্য সেরা" },
  heroTitle: { en: "About Us", bn: "আমাদের সম্পর্কে" },
  heroSubtitle: {
    en: "We are a trusted children's fashion brand in Bangladesh.",
    bn: "আমরা বাংলাদেশের একটি বিশ্বস্ত শিশু ফ্যাশন ব্র্যান্ড। নবজাতক থেকে ১২ বছর — প্রতিটি বয়সের শিশুর জন্য নরম, আরামদায়ক ও স্টাইলিশ পোশাক।",
  },
  missionTitle: { en: "Our Mission", bn: "আমাদের লক্ষ্য" },
  missionDescription: {
    en: "Where style meets joy — kids shine like the sun. Our mission is to deliver superior quality, comfortable and affordable children's clothing to every family in Bangladesh.",
    bn: "যেখানে স্টাইল মিলিত হয় আনন্দে — শিশুরা ঝলমলিয়ে ওঠে সূর্যের মতো। আমাদের লক্ষ্য বাংলাদেশের প্রতিটি পরিবারের কাছে উন্নত মানের, আরামদায়ক ও সাশ্রয়ী মূল্যের শিশু পোশাক পৌঁছে দেওয়া।",
  },
  stats: [
    { value: { en: "200+", bn: "২০০+" }, label: { en: "Fashion Items", bn: "ফ্যাশন আইটেম" } },
    { value: { en: "10,000+", bn: "১০,০০০+" }, label: { en: "Happy Families", bn: "সন্তুষ্ট পরিবার" } },
    { value: { en: "5+", bn: "৫+" }, label: { en: "Years of Experience", bn: "বছরের অভিজ্ঞতা" } },
  ],
  storyTitle: { en: "How Our Journey Began", bn: "কীভাবে শুরু হলো আমাদের যাত্রা" },
  storyP1: {
    en: "Our journey started from a simple dream — to dress every child in the best clothing.",
    bn: "আমাদের যাত্রা শুরু হয়েছিল একটি সাধারণ স্বপ্ন থেকে — প্রতিটি শিশুকে সেরা পোশাকে সাজানো।",
  },
  storyP2: {
    en: "Since our founding, we have used carefully selected soft, skin-friendly fabric.",
    bn: "প্রতিষ্ঠার পর থেকে আমরা যত্নসহকারে নির্বাচিত নরম, ত্বক-বান্ধব কাপড় ব্যবহার করে আসছি।",
  },
  storyP3: {
    en: "Today we are proud that thousands of families trust us.",
    bn: "আজ আমরা গর্বিত যে হাজার হাজার পরিবার আমাদের বিশ্বাস করেন এবং তাদের সোনামণিদের পরাচ্ছেন আমাদের পোশাক।",
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
    {
      title: { en: "Skin-Friendly Fabric", bn: "ত্বক-বান্ধব কাপড়" },
      desc: {
        en: "All our clothing is made from carefully selected soft and skin-friendly fabric.",
        bn: "আমাদের সকল পোশাক যত্নসহকারে নির্বাচিত নরম ও ত্বক-বান্ধব কাপড়ে তৈরি। শিশুদের সংবেদনশীল ত্বকের জন্য সম্পূর্ণ নিরাপদ।",
      },
    },
    {
      title: { en: "Fast Delivery", bn: "দ্রুত ডেলিভারি" },
      desc: {
        en: "Fastest delivery across Bangladesh. Usually delivered within 3–5 business days.",
        bn: "সারা বাংলাদেশে দ্রুততম সময়ে ডেলিভারি। সাধারণত ৩–৫ কার্যদিবসের মধ্যে আপনার দোরগোড়ায়।",
      },
    },
    {
      title: { en: "Affordable Price", bn: "সাশ্রয়ী মূল্য" },
      desc: {
        en: "Premium quality children's clothing at the most affordable price.",
        bn: "প্রিমিয়াম মানের শিশু পোশাক সবচেয়ে সাশ্রয়ী মূল্যে — কারণ প্রতিটি পরিবারই সেরা পাওয়ার যোগ্য।",
      },
    },
    {
      title: { en: "Free Returns", bn: "ফ্রি রিটার্ন" },
      desc: {
        en: "Easy return and exchange policy — your complete satisfaction guaranteed.",
        bn: "সাইজ মেলেনি? কোনো সমস্যা নেই। সহজ রিটার্ন ও এক্সচেঞ্জ পলিসি — আপনার সম্পূর্ণ সন্তুষ্টি নিশ্চিত।",
      },
    },
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

/** Normalize stored data — lift any legacy plain-string fields into {en,bn}. */
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
      return { title: toBilingual(o.title), desc: toBilingual(o.desc) };
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

export default async function AboutPageEditorPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "page_about" } });
    const data = setting?.value ? normalize(JSON.parse(setting.value)) : DEFAULT_ABOUT;
    return <AboutPageEditor initialData={data} />;
  } catch {
    return <AboutPageEditor initialData={DEFAULT_ABOUT} />;
  }
}
