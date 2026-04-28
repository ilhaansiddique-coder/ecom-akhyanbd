import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual, type Bilingual } from "@/lib/bilingual";
import EmailTemplatesEditor, { type EmailTemplates } from "./EmailTemplatesEditor";

export const dynamic = "force-dynamic";

const EMPTY_BI: Bilingual = { en: "", bn: "" };

const DEFAULT_TEMPLATES: EmailTemplates = {
  welcome: {
    subject: { en: "Welcome! Your account is created", bn: "স্বাগতম! আপনার অ্যাকাউন্ট তৈরি হয়েছে" },
    intro: {
      en: "Welcome to {{site_name}}. Browse our products and order what you like.",
      bn: "{{site_name}}-এ আপনাকে স্বাগত জানাই। আমাদের পণ্য ব্রাউজ করুন এবং আপনার পছন্দের পণ্য অর্ডার করুন।",
    },
    button_text: { en: "Start Shopping", bn: "এখনই শপিং শুরু করুন" },
    button_url: "",
    closing: { en: "Thanks,\n{{site_name}}", bn: "ধন্যবাদ,\n{{site_name}}" },
    before_block: { ...EMPTY_BI },
    after_block: { ...EMPTY_BI },
  },
  order_confirmation: {
    subject: { en: "Order Confirmation #{{order_id}}", bn: "অর্ডার নিশ্চিতকরণ #{{order_id}}" },
    heading: { en: "Thank you, {{customer_name}}!", bn: "ধন্যবাদ, {{customer_name}}!" },
    intro: {
      en: "Your order #{{order_id}} has been received successfully.",
      bn: "আপনার অর্ডার #{{order_id}} সফলভাবে গৃহীত হয়েছে।",
    },
    closing: {
      en: "We will process your order shortly and notify you about the delivery.",
      bn: "আমরা শীঘ্রই আপনার অর্ডার প্রসেস করব এবং ডেলিভারি সম্পর্কে আপনাকে জানাব।",
    },
    show_customer_info: true,
    show_items_table: true,
    show_totals: true,
    show_track_button: true,
    track_button_text: { en: "Track Your Order", bn: "আপনার অর্ডার ট্র্যাক করুন" },
    before_block: { ...EMPTY_BI },
    after_block: { ...EMPTY_BI },
  },
  password_reset: {
    subject: { en: "Your Password Reset Code", bn: "আপনার পাসওয়ার্ড রিসেট কোড" },
    heading: { en: "Password Reset", bn: "পাসওয়ার্ড রিসেট" },
    intro: {
      en: "Use the code below to reset your password.",
      bn: "আপনার পাসওয়ার্ড রিসেট করার জন্য নিচে একটি কোড দেওয়া হলো।",
    },
    footer: {
      en: "If you didn't request this, you can safely ignore this email.",
      bn: "যদি আপনি পাসওয়ার্ড রিসেট করার অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন।",
    },
    button_text: { ...EMPTY_BI },
    button_url: "",
    before_block: { ...EMPTY_BI },
    after_block: { ...EMPTY_BI },
  },
  admin_order_notification: {
    subject: {
      en: "🛒 New Order #{{order_id}} — ৳{{total}} — {{customer_name}}",
      bn: "🛒 নতুন অর্ডার #{{order_id}} — ৳{{total}} — {{customer_name}}",
    },
    heading: { en: "New Order Received", bn: "নতুন অর্ডার এসেছে" },
    intro: {
      en: "A new order has been placed on your store.",
      bn: "আপনার স্টোরে একটি নতুন অর্ডার এসেছে।",
    },
    show_customer_info: true,
    show_items_table: true,
    button_text: { ...EMPTY_BI },
    button_url: "",
    before_block: { ...EMPTY_BI },
    after_block: { ...EMPTY_BI },
  },
  admin_contact_notification: {
    subject: {
      en: "📬 New Contact Form Submission from {{name}}",
      bn: "📬 নতুন যোগাযোগ ফর্ম জমা — {{name}}",
    },
    heading: { en: "New Contact Form Submission", bn: "নতুন যোগাযোগ বার্তা" },
    intro: {
      en: "Someone submitted the contact form on your site.",
      bn: "কেউ আপনার সাইটের যোগাযোগ ফর্ম পূরণ করেছেন।",
    },
    button_text: { ...EMPTY_BI },
    button_url: "",
    before_block: { ...EMPTY_BI },
    after_block: { ...EMPTY_BI },
  },
};

/** Lift any field that may be a plain string (legacy) into a Bilingual {en,bn}. */
function bi(raw: unknown, fallback: Bilingual): Bilingual {
  if (raw == null) return fallback;
  return toBilingual(raw);
}

/** Coerce stored value into a boolean, treating undefined/null as fallback. */
function toBool(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no" || s === "") return false;
  }
  return fallback;
}

/** Coerce stored value into a plain string. */
function toStr(raw: unknown, fallback: string = ""): string {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === "string") return raw;
  return String(raw);
}

function normalize(raw: unknown): EmailTemplates {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, Record<string, unknown>>;
  const w = r.welcome ?? {};
  const oc = r.order_confirmation ?? {};
  const pr = r.password_reset ?? {};
  const ao = r.admin_order_notification ?? {};
  const ac = r.admin_contact_notification ?? {};
  const d = DEFAULT_TEMPLATES;
  return {
    welcome: {
      subject: bi(w.subject, d.welcome.subject),
      intro: bi(w.intro, d.welcome.intro),
      button_text: bi(w.button_text, d.welcome.button_text),
      button_url: toStr(w.button_url, d.welcome.button_url),
      closing: bi(w.closing, d.welcome.closing),
      before_block: bi(w.before_block, d.welcome.before_block),
      after_block: bi(w.after_block, d.welcome.after_block),
    },
    order_confirmation: {
      subject: bi(oc.subject, d.order_confirmation.subject),
      heading: bi(oc.heading, d.order_confirmation.heading),
      intro: bi(oc.intro, d.order_confirmation.intro),
      closing: bi(oc.closing, d.order_confirmation.closing),
      show_customer_info: toBool(oc.show_customer_info, d.order_confirmation.show_customer_info),
      show_items_table: toBool(oc.show_items_table, d.order_confirmation.show_items_table),
      show_totals: toBool(oc.show_totals, d.order_confirmation.show_totals),
      show_track_button: toBool(oc.show_track_button, d.order_confirmation.show_track_button),
      track_button_text: bi(oc.track_button_text, d.order_confirmation.track_button_text),
      before_block: bi(oc.before_block, d.order_confirmation.before_block),
      after_block: bi(oc.after_block, d.order_confirmation.after_block),
    },
    password_reset: {
      subject: bi(pr.subject, d.password_reset.subject),
      heading: bi(pr.heading, d.password_reset.heading),
      intro: bi(pr.intro, d.password_reset.intro),
      footer: bi(pr.footer, d.password_reset.footer),
      button_text: bi(pr.button_text, d.password_reset.button_text),
      button_url: toStr(pr.button_url, d.password_reset.button_url),
      before_block: bi(pr.before_block, d.password_reset.before_block),
      after_block: bi(pr.after_block, d.password_reset.after_block),
    },
    admin_order_notification: {
      subject: bi(ao.subject, d.admin_order_notification.subject),
      heading: bi(ao.heading, d.admin_order_notification.heading),
      intro: bi(ao.intro, d.admin_order_notification.intro),
      show_customer_info: toBool(ao.show_customer_info, d.admin_order_notification.show_customer_info),
      show_items_table: toBool(ao.show_items_table, d.admin_order_notification.show_items_table),
      button_text: bi(ao.button_text, d.admin_order_notification.button_text),
      button_url: toStr(ao.button_url, d.admin_order_notification.button_url),
      before_block: bi(ao.before_block, d.admin_order_notification.before_block),
      after_block: bi(ao.after_block, d.admin_order_notification.after_block),
    },
    admin_contact_notification: {
      subject: bi(ac.subject, d.admin_contact_notification.subject),
      heading: bi(ac.heading, d.admin_contact_notification.heading),
      intro: bi(ac.intro, d.admin_contact_notification.intro),
      button_text: bi(ac.button_text, d.admin_contact_notification.button_text),
      button_url: toStr(ac.button_url, d.admin_contact_notification.button_url),
      before_block: bi(ac.before_block, d.admin_contact_notification.before_block),
      after_block: bi(ac.after_block, d.admin_contact_notification.after_block),
    },
  };
}

export default async function EmailTemplatesEditorPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  let data: EmailTemplates = DEFAULT_TEMPLATES;
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "email_templates" } });
    if (setting?.value) {
      data = normalize(JSON.parse(setting.value));
    }
  } catch {
    /* fall through to defaults */
  }
  return <EmailTemplatesEditor initialData={data} />;
}
