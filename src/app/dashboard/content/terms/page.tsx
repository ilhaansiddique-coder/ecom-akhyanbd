import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import PolicyPageEditor, { type PolicyContent } from "../privacy/PolicyPageEditor";

export const dynamic = "force-dynamic";

const DEFAULT_TERMS: PolicyContent = {
  title: { en: "Terms & Conditions", bn: "শর্তাবলী" },
  lastUpdated: { en: "January 1, 2025", bn: "১ জানুয়ারি ২০২৫" },
  intro: {
    en: "Please read these terms and conditions carefully before using our website and services. By using our website you are deemed to have agreed to these terms.",
    bn: "আমাদের ওয়েবসাইট ও সেবা ব্যবহার করার আগে অনুগ্রহ করে এই শর্তাবলী মনোযোগ দিয়ে পড়ুন। আমাদের ওয়েবসাইট ব্যবহার করার মাধ্যমে আপনি এই শর্তগুলিতে সম্মত হচ্ছেন বলে বিবেচিত হবে।",
  },
  sections: [
    {
      title: { en: "General Terms", bn: "সাধারণ শর্তাবলী" },
      content: {
        en: "The following general terms apply to the use of all our products and services:\n- Website users must be at least 18 years old.\n- You are obligated to provide correct and truthful information.\n- It is the user's responsibility to protect account security.\n- Copying or using any part of our website without permission is prohibited.\n- We reserve the right to change terms and conditions at any time.\n- Our services apply only within Bangladesh.",
        bn: "আমাদের সকল পণ্য ও সেবা ব্যবহারের ক্ষেত্রে নিম্নলিখিত সাধারণ শর্তাবলী প্রযোজ্য:\n- ব্যবহারকারীর বয়স কমপক্ষে ১৮ বছর হতে হবে।\n- আপনি সঠিক ও সত্য তথ্য প্রদান করতে বাধ্য।\n- অ্যাকাউন্টের নিরাপত্তা রক্ষা করা ব্যবহারকারীর দায়িত্ব।\n- আমাদের ওয়েবসাইটের কোনো অংশ অনুমতি ছাড়া কপি বা ব্যবহার করা নিষিদ্ধ।\n- আমরা যেকোনো সময় শর্তাবলী পরিবর্তন করার অধিকার রাখি।\n- আমাদের সেবা কেবল বাংলাদেশের মধ্যে প্রযোজ্য।",
      },
    },
    {
      title: { en: "Orders & Payment", bn: "অর্ডার ও পেমেন্ট" },
      content: {
        en: "The following terms must be followed for product orders and payments:\n- A confirmation message will be sent after order completion.\n- We will inform in advance about price changes.\n- Orders will not be processed if payment is not successfully completed.\n- Cash on Delivery, bKash, Nagad and card payments are accepted.\n- If stock runs out, an alternative will be proposed or the order will be cancelled.\n- Promotional offers apply for limited time and quantity.",
        bn: "পণ্য অর্ডার ও পেমেন্টের ক্ষেত্রে নিম্নলিখিত শর্তগুলি মেনে চলতে হবে:\n- অর্ডার সম্পন্ন হওয়ার পর একটি নিশ্চিতকরণ বার্তা পাঠানো হবে।\n- পণ্যের মূল্য পরিবর্তনের ক্ষেত্রে আমরা আগে থেকে জানাব।\n- পেমেন্ট সফলভাবে সম্পন্ন না হলে অর্ডার প্রক্রিয়া করা হবে না।\n- ক্যাশ অন ডেলিভারি, বিকাশ, নগদ ও কার্ডের মাধ্যমে পেমেন্ট গ্রহণযোগ্য।\n- পণ্যের স্টক শেষ হলে বিকল্প প্রস্তাব করা হবে।",
      },
    },
    {
      title: { en: "Delivery Policy", bn: "ডেলিভারি নীতি" },
      content: {
        en: "The following rules apply to product delivery:\n- Delivery is usually made across Bangladesh within 3–5 business days.\n- Delivery within 1–2 business days may be possible in nearby districts.\n- Delivery charge is determined according to order amount and location.\n- Free delivery may be available for orders above a certain amount.\n- We will notify in advance of any delays in delivery.",
        bn: "পণ্য ডেলিভারির ক্ষেত্রে নিম্নলিখিত নিয়মগুলি প্রযোজ্য:\n- সারা বাংলাদেশে সাধারণত ৩–৫ কার্যদিবসের মধ্যে ডেলিভারি দেওয়া হয়।\n- আশেপাশের জেলায় ১–২ কার্যদিবসের মধ্যে ডেলিভারি সম্ভব।\n- ডেলিভারি চার্জ অর্ডারের পরিমাণ ও অবস্থান অনুযায়ী নির্ধারিত।",
      },
    },
    {
      title: { en: "Returns & Refunds", bn: "রিটার্ন ও রিফান্ড" },
      content: {
        en: "Customer satisfaction is our primary goal. We follow an easy return and refund policy:\n- Return requests must be made within 7 days of receiving the product.\n- Defective or damaged products will be replaced free of charge.\n- Products must be returned with original packaging.\n- For personal reason returns, delivery charges will be deducted.\n- Refunds will be completed within 7–10 business days.",
        bn: "গ্রাহক সন্তুষ্টি আমাদের প্রধান লক্ষ্য:\n- পণ্য পাওয়ার ৭ দিনের মধ্যে রিটার্নের আবেদন করতে হবে।\n- ত্রুটিপূর্ণ বা ক্ষতিগ্রস্ত পণ্য বিনামূল্যে প্রতিস্থাপন করা হবে।\n- মূল প্যাকেজিংসহ পণ্য ফেরত দিতে হবে।\n- রিফান্ড ৭–১০ কার্যদিবসের মধ্যে সম্পন্ন হবে।",
      },
    },
    {
      title: { en: "Product Quality", bn: "পণ্যের গুণগত মান" },
      content: {
        en: "We are committed to ensuring the supply of the highest quality products:\n- All clothing is collected from verified and trusted sources.\n- The type and size of fabric used in each garment is clearly stated.\n- Completely safe and skin-friendly fabric is used for children's sensitive skin.\n- Accurate information about each product's fabric and care is provided.",
        bn: "আমরা সর্বোচ্চ মানের পণ্য সরবরাহ নিশ্চিত করতে প্রতিশ্রুতিবদ্ধ:\n- সকল পোশাক যাচাইকৃত উৎস থেকে সংগ্রহ করা হয়।\n- প্রতিটি পোশাকে কাপড়ের ধরন ও সাইজ স্পষ্টভাবে উল্লেখ থাকে।\n- শিশুদের সংবেদনশীল ত্বকের জন্য সম্পূর্ণ নিরাপদ ও ত্বক-বান্ধব কাপড় ব্যবহার করা হয়।",
      },
    },
    {
      title: { en: "Liability", bn: "দায়বদ্ধতা" },
      content: {
        en: "Our liability is limited in the following ways:\n- Our products are not a substitute for medical treatment.\n- We are not responsible for personal allergies or reactions.\n- We apologize for service interruptions due to internet connection or technical issues.\n- We are not responsible for third party actions.\n- Our maximum liability is limited to the purchase price of the product.",
        bn: "আমাদের দায়বদ্ধতার সীমা নিম্নলিখিতভাবে নির্ধারিত:\n- আমাদের পণ্য চিকিৎসার বিকল্প নয়।\n- ব্যক্তিগত অ্যালার্জির জন্য আমরা দায়ী নই।\n- প্রযুক্তিগত সমস্যার কারণে সেবায় বিঘ্নের জন্য ক্ষমাপ্রার্থী।\n- তৃতীয় পক্ষের কার্যক্রমের জন্য আমরা দায়ী নই।\n- আমাদের সর্বোচ্চ দায় পণ্যের ক্রয়মূল্যের মধ্যে সীমাবদ্ধ।",
      },
    },
  ],
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

export default async function TermsEditorPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "page_terms" } });
    const data = setting?.value
      ? normalizePolicy(JSON.parse(setting.value), DEFAULT_TERMS)
      : DEFAULT_TERMS;
    return <PolicyPageEditor initialData={data} settingKey="page_terms" pageLabel="Terms & Conditions" />;
  } catch {
    return <PolicyPageEditor initialData={DEFAULT_TERMS} settingKey="page_terms" pageLabel="Terms & Conditions" />;
  }
}
