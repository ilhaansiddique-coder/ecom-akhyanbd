import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual } from "@/lib/bilingual";
import PolicyPageEditor, { type PolicyContent } from "../privacy/PolicyPageEditor";

export const dynamic = "force-dynamic";

const DEFAULT_TERMS: PolicyContent = {
  title: { en: "Terms & Conditions", bn: "à¦¶à¦°à§à¦¤à¦¾à¦¬à¦²à§€" },
  lastUpdated: { en: "January 1, 2025", bn: "à§§ à¦œà¦¾à¦¨à§à¦¯à¦¼à¦¾à¦°à¦¿ à§¨à§¦à§¨à§«" },
  intro: {
    en: "Please read these terms and conditions carefully before using our website and services. By using our website you are deemed to have agreed to these terms.",
    bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦“à¦¯à¦¼à§‡à¦¬à¦¸à¦¾à¦‡à¦Ÿ à¦“ à¦¸à§‡à¦¬à¦¾ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à¦¾à¦° à¦†à¦—à§‡ à¦…à¦¨à§à¦—à§à¦°à¦¹ à¦•à¦°à§‡ à¦à¦‡ à¦¶à¦°à§à¦¤à¦¾à¦¬à¦²à§€ à¦®à¦¨à§‹à¦¯à§‹à¦— à¦¦à¦¿à¦¯à¦¼à§‡ à¦ªà¦¡à¦¼à§à¦¨à¥¤ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦“à¦¯à¦¼à§‡à¦¬à¦¸à¦¾à¦‡à¦Ÿ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à¦¾à¦° à¦®à¦¾à¦§à§à¦¯à¦®à§‡ à¦†à¦ªà¦¨à¦¿ à¦à¦‡ à¦¶à¦°à§à¦¤à¦—à§à¦²à¦¿à¦¤à§‡ à¦¸à¦®à§à¦®à¦¤ à¦¹à¦šà§à¦›à§‡à¦¨ à¦¬à¦²à§‡ à¦¬à¦¿à¦¬à§‡à¦šà¦¿à¦¤ à¦¹à¦¬à§‡à¥¤",
  },
  sections: [
    {
      title: { en: "General Terms", bn: "à¦¸à¦¾à¦§à¦¾à¦°à¦£ à¦¶à¦°à§à¦¤à¦¾à¦¬à¦²à§€" },
      content: {
        en: "The following general terms apply to the use of all our products and services:\n- Website users must be at least 18 years old.\n- You are obligated to provide correct and truthful information.\n- It is the user's responsibility to protect account security.\n- Copying or using any part of our website without permission is prohibited.\n- We reserve the right to change terms and conditions at any time.\n- Our services apply only within Bangladesh.",
        bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¸à¦•à¦² à¦ªà¦£à§à¦¯ à¦“ à¦¸à§‡à¦¬à¦¾ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦°à§‡à¦° à¦•à§à¦·à§‡à¦¤à§à¦°à§‡ à¦¨à¦¿à¦®à§à¦¨à¦²à¦¿à¦–à¦¿à¦¤ à¦¸à¦¾à¦§à¦¾à¦°à¦£ à¦¶à¦°à§à¦¤à¦¾à¦¬à¦²à§€ à¦ªà§à¦°à¦¯à§‹à¦œà§à¦¯:\n- à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦°à¦•à¦¾à¦°à§€à¦° à¦¬à¦¯à¦¼à¦¸ à¦•à¦®à¦ªà¦•à§à¦·à§‡ à§§à§® à¦¬à¦›à¦° à¦¹à¦¤à§‡ à¦¹à¦¬à§‡à¥¤\n- à¦†à¦ªà¦¨à¦¿ à¦¸à¦ à¦¿à¦• à¦“ à¦¸à¦¤à§à¦¯ à¦¤à¦¥à§à¦¯ à¦ªà§à¦°à¦¦à¦¾à¦¨ à¦•à¦°à¦¤à§‡ à¦¬à¦¾à¦§à§à¦¯à¥¤\n- à¦…à§à¦¯à¦¾à¦•à¦¾à¦‰à¦¨à§à¦Ÿà§‡à¦° à¦¨à¦¿à¦°à¦¾à¦ªà¦¤à§à¦¤à¦¾ à¦°à¦•à§à¦·à¦¾ à¦•à¦°à¦¾ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦°à¦•à¦¾à¦°à§€à¦° à¦¦à¦¾à¦¯à¦¼à¦¿à¦¤à§à¦¬à¥¤\n- à¦†à¦®à¦¾à¦¦à§‡à¦° à¦“à¦¯à¦¼à§‡à¦¬à¦¸à¦¾à¦‡à¦Ÿà§‡à¦° à¦•à§‹à¦¨à§‹ à¦…à¦‚à¦¶ à¦…à¦¨à§à¦®à¦¤à¦¿ à¦›à¦¾à¦¡à¦¼à¦¾ à¦•à¦ªà¦¿ à¦¬à¦¾ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à¦¾ à¦¨à¦¿à¦·à¦¿à¦¦à§à¦§à¥¤\n- à¦†à¦®à¦°à¦¾ à¦¯à§‡à¦•à§‹à¦¨à§‹ à¦¸à¦®à¦¯à¦¼ à¦¶à¦°à§à¦¤à¦¾à¦¬à¦²à§€ à¦ªà¦°à¦¿à¦¬à¦°à§à¦¤à¦¨ à¦•à¦°à¦¾à¦° à¦…à¦§à¦¿à¦•à¦¾à¦° à¦°à¦¾à¦–à¦¿à¥¤\n- à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¸à§‡à¦¬à¦¾ à¦•à§‡à¦¬à¦² à¦¬à¦¾à¦‚à¦²à¦¾à¦¦à§‡à¦¶à§‡à¦° à¦®à¦§à§à¦¯à§‡ à¦ªà§à¦°à¦¯à§‹à¦œà§à¦¯à¥¤",
      },
    },
    {
      title: { en: "Orders & Payment", bn: "à¦…à¦°à§à¦¡à¦¾à¦° à¦“ à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ" },
      content: {
        en: "The following terms must be followed for product orders and payments:\n- A confirmation message will be sent after order completion.\n- We will inform in advance about price changes.\n- Orders will not be processed if payment is not successfully completed.\n- Cash on Delivery, bKash, Nagad and card payments are accepted.\n- If stock runs out, an alternative will be proposed or the order will be cancelled.\n- Promotional offers apply for limited time and quantity.",
        bn: "à¦ªà¦£à§à¦¯ à¦…à¦°à§à¦¡à¦¾à¦° à¦“ à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿà§‡à¦° à¦•à§à¦·à§‡à¦¤à§à¦°à§‡ à¦¨à¦¿à¦®à§à¦¨à¦²à¦¿à¦–à¦¿à¦¤ à¦¶à¦°à§à¦¤à¦—à§à¦²à¦¿ à¦®à§‡à¦¨à§‡ à¦šà¦²à¦¤à§‡ à¦¹à¦¬à§‡:\n- à¦…à¦°à§à¦¡à¦¾à¦° à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦¹à¦“à¦¯à¦¼à¦¾à¦° à¦ªà¦° à¦à¦•à¦Ÿà¦¿ à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤à¦•à¦°à¦£ à¦¬à¦¾à¦°à§à¦¤à¦¾ à¦ªà¦¾à¦ à¦¾à¦¨à§‹ à¦¹à¦¬à§‡à¥¤\n- à¦ªà¦£à§à¦¯à§‡à¦° à¦®à§‚à¦²à§à¦¯ à¦ªà¦°à¦¿à¦¬à¦°à§à¦¤à¦¨à§‡à¦° à¦•à§à¦·à§‡à¦¤à§à¦°à§‡ à¦†à¦®à¦°à¦¾ à¦†à¦—à§‡ à¦¥à§‡à¦•à§‡ à¦œà¦¾à¦¨à¦¾à¦¬à¥¤\n- à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦¸à¦«à¦²à¦­à¦¾à¦¬à§‡ à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦¨à¦¾ à¦¹à¦²à§‡ à¦…à¦°à§à¦¡à¦¾à¦° à¦ªà§à¦°à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾ à¦•à¦°à¦¾ à¦¹à¦¬à§‡ à¦¨à¦¾à¥¤\n- à¦•à§à¦¯à¦¾à¦¶ à¦…à¦¨ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿, à¦¬à¦¿à¦•à¦¾à¦¶, à¦¨à¦—à¦¦ à¦“ à¦•à¦¾à¦°à§à¦¡à§‡à¦° à¦®à¦¾à¦§à§à¦¯à¦®à§‡ à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦—à§à¦°à¦¹à¦£à¦¯à§‹à¦—à§à¦¯à¥¤\n- à¦ªà¦£à§à¦¯à§‡à¦° à¦¸à§à¦Ÿà¦• à¦¶à§‡à¦· à¦¹à¦²à§‡ à¦¬à¦¿à¦•à¦²à§à¦ª à¦ªà§à¦°à¦¸à§à¦¤à¦¾à¦¬ à¦•à¦°à¦¾ à¦¹à¦¬à§‡à¥¤",
      },
    },
    {
      title: { en: "Delivery Policy", bn: "à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¨à§€à¦¤à¦¿" },
      content: {
        en: "The following rules apply to product delivery:\n- Delivery is usually made across Bangladesh within 3â€“5 business days.\n- Delivery within 1â€“2 business days may be possible in nearby districts.\n- Delivery charge is determined according to order amount and location.\n- Free delivery may be available for orders above a certain amount.\n- We will notify in advance of any delays in delivery.",
        bn: "à¦ªà¦£à§à¦¯ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿à¦° à¦•à§à¦·à§‡à¦¤à§à¦°à§‡ à¦¨à¦¿à¦®à§à¦¨à¦²à¦¿à¦–à¦¿à¦¤ à¦¨à¦¿à¦¯à¦¼à¦®à¦—à§à¦²à¦¿ à¦ªà§à¦°à¦¯à§‹à¦œà§à¦¯:\n- à¦¸à¦¾à¦°à¦¾ à¦¬à¦¾à¦‚à¦²à¦¾à¦¦à§‡à¦¶à§‡ à¦¸à¦¾à¦§à¦¾à¦°à¦£à¦¤ à§©â€“à§« à¦•à¦¾à¦°à§à¦¯à¦¦à¦¿à¦¬à¦¸à§‡à¦° à¦®à¦§à§à¦¯à§‡ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¦à§‡à¦“à¦¯à¦¼à¦¾ à¦¹à¦¯à¦¼à¥¤\n- à¦†à¦¶à§‡à¦ªà¦¾à¦¶à§‡à¦° à¦œà§‡à¦²à¦¾à¦¯à¦¼ à§§â€“à§¨ à¦•à¦¾à¦°à§à¦¯à¦¦à¦¿à¦¬à¦¸à§‡à¦° à¦®à¦§à§à¦¯à§‡ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¸à¦®à§à¦­à¦¬à¥¤\n- à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦šà¦¾à¦°à§à¦œ à¦…à¦°à§à¦¡à¦¾à¦°à§‡à¦° à¦ªà¦°à¦¿à¦®à¦¾à¦£ à¦“ à¦…à¦¬à¦¸à§à¦¥à¦¾à¦¨ à¦…à¦¨à§à¦¯à¦¾à¦¯à¦¼à§€ à¦¨à¦¿à¦°à§à¦§à¦¾à¦°à¦¿à¦¤à¥¤",
      },
    },
    {
      title: { en: "Returns & Refunds", bn: "à¦°à¦¿à¦Ÿà¦¾à¦°à§à¦¨ à¦“ à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡" },
      content: {
        en: "Customer satisfaction is our primary goal. We follow an easy return and refund policy:\n- Return requests must be made within 7 days of receiving the product.\n- Defective or damaged products will be replaced free of charge.\n- Products must be returned with original packaging.\n- For personal reason returns, delivery charges will be deducted.\n- Refunds will be completed within 7â€“10 business days.",
        bn: "à¦—à§à¦°à¦¾à¦¹à¦• à¦¸à¦¨à§à¦¤à§à¦·à§à¦Ÿà¦¿ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦ªà§à¦°à¦§à¦¾à¦¨ à¦²à¦•à§à¦·à§à¦¯:\n- à¦ªà¦£à§à¦¯ à¦ªà¦¾à¦“à¦¯à¦¼à¦¾à¦° à§­ à¦¦à¦¿à¦¨à§‡à¦° à¦®à¦§à§à¦¯à§‡ à¦°à¦¿à¦Ÿà¦¾à¦°à§à¦¨à§‡à¦° à¦†à¦¬à§‡à¦¦à¦¨ à¦•à¦°à¦¤à§‡ à¦¹à¦¬à§‡à¥¤\n- à¦¤à§à¦°à§à¦Ÿà¦¿à¦ªà§‚à¦°à§à¦£ à¦¬à¦¾ à¦•à§à¦·à¦¤à¦¿à¦—à§à¦°à¦¸à§à¦¤ à¦ªà¦£à§à¦¯ à¦¬à¦¿à¦¨à¦¾à¦®à§‚à¦²à§à¦¯à§‡ à¦ªà§à¦°à¦¤à¦¿à¦¸à§à¦¥à¦¾à¦ªà¦¨ à¦•à¦°à¦¾ à¦¹à¦¬à§‡à¥¤\n- à¦®à§‚à¦² à¦ªà§à¦¯à¦¾à¦•à§‡à¦œà¦¿à¦‚à¦¸à¦¹ à¦ªà¦£à§à¦¯ à¦«à§‡à¦°à¦¤ à¦¦à¦¿à¦¤à§‡ à¦¹à¦¬à§‡à¥¤\n- à¦°à¦¿à¦«à¦¾à¦¨à§à¦¡ à§­â€“à§§à§¦ à¦•à¦¾à¦°à§à¦¯à¦¦à¦¿à¦¬à¦¸à§‡à¦° à¦®à¦§à§à¦¯à§‡ à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦¹à¦¬à§‡à¥¤",
      },
    },
    {
      title: { en: "Product Quality", bn: "à¦ªà¦£à§à¦¯à§‡à¦° à¦—à§à¦£à¦—à¦¤ à¦®à¦¾à¦¨" },
      content: {
        en: "We are committed to ensuring the supply of the highest quality products:\n- All clothing is collected from verified and trusted sources.\n- The type and size of fabric used in each garment is clearly stated.\n- Completely safe and skin-friendly fabric is used for children's sensitive skin.\n- Accurate information about each product's fabric and care is provided.",
        bn: "à¦†à¦®à¦°à¦¾ à¦¸à¦°à§à¦¬à§‹à¦šà§à¦š à¦®à¦¾à¦¨à§‡à¦° à¦ªà¦£à§à¦¯ à¦¸à¦°à¦¬à¦°à¦¾à¦¹ à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤ à¦•à¦°à¦¤à§‡ à¦ªà§à¦°à¦¤à¦¿à¦¶à§à¦°à§à¦¤à¦¿à¦¬à¦¦à§à¦§:\n- à¦¸à¦•à¦² à¦ªà§‹à¦¶à¦¾à¦• à¦¯à¦¾à¦šà¦¾à¦‡à¦•à§ƒà¦¤ à¦‰à§Žà¦¸ à¦¥à§‡à¦•à§‡ à¦¸à¦‚à¦—à§à¦°à¦¹ à¦•à¦°à¦¾ à¦¹à¦¯à¦¼à¥¤\n- à¦ªà§à¦°à¦¤à¦¿à¦Ÿà¦¿ à¦ªà§‹à¦¶à¦¾à¦•à§‡ à¦•à¦¾à¦ªà¦¡à¦¼à§‡à¦° à¦§à¦°à¦¨ à¦“ à¦¸à¦¾à¦‡à¦œ à¦¸à§à¦ªà¦·à§à¦Ÿà¦­à¦¾à¦¬à§‡ à¦‰à¦²à§à¦²à§‡à¦– à¦¥à¦¾à¦•à§‡à¥¤\n- à¦¶à¦¿à¦¶à§à¦¦à§‡à¦° à¦¸à¦‚à¦¬à§‡à¦¦à¦¨à¦¶à§€à¦² à¦¤à§à¦¬à¦•à§‡à¦° à¦œà¦¨à§à¦¯ à¦¸à¦®à§à¦ªà§‚à¦°à§à¦£ à¦¨à¦¿à¦°à¦¾à¦ªà¦¦ à¦“ à¦¤à§à¦¬à¦•-à¦¬à¦¾à¦¨à§à¦§à¦¬ à¦•à¦¾à¦ªà¦¡à¦¼ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à¦¾ à¦¹à¦¯à¦¼à¥¤",
      },
    },
    {
      title: { en: "Liability", bn: "à¦¦à¦¾à¦¯à¦¼à¦¬à¦¦à§à¦§à¦¤à¦¾" },
      content: {
        en: "Our liability is limited in the following ways:\n- Our products are not a substitute for medical treatment.\n- We are not responsible for personal allergies or reactions.\n- We apologize for service interruptions due to internet connection or technical issues.\n- We are not responsible for third party actions.\n- Our maximum liability is limited to the purchase price of the product.",
        bn: "à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¦à¦¾à¦¯à¦¼à¦¬à¦¦à§à¦§à¦¤à¦¾à¦° à¦¸à§€à¦®à¦¾ à¦¨à¦¿à¦®à§à¦¨à¦²à¦¿à¦–à¦¿à¦¤à¦­à¦¾à¦¬à§‡ à¦¨à¦¿à¦°à§à¦§à¦¾à¦°à¦¿à¦¤:\n- à¦†à¦®à¦¾à¦¦à§‡à¦° à¦ªà¦£à§à¦¯ à¦šà¦¿à¦•à¦¿à§Žà¦¸à¦¾à¦° à¦¬à¦¿à¦•à¦²à§à¦ª à¦¨à¦¯à¦¼à¥¤\n- à¦¬à§à¦¯à¦•à§à¦¤à¦¿à¦—à¦¤ à¦…à§à¦¯à¦¾à¦²à¦¾à¦°à§à¦œà¦¿à¦° à¦œà¦¨à§à¦¯ à¦†à¦®à¦°à¦¾ à¦¦à¦¾à¦¯à¦¼à§€ à¦¨à¦‡à¥¤\n- à¦ªà§à¦°à¦¯à§à¦•à§à¦¤à¦¿à¦—à¦¤ à¦¸à¦®à¦¸à§à¦¯à¦¾à¦° à¦•à¦¾à¦°à¦£à§‡ à¦¸à§‡à¦¬à¦¾à¦¯à¦¼ à¦¬à¦¿à¦˜à§à¦¨à§‡à¦° à¦œà¦¨à§à¦¯ à¦•à§à¦·à¦®à¦¾à¦ªà§à¦°à¦¾à¦°à§à¦¥à§€à¥¤\n- à¦¤à§ƒà¦¤à§€à¦¯à¦¼ à¦ªà¦•à§à¦·à§‡à¦° à¦•à¦¾à¦°à§à¦¯à¦•à§à¦°à¦®à§‡à¦° à¦œà¦¨à§à¦¯ à¦†à¦®à¦°à¦¾ à¦¦à¦¾à¦¯à¦¼à§€ à¦¨à¦‡à¥¤\n- à¦†à¦®à¦¾à¦¦à§‡à¦° à¦¸à¦°à§à¦¬à§‹à¦šà§à¦š à¦¦à¦¾à¦¯à¦¼ à¦ªà¦£à§à¦¯à§‡à¦° à¦•à§à¦°à¦¯à¦¼à¦®à§‚à¦²à§à¦¯à§‡à¦° à¦®à¦§à§à¦¯à§‡ à¦¸à§€à¦®à¦¾à¦¬à¦¦à§à¦§à¥¤",
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


