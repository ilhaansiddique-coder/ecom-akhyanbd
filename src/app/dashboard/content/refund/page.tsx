import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import PolicyPageEditor, { type PolicyContent } from "../privacy/PolicyPageEditor";

export const dynamic = "force-dynamic";

const DEFAULT_REFUND: PolicyContent = {
  title: { en: "Refund Policy", bn: "à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡ à¦ªà¦²à¦¿à¦¸à¦¿" },
  lastUpdated: { en: "January 1, 2025", bn: "à§§ à¦œà¦¾à¦¨à§à¦¯à¦¼à¦¾à¦°à¦¿ à§¨à§¦à§¨à§«" },
  intro: {
    en: "We give your satisfaction the highest priority. Our refund policy is completely transparent and simple. If you are not satisfied with our products for any reason, follow the guidelines below to apply for a refund or exchange.",
    bn: "à¦†à¦®à¦°à¦¾ à¦†à¦ªà¦¨à¦¾à¦° à¦¸à¦¨à§à¦¤à§à¦·à§à¦Ÿà¦¿à¦•à§‡ à¦¸à¦°à§à¦¬à§‹à¦šà§à¦š à¦…à¦—à§à¦°à¦¾à¦§à¦¿à¦•à¦¾à¦° à¦¦à§‡à¦‡à¥¤ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡ à¦ªà¦²à¦¿à¦¸à¦¿ à¦¸à¦®à§à¦ªà§‚à¦°à§à¦£ à¦¸à§à¦¬à¦šà§à¦› à¦“ à¦¸à¦¹à¦œà¥¤",
  },
  sections: [
    {
      title: { en: "Refund Eligibility", bn: "à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡ à¦¯à§‹à¦—à§à¦¯à¦¤à¦¾" },
      content: {
        en: "You will be eligible for a refund in the following cases:\n- Wrong product delivered â€” if a different product was sent instead of the ordered product.\n- Product arrived damaged â€” if the product was broken or damaged during delivery.\n- Substandard product received â€” if the product quality does not match the description.\n- Product not received â€” if delivery shows complete but product was not received.\n\nNote: Refund request must be made within 7 days of receiving the product. Product must be unused and returned with original packaging.",
        bn: "à¦¨à¦¿à¦®à§à¦¨à¦²à¦¿à¦–à¦¿à¦¤ à¦•à§à¦·à§‡à¦¤à§à¦°à§‡ à¦†à¦ªà¦¨à¦¿ à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡à§‡à¦° à¦œà¦¨à§à¦¯ à¦¯à§‹à¦—à§à¦¯ à¦¹à¦¬à§‡à¦¨:\n- à¦­à§à¦² à¦ªà¦£à§à¦¯ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¹à¦²à§‡à¥¤\n- à¦ªà¦£à§à¦¯ à¦•à§à¦·à¦¤à¦¿à¦—à§à¦°à¦¸à§à¦¤ à¦…à¦¬à¦¸à§à¦¥à¦¾à¦¯à¦¼ à¦ªà§Œà¦à¦›à¦¾à¦²à§‡à¥¤\n- à¦®à¦¾à¦¨à¦¹à§€à¦¨ à¦ªà¦£à§à¦¯ à¦ªà§‡à¦²à§‡à¥¤\n- à¦®à§‡à¦¯à¦¼à¦¾à¦¦ à¦‰à¦¤à§à¦¤à§€à¦°à§à¦£ à¦ªà¦£à§à¦¯ à¦ªà§‡à¦²à§‡à¥¤\n- à¦ªà¦£à§à¦¯ à¦¨à¦¾ à¦ªà§‡à¦²à§‡à¥¤\n\nà¦¦à§à¦°à¦·à§à¦Ÿà¦¬à§à¦¯: à¦ªà¦£à§à¦¯ à¦ªà¦¾à¦“à¦¯à¦¼à¦¾à¦° à§­ à¦¦à¦¿à¦¨à§‡à¦° à¦®à¦§à§à¦¯à§‡ à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡à§‡à¦° à¦†à¦¬à§‡à¦¦à¦¨ à¦•à¦°à¦¤à§‡ à¦¹à¦¬à§‡à¥¤",
      },
    },
    {
      title: { en: "Refund Process", bn: "à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡ à¦ªà§à¦°à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾" },
      content: {
        en: "Follow these steps for a refund:\n1. Call the number on our contact page or send an email.\n2. Share your order number, description of the problem and photos (if applicable).\n3. We will review your application within 24 hours and inform you of the decision.\n4. If refund is approved, instructions for returning the product will be given.\n5. After receiving the returned product, the refund process will be completed within the specified time.",
        bn: "à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡à§‡à¦° à¦œà¦¨à§à¦¯ à¦¨à¦¿à¦šà§‡à¦° à¦§à¦¾à¦ªà¦—à§à¦²à¦¿ à¦…à¦¨à§à¦¸à¦°à¦£ à¦•à¦°à§à¦¨:\nà§§. à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦— à¦ªà§‡à¦œà§‡ à¦¦à§‡à¦“à¦¯à¦¼à¦¾ à¦¨à¦®à§à¦¬à¦°à§‡ à¦«à§‹à¦¨ à¦•à¦°à§à¦¨ à¦…à¦¥à¦¬à¦¾ à¦‡à¦®à§‡à¦‡à¦² à¦ªà¦¾à¦ à¦¾à¦¨à¥¤\nà§¨. à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦° à¦¨à¦®à§à¦¬à¦°, à¦¸à¦®à¦¸à§à¦¯à¦¾à¦° à¦¬à¦¿à¦¬à¦°à¦£ à¦à¦¬à¦‚ à¦¸à¦®à¦¸à§à¦¯à¦¾à¦° à¦›à¦¬à¦¿ à¦¶à§‡à¦¯à¦¼à¦¾à¦° à¦•à¦°à§à¦¨à¥¤\nà§©. à¦†à¦®à¦°à¦¾ à§¨à§ª à¦˜à¦£à§à¦Ÿà¦¾à¦° à¦®à¦§à§à¦¯à§‡ à¦†à¦ªà¦¨à¦¾à¦° à¦†à¦¬à§‡à¦¦à¦¨ à¦ªà¦°à§à¦¯à¦¾à¦²à§‹à¦šà¦¨à¦¾ à¦•à¦°à¦¬à¥¤\nà§ª. à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡ à¦…à¦¨à§à¦®à§‹à¦¦à¦¨ à¦¹à¦²à§‡ à¦ªà¦£à§à¦¯ à¦«à§‡à¦°à¦¤ à¦ªà¦¾à¦ à¦¾à¦¨à§‹à¦° à¦¨à¦¿à¦°à§à¦¦à§‡à¦¶à¦¨à¦¾ à¦¦à§‡à¦“à¦¯à¦¼à¦¾ à¦¹à¦¬à§‡à¥¤\nà§«. à¦ªà¦£à§à¦¯ à¦«à§‡à¦°à¦¤ à¦ªà¦¾à¦“à¦¯à¦¼à¦¾à¦° à¦ªà¦° à¦¨à¦¿à¦°à§à¦§à¦¾à¦°à¦¿à¦¤ à¦¸à¦®à¦¯à¦¼à§‡à¦° à¦®à¦§à§à¦¯à§‡ à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡ à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦¹à¦¬à§‡à¥¤",
      },
    },
    {
      title: { en: "Refund Timeline", bn: "à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡à§‡à¦° à¦¸à¦®à¦¯à¦¼à¦¸à§€à¦®à¦¾" },
      content: {
        en: "After refund approval, time depends on payment method:\n- bKash / Nagad / Rocket: 3â€“5 business days\n- Debit / Credit Card: 7â€“10 business days\n- Bank Transfer: 7â€“10 business days\n- Cash on Delivery: 3â€“7 business days (via bKash)\n\n* Bank holidays are not counted as business days.",
        bn: "à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡ à¦…à¦¨à§à¦®à§‹à¦¦à¦¨ à¦¹à¦“à¦¯à¦¼à¦¾à¦° à¦ªà¦° à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦®à§‡à¦¥à¦¡ à¦…à¦¨à§à¦¯à¦¾à¦¯à¦¼à§€ à¦¸à¦®à¦¯à¦¼ à¦²à¦¾à¦—à¦¬à§‡:\n- à¦¬à¦¿à¦•à¦¾à¦¶ / à¦¨à¦—à¦¦ / à¦°à¦•à§‡à¦Ÿ: à§©â€“à§« à¦•à¦¾à¦°à§à¦¯à¦¦à¦¿à¦¬à¦¸\n- à¦¡à§‡à¦¬à¦¿à¦Ÿ / à¦•à§à¦°à§‡à¦¡à¦¿à¦Ÿ à¦•à¦¾à¦°à§à¦¡: à§­â€“à§§à§¦ à¦•à¦¾à¦°à§à¦¯à¦¦à¦¿à¦¬à¦¸\n- à¦¬à§à¦¯à¦¾à¦‚à¦• à¦Ÿà§à¦°à¦¾à¦¨à§à¦¸à¦«à¦¾à¦°: à§­â€“à§§à§¦ à¦•à¦¾à¦°à§à¦¯à¦¦à¦¿à¦¬à¦¸\n- à¦•à§à¦¯à¦¾à¦¶ à¦…à¦¨ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿: à§©â€“à§­ à¦•à¦¾à¦°à§à¦¯à¦¦à¦¿à¦¬à¦¸ (à¦¬à¦¿à¦•à¦¾à¦¶à§‡)\n\n* à¦¬à§à¦¯à¦¾à¦‚à¦• à¦›à§à¦Ÿà¦¿à¦° à¦¦à¦¿à¦¨à¦—à§à¦²à¦¿ à¦•à¦¾à¦°à§à¦¯à¦¦à¦¿à¦¬à¦¸ à¦¹à¦¿à¦¸à§‡à¦¬à§‡ à¦—à¦£à¦¨à¦¾ à¦•à¦°à¦¾ à¦¹à¦¯à¦¼ à¦¨à¦¾à¥¤",
      },
    },
    {
      title: { en: "Exchange Policy", bn: "à¦à¦•à§à¦¸à¦šà§‡à¦žà§à¦œ à¦¨à§€à¦¤à¦¿" },
      content: {
        en: "You can exchange the product instead of a refund. The following rules apply for exchange:\n- Free exchange with a product of the same value.\n- For exchange with a higher-priced product, the price difference must be paid.\n- For exchange with a lower-priced product, the difference will be refunded.\n- For exchange, the product must also be unused with original packaging.\n- A product can be exchanged a maximum of once.",
        bn: "à¦†à¦ªà¦¨à¦¿ à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡à§‡à¦° à¦ªà¦°à¦¿à¦¬à¦°à§à¦¤à§‡ à¦ªà¦£à§à¦¯ à¦à¦•à§à¦¸à¦šà§‡à¦žà§à¦œ à¦•à¦°à¦¤à§‡ à¦ªà¦¾à¦°à¦¬à§‡à¦¨:\n- à¦à¦•à¦‡ à¦®à§‚à¦²à§à¦¯à§‡à¦° à¦ªà¦£à§à¦¯à§‡à¦° à¦¸à¦¾à¦¥à§‡ à¦¬à¦¿à¦¨à¦¾à¦®à§‚à¦²à§à¦¯à§‡ à¦à¦•à§à¦¸à¦šà§‡à¦žà§à¦œ à¦•à¦°à¦¾ à¦¯à¦¾à¦¬à§‡à¥¤\n- à¦¬à§‡à¦¶à¦¿ à¦®à§‚à¦²à§à¦¯à§‡à¦° à¦ªà¦£à§à¦¯à§‡à¦° à¦¸à¦¾à¦¥à§‡ à¦à¦•à§à¦¸à¦šà§‡à¦žà§à¦œà§‡à¦° à¦•à§à¦·à§‡à¦¤à§à¦°à§‡ à¦®à§‚à¦²à§à¦¯à§‡à¦° à¦ªà¦¾à¦°à§à¦¥à¦•à§à¦¯ à¦ªà¦°à¦¿à¦¶à§‹à¦§ à¦•à¦°à¦¤à§‡ à¦¹à¦¬à§‡à¥¤\n- à¦•à¦® à¦®à§‚à¦²à§à¦¯à§‡à¦° à¦ªà¦£à§à¦¯à§‡à¦° à¦¸à¦¾à¦¥à§‡ à¦à¦•à§à¦¸à¦šà§‡à¦žà§à¦œà§‡à¦° à¦•à§à¦·à§‡à¦¤à§à¦°à§‡ à¦ªà¦¾à¦°à§à¦¥à¦•à§à¦¯ à¦«à§‡à¦°à¦¤ à¦¦à§‡à¦“à¦¯à¦¼à¦¾ à¦¹à¦¬à§‡à¥¤\n- à¦à¦•à§à¦¸à¦šà§‡à¦žà§à¦œà§‡à¦° à¦œà¦¨à§à¦¯à¦“ à¦ªà¦£à§à¦¯ à¦®à§‚à¦² à¦ªà§à¦¯à¦¾à¦•à§‡à¦œà¦¿à¦‚à¦¸à¦¹ à¦…à¦¬à§à¦¯à¦¬à¦¹à§ƒà¦¤ à¦¥à¦¾à¦•à¦¤à§‡ à¦¹à¦¬à§‡à¥¤\n- à¦à¦•à¦Ÿà¦¿ à¦ªà¦£à§à¦¯ à¦¸à¦°à§à¦¬à§‹à¦šà§à¦š à¦à¦•à¦¬à¦¾à¦° à¦à¦•à§à¦¸à¦šà§‡à¦žà§à¦œ à¦•à¦°à¦¾ à¦¯à¦¾à¦¬à§‡à¥¤",
      },
    },
    {
      title: { en: "Contact", bn: "à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦—" },
      content: {
        en: "For any questions about refunds or exchanges, please visit our contact page. We are always ready to resolve your issues quickly. Customer satisfaction is our highest priority.",
        bn: "à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡ à¦¬à¦¾ à¦à¦•à§à¦¸à¦šà§‡à¦žà§à¦œ à¦¸à¦‚à¦•à§à¦°à¦¾à¦¨à§à¦¤ à¦¯à§‡à¦•à§‹à¦¨à§‹ à¦ªà§à¦°à¦¶à§à¦¨à§‡à¦° à¦œà¦¨à§à¦¯ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦— à¦ªà§‡à¦œ à¦¦à§‡à¦–à§à¦¨à¥¤ à¦†à¦®à¦°à¦¾ à¦†à¦ªà¦¨à¦¾à¦° à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¦à§à¦°à§à¦¤ à¦¸à¦®à¦¾à¦§à¦¾à¦¨ à¦•à¦°à¦¤à§‡ à¦¸à¦°à§à¦¬à¦¦à¦¾ à¦ªà§à¦°à¦¸à§à¦¤à§à¦¤à¥¤",
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


