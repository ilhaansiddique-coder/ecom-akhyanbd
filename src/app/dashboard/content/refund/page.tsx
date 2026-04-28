import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import PolicyPageEditor, { type PolicyContent } from "../privacy/PolicyPageEditor";

export const dynamic = "force-dynamic";

const DEFAULT_REFUND: PolicyContent = {
  title: { en: "Refund Policy", bn: "রিফান্ড পলিসি" },
  lastUpdated: { en: "January 1, 2025", bn: "১ জানুয়ারি ২০২৫" },
  intro: {
    en: "We give your satisfaction the highest priority. Our refund policy is completely transparent and simple. If you are not satisfied with our products for any reason, follow the guidelines below to apply for a refund or exchange.",
    bn: "আমরা আপনার সন্তুষ্টিকে সর্বোচ্চ অগ্রাধিকার দেই। আমাদের রিফান্ড পলিসি সম্পূর্ণ স্বচ্ছ ও সহজ।",
  },
  sections: [
    {
      title: { en: "Refund Eligibility", bn: "রিফান্ড যোগ্যতা" },
      content: {
        en: "You will be eligible for a refund in the following cases:\n- Wrong product delivered — if a different product was sent instead of the ordered product.\n- Product arrived damaged — if the product was broken or damaged during delivery.\n- Substandard product received — if the product quality does not match the description.\n- Product not received — if delivery shows complete but product was not received.\n\nNote: Refund request must be made within 7 days of receiving the product. Product must be unused and returned with original packaging.",
        bn: "নিম্নলিখিত ক্ষেত্রে আপনি রিফান্ডের জন্য যোগ্য হবেন:\n- ভুল পণ্য ডেলিভারি হলে।\n- পণ্য ক্ষতিগ্রস্ত অবস্থায় পৌঁছালে।\n- মানহীন পণ্য পেলে।\n- মেয়াদ উত্তীর্ণ পণ্য পেলে।\n- পণ্য না পেলে।\n\nদ্রষ্টব্য: পণ্য পাওয়ার ৭ দিনের মধ্যে রিফান্ডের আবেদন করতে হবে।",
      },
    },
    {
      title: { en: "Refund Process", bn: "রিফান্ড প্রক্রিয়া" },
      content: {
        en: "Follow these steps for a refund:\n1. Call the number on our contact page or send an email.\n2. Share your order number, description of the problem and photos (if applicable).\n3. We will review your application within 24 hours and inform you of the decision.\n4. If refund is approved, instructions for returning the product will be given.\n5. After receiving the returned product, the refund process will be completed within the specified time.",
        bn: "রিফান্ডের জন্য নিচের ধাপগুলি অনুসরণ করুন:\n১. আমাদের যোগাযোগ পেজে দেওয়া নম্বরে ফোন করুন অথবা ইমেইল পাঠান।\n২. আপনার অর্ডার নম্বর, সমস্যার বিবরণ এবং সমস্যার ছবি শেয়ার করুন।\n৩. আমরা ২৪ ঘণ্টার মধ্যে আপনার আবেদন পর্যালোচনা করব।\n৪. রিফান্ড অনুমোদন হলে পণ্য ফেরত পাঠানোর নির্দেশনা দেওয়া হবে।\n৫. পণ্য ফেরত পাওয়ার পর নির্ধারিত সময়ের মধ্যে রিফান্ড সম্পন্ন হবে।",
      },
    },
    {
      title: { en: "Refund Timeline", bn: "রিফান্ডের সময়সীমা" },
      content: {
        en: "After refund approval, time depends on payment method:\n- bKash / Nagad / Rocket: 3–5 business days\n- Debit / Credit Card: 7–10 business days\n- Bank Transfer: 7–10 business days\n- Cash on Delivery: 3–7 business days (via bKash)\n\n* Bank holidays are not counted as business days.",
        bn: "রিফান্ড অনুমোদন হওয়ার পর পেমেন্ট মেথড অনুযায়ী সময় লাগবে:\n- বিকাশ / নগদ / রকেট: ৩–৫ কার্যদিবস\n- ডেবিট / ক্রেডিট কার্ড: ৭–১০ কার্যদিবস\n- ব্যাংক ট্রান্সফার: ৭–১০ কার্যদিবস\n- ক্যাশ অন ডেলিভারি: ৩–৭ কার্যদিবস (বিকাশে)\n\n* ব্যাংক ছুটির দিনগুলি কার্যদিবস হিসেবে গণনা করা হয় না।",
      },
    },
    {
      title: { en: "Exchange Policy", bn: "এক্সচেঞ্জ নীতি" },
      content: {
        en: "You can exchange the product instead of a refund. The following rules apply for exchange:\n- Free exchange with a product of the same value.\n- For exchange with a higher-priced product, the price difference must be paid.\n- For exchange with a lower-priced product, the difference will be refunded.\n- For exchange, the product must also be unused with original packaging.\n- A product can be exchanged a maximum of once.",
        bn: "আপনি রিফান্ডের পরিবর্তে পণ্য এক্সচেঞ্জ করতে পারবেন:\n- একই মূল্যের পণ্যের সাথে বিনামূল্যে এক্সচেঞ্জ করা যাবে।\n- বেশি মূল্যের পণ্যের সাথে এক্সচেঞ্জের ক্ষেত্রে মূল্যের পার্থক্য পরিশোধ করতে হবে।\n- কম মূল্যের পণ্যের সাথে এক্সচেঞ্জের ক্ষেত্রে পার্থক্য ফেরত দেওয়া হবে।\n- এক্সচেঞ্জের জন্যও পণ্য মূল প্যাকেজিংসহ অব্যবহৃত থাকতে হবে।\n- একটি পণ্য সর্বোচ্চ একবার এক্সচেঞ্জ করা যাবে।",
      },
    },
    {
      title: { en: "Contact", bn: "যোগাযোগ" },
      content: {
        en: "For any questions about refunds or exchanges, please visit our contact page. We are always ready to resolve your issues quickly. Customer satisfaction is our highest priority.",
        bn: "রিফান্ড বা এক্সচেঞ্জ সংক্রান্ত যেকোনো প্রশ্নের জন্য আমাদের যোগাযোগ পেজ দেখুন। আমরা আপনার সমস্যা দ্রুত সমাধান করতে সর্বদা প্রস্তুত।",
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

export default async function RefundEditorPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "page_refund" } });
    const data = setting?.value
      ? normalizePolicy(JSON.parse(setting.value), DEFAULT_REFUND)
      : DEFAULT_REFUND;
    return <PolicyPageEditor initialData={data} settingKey="page_refund" pageLabel="Refund Policy" />;
  } catch {
    return <PolicyPageEditor initialData={DEFAULT_REFUND} settingKey="page_refund" pageLabel="Refund Policy" />;
  }
}
