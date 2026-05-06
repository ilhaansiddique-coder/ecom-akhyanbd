import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import AboutPageEditor, { type AboutContent } from "./AboutPageEditor";

export const dynamic = "force-dynamic";

const DEFAULT_ABOUT: AboutContent = {
  heroBadge: { en: "Best for kids", bn: "à¦¶à¦¿à¦¶à§à¦¦à§‡à¦° à¦œà¦¨à§à¦¯ à¦¸à§‡à¦°à¦¾" },
  heroTitle: { en: "About Us", bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¸à¦®à§à¦ªà¦°à§à¦•à§‡" },
  heroSubtitle: {
    en: "We are a trusted children's fashion brand in Bangladesh.",
    bn: "à¦†à¦®à¦°à¦¾ à¦¬à¦¾à¦‚à¦²à¦¾à¦¦à§‡à¦¶à§‡à¦° à¦à¦•à¦Ÿà¦¿ à¦¬à¦¿à¦¶à§à¦¬à¦¸à§à¦¤ à¦¶à¦¿à¦¶à§ à¦«à§à¦¯à¦¾à¦¶à¦¨ à¦¬à§à¦°à§à¦¯à¦¾à¦¨à§à¦¡à¥¤ à¦¨à¦¬à¦œà¦¾à¦¤à¦• à¦¥à§‡à¦•à§‡ à§§à§¨ à¦¬à¦›à¦° â€” à¦ªà§à¦°à¦¤à¦¿à¦Ÿà¦¿ à¦¬à¦¯à¦¼à¦¸à§‡à¦° à¦¶à¦¿à¦¶à§à¦° à¦œà¦¨à§à¦¯ à¦¨à¦°à¦®, à¦†à¦°à¦¾à¦®à¦¦à¦¾à¦¯à¦¼à¦• à¦“ à¦¸à§à¦Ÿà¦¾à¦‡à¦²à¦¿à¦¶ à¦ªà§‹à¦¶à¦¾à¦•à¥¤",
  },
  missionTitle: { en: "Our Mission", bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦²à¦•à§à¦·à§à¦¯" },
  missionDescription: {
    en: "Where style meets joy â€” kids shine like the sun. Our mission is to deliver superior quality, comfortable and affordable children's clothing to every family in Bangladesh.",
    bn: "à¦¯à§‡à¦–à¦¾à¦¨à§‡ à¦¸à§à¦Ÿà¦¾à¦‡à¦² à¦®à¦¿à¦²à¦¿à¦¤ à¦¹à¦¯à¦¼ à¦†à¦¨à¦¨à§à¦¦à§‡ â€” à¦¶à¦¿à¦¶à§à¦°à¦¾ à¦à¦²à¦®à¦²à¦¿à¦¯à¦¼à§‡ à¦“à¦ à§‡ à¦¸à§‚à¦°à§à¦¯à§‡à¦° à¦®à¦¤à§‹à¥¤ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦²à¦•à§à¦·à§à¦¯ à¦¬à¦¾à¦‚à¦²à¦¾à¦¦à§‡à¦¶à§‡à¦° à¦ªà§à¦°à¦¤à¦¿à¦Ÿà¦¿ à¦ªà¦°à¦¿à¦¬à¦¾à¦°à§‡à¦° à¦•à¦¾à¦›à§‡ à¦‰à¦¨à§à¦¨à¦¤ à¦®à¦¾à¦¨à§‡à¦°, à¦†à¦°à¦¾à¦®à¦¦à¦¾à¦¯à¦¼à¦• à¦“ à¦¸à¦¾à¦¶à§à¦°à¦¯à¦¼à§€ à¦®à§‚à¦²à§à¦¯à§‡à¦° à¦¶à¦¿à¦¶à§ à¦ªà§‹à¦¶à¦¾à¦• à¦ªà§Œà¦à¦›à§‡ à¦¦à§‡à¦“à¦¯à¦¼à¦¾à¥¤",
  },
  stats: [
    { value: { en: "200+", bn: "à§¨à§¦à§¦+" }, label: { en: "Fashion Items", bn: "à¦«à§à¦¯à¦¾à¦¶à¦¨ à¦†à¦‡à¦Ÿà§‡à¦®" } },
    { value: { en: "10,000+", bn: "à§§à§¦,à§¦à§¦à§¦+" }, label: { en: "Happy Families", bn: "à¦¸à¦¨à§à¦¤à§à¦·à§à¦Ÿ à¦ªà¦°à¦¿à¦¬à¦¾à¦°" } },
    { value: { en: "5+", bn: "à§«+" }, label: { en: "Years of Experience", bn: "à¦¬à¦›à¦°à§‡à¦° à¦…à¦­à¦¿à¦œà§à¦žà¦¤à¦¾" } },
  ],
  storyTitle: { en: "How Our Journey Began", bn: "à¦•à§€à¦­à¦¾à¦¬à§‡ à¦¶à§à¦°à§ à¦¹à¦²à§‹ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¯à¦¾à¦¤à§à¦°à¦¾" },
  storyP1: {
    en: "Our journey started from a simple dream â€” to dress every child in the best clothing.",
    bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¯à¦¾à¦¤à§à¦°à¦¾ à¦¶à§à¦°à§ à¦¹à¦¯à¦¼à§‡à¦›à¦¿à¦² à¦à¦•à¦Ÿà¦¿ à¦¸à¦¾à¦§à¦¾à¦°à¦£ à¦¸à§à¦¬à¦ªà§à¦¨ à¦¥à§‡à¦•à§‡ â€” à¦ªà§à¦°à¦¤à¦¿à¦Ÿà¦¿ à¦¶à¦¿à¦¶à§à¦•à§‡ à¦¸à§‡à¦°à¦¾ à¦ªà§‹à¦¶à¦¾à¦•à§‡ à¦¸à¦¾à¦œà¦¾à¦¨à§‹à¥¤",
  },
  storyP2: {
    en: "Since our founding, we have used carefully selected soft, skin-friendly fabric.",
    bn: "à¦ªà§à¦°à¦¤à¦¿à¦·à§à¦ à¦¾à¦° à¦ªà¦° à¦¥à§‡à¦•à§‡ à¦†à¦®à¦°à¦¾ à¦¯à¦¤à§à¦¨à¦¸à¦¹à¦•à¦¾à¦°à§‡ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¿à¦¤ à¦¨à¦°à¦®, à¦¤à§à¦¬à¦•-à¦¬à¦¾à¦¨à§à¦§à¦¬ à¦•à¦¾à¦ªà¦¡à¦¼ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à§‡ à¦†à¦¸à¦›à¦¿à¥¤",
  },
  storyP3: {
    en: "Today we are proud that thousands of families trust us.",
    bn: "à¦†à¦œ à¦†à¦®à¦°à¦¾ à¦—à¦°à§à¦¬à¦¿à¦¤ à¦¯à§‡ à¦¹à¦¾à¦œà¦¾à¦° à¦¹à¦¾à¦œà¦¾à¦° à¦ªà¦°à¦¿à¦¬à¦¾à¦° à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¬à¦¿à¦¶à§à¦¬à¦¾à¦¸ à¦•à¦°à§‡à¦¨ à¦à¦¬à¦‚ à¦¤à¦¾à¦¦à§‡à¦° à¦¸à§‹à¦¨à¦¾à¦®à¦£à¦¿à¦¦à§‡à¦° à¦ªà¦°à¦¾à¦šà§à¦›à§‡à¦¨ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦ªà§‹à¦¶à¦¾à¦•à¥¤",
  },
  timeline: [
    { year: { en: "2018", bn: "à§¨à§¦à§§à§®" }, event: { en: "Brand established", bn: "à¦¬à§à¦°à§à¦¯à¦¾à¦¨à§à¦¡ à¦ªà§à¦°à¦¤à¦¿à¦·à§à¦ à¦¾" } },
    { year: { en: "2020", bn: "à§¨à§¦à§¨à§¦" }, event: { en: "Online sales launched", bn: "à¦…à¦¨à¦²à¦¾à¦‡à¦¨ à¦¬à¦¿à¦•à§à¦°à¦¯à¦¼ à¦¶à§à¦°à§" } },
    { year: { en: "2022", bn: "à§¨à§¦à§¨à§¨" }, event: { en: "10,000 families milestone", bn: "à§§à§¦,à§¦à§¦à§¦ à¦ªà¦°à¦¿à¦¬à¦¾à¦°à§‡à¦° à¦®à¦¾à¦‡à¦²à¦«à¦²à¦•" } },
    { year: { en: "2024", bn: "à§¨à§¦à§¨à§ª" }, event: { en: "200+ fashion items collection", bn: "à§¨à§¦à§¦+ à¦«à§à¦¯à¦¾à¦¶à¦¨ à¦†à¦‡à¦Ÿà§‡à¦®à§‡à¦° à¦•à¦¾à¦²à§‡à¦•à¦¶à¦¨" } },
  ],
  whyUsTitle: { en: "Why Choose Us?", bn: "à¦•à§‡à¦¨ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¬à§‡à¦›à§‡ à¦¨à§‡à¦¬à§‡à¦¨?" },
  whyUsSubtitle: {
    en: "We don't just sell clothing â€” we care about your child's comfort and style.",
    bn: "à¦†à¦®à¦°à¦¾ à¦¶à§à¦§à§ à¦ªà§‹à¦¶à¦¾à¦• à¦¬à¦¿à¦•à§à¦°à¦¿ à¦•à¦°à¦¿ à¦¨à¦¾ â€” à¦†à¦ªà¦¨à¦¾à¦° à¦¸à¦¨à§à¦¤à¦¾à¦¨à§‡à¦° à¦†à¦°à¦¾à¦® à¦“ à¦¸à§à¦Ÿà¦¾à¦‡à¦²à§‡à¦° à¦¯à¦¤à§à¦¨ à¦¨à¦¿à¦‡à¥¤",
  },
  whyUsItems: [
    {
      title: { en: "Skin-Friendly Fabric", bn: "à¦¤à§à¦¬à¦•-à¦¬à¦¾à¦¨à§à¦§à¦¬ à¦•à¦¾à¦ªà¦¡à¦¼" },
      desc: {
        en: "All our clothing is made from carefully selected soft and skin-friendly fabric.",
        bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¸à¦•à¦² à¦ªà§‹à¦¶à¦¾à¦• à¦¯à¦¤à§à¦¨à¦¸à¦¹à¦•à¦¾à¦°à§‡ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¿à¦¤ à¦¨à¦°à¦® à¦“ à¦¤à§à¦¬à¦•-à¦¬à¦¾à¦¨à§à¦§à¦¬ à¦•à¦¾à¦ªà¦¡à¦¼à§‡ à¦¤à§ˆà¦°à¦¿à¥¤ à¦¶à¦¿à¦¶à§à¦¦à§‡à¦° à¦¸à¦‚à¦¬à§‡à¦¦à¦¨à¦¶à§€à¦² à¦¤à§à¦¬à¦•à§‡à¦° à¦œà¦¨à§à¦¯ à¦¸à¦®à§à¦ªà§‚à¦°à§à¦£ à¦¨à¦¿à¦°à¦¾à¦ªà¦¦à¥¤",
      },
    },
    {
      title: { en: "Fast Delivery", bn: "à¦¦à§à¦°à§à¦¤ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿" },
      desc: {
        en: "Fastest delivery across Bangladesh. Usually delivered within 3â€“5 business days.",
        bn: "à¦¸à¦¾à¦°à¦¾ à¦¬à¦¾à¦‚à¦²à¦¾à¦¦à§‡à¦¶à§‡ à¦¦à§à¦°à§à¦¤à¦¤à¦® à¦¸à¦®à¦¯à¦¼à§‡ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿à¥¤ à¦¸à¦¾à¦§à¦¾à¦°à¦£à¦¤ à§©â€“à§« à¦•à¦¾à¦°à§à¦¯à¦¦à¦¿à¦¬à¦¸à§‡à¦° à¦®à¦§à§à¦¯à§‡ à¦†à¦ªà¦¨à¦¾à¦° à¦¦à§‹à¦°à¦—à§‹à¦¡à¦¼à¦¾à¦¯à¦¼à¥¤",
      },
    },
    {
      title: { en: "Affordable Price", bn: "à¦¸à¦¾à¦¶à§à¦°à¦¯à¦¼à§€ à¦®à§‚à¦²à§à¦¯" },
      desc: {
        en: "Premium quality children's clothing at the most affordable price.",
        bn: "à¦ªà§à¦°à¦¿à¦®à¦¿à¦¯à¦¼à¦¾à¦® à¦®à¦¾à¦¨à§‡à¦° à¦¶à¦¿à¦¶à§ à¦ªà§‹à¦¶à¦¾à¦• à¦¸à¦¬à¦šà§‡à¦¯à¦¼à§‡ à¦¸à¦¾à¦¶à§à¦°à¦¯à¦¼à§€ à¦®à§‚à¦²à§à¦¯à§‡ â€” à¦•à¦¾à¦°à¦£ à¦ªà§à¦°à¦¤à¦¿à¦Ÿà¦¿ à¦ªà¦°à¦¿à¦¬à¦¾à¦°à¦‡ à¦¸à§‡à¦°à¦¾ à¦ªà¦¾à¦“à¦¯à¦¼à¦¾à¦° à¦¯à§‹à¦—à§à¦¯à¥¤",
      },
    },
    {
      title: { en: "Free Returns", bn: "à¦«à§à¦°à¦¿ à¦°à¦¿à¦Ÿà¦¾à¦°à§à¦¨" },
      desc: {
        en: "Easy return and exchange policy â€” your complete satisfaction guaranteed.",
        bn: "à¦¸à¦¾à¦‡à¦œ à¦®à§‡à¦²à§‡à¦¨à¦¿? à¦•à§‹à¦¨à§‹ à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¨à§‡à¦‡à¥¤ à¦¸à¦¹à¦œ à¦°à¦¿à¦Ÿà¦¾à¦°à§à¦¨ à¦“ à¦à¦•à§à¦¸à¦šà§‡à¦žà§à¦œ à¦ªà¦²à¦¿à¦¸à¦¿ â€” à¦†à¦ªà¦¨à¦¾à¦° à¦¸à¦®à§à¦ªà§‚à¦°à§à¦£ à¦¸à¦¨à§à¦¤à§à¦·à§à¦Ÿà¦¿ à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤à¥¤",
      },
    },
  ],
  teamTitle: { en: "Our Team", bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¦à¦²" },
  teamSubtitle: {
    en: "Our experienced and dedicated team is always at your service.",
    bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦…à¦­à¦¿à¦œà§à¦ž à¦“ à¦¨à¦¿à¦¬à§‡à¦¦à¦¿à¦¤à¦ªà§à¦°à¦¾à¦£ à¦¦à¦²à¦Ÿà¦¿ à¦¸à¦°à§à¦¬à¦¦à¦¾ à¦†à¦ªà¦¨à¦¾à¦° à¦¸à§‡à¦¬à¦¾à¦¯à¦¼ à¦¨à¦¿à¦¯à¦¼à§‹à¦œà¦¿à¦¤à¥¤",
  },
  teamMembers: [
    { name: { en: "Rahim Uddin", bn: "à¦°à¦¹à¦¿à¦® à¦‰à¦¦à§à¦¦à¦¿à¦¨" }, role: { en: "Founder & CEO", bn: "à¦ªà§à¦°à¦¤à¦¿à¦·à§à¦ à¦¾à¦¤à¦¾ à¦“ à¦ªà§à¦°à¦§à¦¾à¦¨ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦¹à§€" }, initials: "R" },
    { name: { en: "Sumaiya Begum", bn: "à¦¸à§à¦®à¦¾à¦‡à¦¯à¦¼à¦¾ à¦¬à§‡à¦—à¦®" }, role: { en: "Fashion Designer", bn: "à¦«à§à¦¯à¦¾à¦¶à¦¨ à¦¡à¦¿à¦œà¦¾à¦‡à¦¨à¦¾à¦°" }, initials: "S" },
    { name: { en: "Karim Hossain", bn: "à¦•à¦°à¦¿à¦® à¦¹à§‹à¦¸à§‡à¦¨" }, role: { en: "Head of Sales & Marketing", bn: "à¦¬à¦¿à¦•à§à¦°à¦¯à¦¼ à¦“ à¦¬à¦¿à¦ªà¦£à¦¨ à¦ªà§à¦°à¦§à¦¾à¦¨" }, initials: "K" },
    { name: { en: "Najma Akhtar", bn: "à¦¨à¦¾à¦œà¦®à¦¾ à¦†à¦•à§à¦¤à¦¾à¦°" }, role: { en: "Head of Customer Service", bn: "à¦—à§à¦°à¦¾à¦¹à¦• à¦¸à§‡à¦¬à¦¾ à¦ªà§à¦°à¦§à¦¾à¦¨" }, initials: "N" },
  ],
};

/** Normalize stored data â€” lift any legacy plain-string fields into {en,bn}. */
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


