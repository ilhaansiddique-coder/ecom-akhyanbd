import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import PolicyPageEditor, { type PolicyContent } from "./PolicyPageEditor";

export const dynamic = "force-dynamic";

const DEFAULT_PRIVACY: PolicyContent = {
  title: { en: "Privacy Policy", bn: "গোপনীয়তা নীতি" },
  lastUpdated: { en: "January 1, 2025", bn: "১ জানুয়ারি ২০২৫" },
  intro: {
    en: "We take your privacy very seriously. This privacy policy describes how we collect, use and protect your information when you use our website.",
    bn: "আমরা আপনার গোপনীয়তাকে সর্বোচ্চ গুরুত্ব দিই। এই গোপনীয়তা নীতিটি আমাদের ওয়েবসাইট ব্যবহার করার সময় আমরা কীভাবে আপনার তথ্য সংগ্রহ, ব্যবহার এবং সুরক্ষিত রাখি তা বর্ণনা করে।",
  },
  sections: [
    {
      title: { en: "Information Collection", bn: "তথ্য সংগ্রহ" },
      content: {
        en: "We may collect the following information to provide our services:\n- Personal information: name, email address, phone number, delivery address.\n- Order information: products you purchased, payment information (securely processed).\n- Browsing information: which products you viewed, how much time you spent.\n- Device information: browser type, IP address, operating system.",
        bn: "আমরা আমাদের পরিষেবা প্রদান করার জন্য নিম্নলিখিত তথ্য সংগ্রহ করতে পারি:\n- ব্যক্তিগত তথ্য: নাম, ইমেইল ঠিকানা, ফোন নম্বর, ডেলিভারি ঠিকানা।\n- অর্ডার তথ্য: আপনি যে পণ্য কিনেছেন, পেমেন্টের তথ্য (নিরাপদভাবে প্রক্রিয়াকৃত)।\n- ব্রাউজিং তথ্য: আপনি কোন পণ্য দেখেছেন, কত সময় ব্যয় করেছেন।\n- ডিভাইস তথ্য: ব্রাউজারের ধরন, IP ঠিকানা, অপারেটিং সিস্টেম।",
      },
    },
    {
      title: { en: "Use of Information", bn: "তথ্যের ব্যবহার" },
      content: {
        en: "We use the collected information for the following purposes:\n- Processing your order and ensuring delivery.\n- Providing customer service and resolving issues.\n- Informing you about new products, offers and updates (only with your consent).\n- Improving our website and services.\n- Complying with applicable laws and regulations.",
        bn: "আমরা সংগৃহীত তথ্য নিম্নলিখিত উদ্দেশ্যে ব্যবহার করি:\n- আপনার অর্ডার প্রক্রিয়া করা এবং ডেলিভারি নিশ্চিত করা।\n- গ্রাহক সেবা প্রদান ও সমস্যা সমাধান করা।\n- নতুন পণ্য, অফার ও আপডেট সম্পর্কে আপনাকে জানানো (শুধুমাত্র আপনার সম্মতিতে)।\n- আমাদের ওয়েবসাইট ও সেবার মান উন্নত করা।\n- প্রযোজ্য আইন ও বিধিমালা মেনে চলা।",
      },
    },
    {
      title: { en: "Information Security", bn: "তথ্যের নিরাপত্তা" },
      content: {
        en: "The security of your information is extremely important to us. We use industry-standard security measures including SSL/TLS encryption. Payment information is not stored directly on our servers. We conduct regular security audits and updates.",
        bn: "আপনার তথ্যের নিরাপত্তা আমাদের কাছে অত্যন্ত গুরুত্বপূর্ণ। আমরা শিল্প-মানের নিরাপত্তা ব্যবস্থা ব্যবহার করি, যার মধ্যে রয়েছে:\n- SSL/TLS এনক্রিপশন প্রযুক্তি।\n- পেমেন্ট তথ্য সরাসরি আমাদের সার্ভারে সংরক্ষিত হয় না।\n- নিয়মিত নিরাপত্তা অডিট ও আপডেট পরিচালনা।\n- কর্মীদের তথ্য সুরক্ষা বিষয়ে প্রশিক্ষণ প্রদান।",
      },
    },
    {
      title: { en: "Cookie Policy", bn: "কুকি নীতি" },
      content: {
        en: "Our website uses cookies. Cookies are small text files stored in your browser. We use essential cookies for website functionality, performance cookies for analytics, and functionality cookies to remember your preferences.",
        bn: "আমাদের ওয়েবসাইট কুকি ব্যবহার করে। কুকি হলো ছোট টেক্সট ফাইল যা আপনার ব্রাউজারে সংরক্ষিত হয়।\n- প্রয়োজনীয় কুকি: ওয়েবসাইটের মূল কার্যকারিতার জন্য অপরিহার্য।\n- পারফরম্যান্স কুকি: ওয়েবসাইটের ব্যবহার বিশ্লেষণের জন্য।\n- ফাংশনালিটি কুকি: আপনার পছন্দ ও সেটিংস মনে রাখার জন্য।",
      },
    },
    {
      title: { en: "Third Parties", bn: "তৃতীয় পক্ষ" },
      content: {
        en: "We work with trusted third parties to provide certain services. These third parties may only use your information for their designated tasks: payment gateways, delivery services, analytics services, and customer support tools. We never sell or rent your information to advertisers.",
        bn: "আমরা নির্দিষ্ট পরিষেবা প্রদানের জন্য বিশ্বস্ত তৃতীয় পক্ষের সাথে কাজ করি:\n- পেমেন্ট গেটওয়ে: নিরাপদ পেমেন্ট প্রক্রিয়াকরণের জন্য।\n- ডেলিভারি সার্ভিস: পণ্য পৌঁছে দেওয়ার জন্য।\n- অ্যানালিটিক্স সার্ভিস: ওয়েবসাইটের ব্যবহার বিশ্লেষণের জন্য।\n- কাস্টমার সাপোর্ট টুলস: আপনাকে সহায়তা করার জন্য।",
      },
    },
    {
      title: { en: "Contact", bn: "যোগাযোগ" },
      content: {
        en: "For any privacy-related questions or concerns, please visit our contact page.",
        bn: "গোপনীয়তা সংক্রান্ত যেকোনো প্রশ্ন বা উদ্বেগের জন্য আমাদের যোগাযোগ পেজ দেখুন।",
      },
    },
  ],
};

/** Normalize stored data — lift any legacy plain-string fields into {en,bn}. */
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
