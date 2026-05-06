import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toBilingual, type Bilingual } from "@/lib/bilingual";
import EmailTemplatesEditor, { type EmailTemplates } from "./EmailTemplatesEditor";

export const dynamic = "force-dynamic";

const EMPTY_BI: Bilingual = { en: "", bn: "" };

const DEFAULT_TEMPLATES: EmailTemplates = {
  welcome: {
    subject: { en: "Welcome! Your account is created", bn: "à¦¸à§à¦¬à¦¾à¦—à¦¤à¦®! à¦†à¦ªà¦¨à¦¾à¦° à¦…à§à¦¯à¦¾à¦•à¦¾à¦‰à¦¨à§à¦Ÿ à¦¤à§ˆà¦°à¦¿ à¦¹à¦¯à¦¼à§‡à¦›à§‡" },
    intro: {
      en: "Welcome to {{site_name}}. Browse our products and order what you like.",
      bn: "{{site_name}}-à¦ à¦†à¦ªà¦¨à¦¾à¦•à§‡ à¦¸à§à¦¬à¦¾à¦—à¦¤ à¦œà¦¾à¦¨à¦¾à¦‡à¥¤ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦ªà¦£à§à¦¯ à¦¬à§à¦°à¦¾à¦‰à¦œ à¦•à¦°à§à¦¨ à¦à¦¬à¦‚ à¦†à¦ªà¦¨à¦¾à¦° à¦ªà¦›à¦¨à§à¦¦à§‡à¦° à¦ªà¦£à§à¦¯ à¦…à¦°à§à¦¡à¦¾à¦° à¦•à¦°à§à¦¨à¥¤",
    },
    button_text: { en: "Start Shopping", bn: "à¦à¦–à¦¨à¦‡ à¦¶à¦ªà¦¿à¦‚ à¦¶à§à¦°à§ à¦•à¦°à§à¦¨" },
    button_url: "",
    closing: { en: "Thanks,\n{{site_name}}", bn: "à¦§à¦¨à§à¦¯à¦¬à¦¾à¦¦,\n{{site_name}}" },
    before_block: { ...EMPTY_BI },
    after_block: { ...EMPTY_BI },
  },
  order_confirmation: {
    subject: { en: "Order Confirmation #{{order_id}}", bn: "à¦…à¦°à§à¦¡à¦¾à¦° à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤à¦•à¦°à¦£ #{{order_id}}" },
    heading: { en: "Thank you, {{customer_name}}!", bn: "à¦§à¦¨à§à¦¯à¦¬à¦¾à¦¦, {{customer_name}}!" },
    intro: {
      en: "Your order #{{order_id}} has been received successfully.",
      bn: "à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦° #{{order_id}} à¦¸à¦«à¦²à¦­à¦¾à¦¬à§‡ à¦—à§ƒà¦¹à§€à¦¤ à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤",
    },
    closing: {
      en: "We will process your order shortly and notify you about the delivery.",
      bn: "à¦†à¦®à¦°à¦¾ à¦¶à§€à¦˜à§à¦°à¦‡ à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦° à¦ªà§à¦°à¦¸à§‡à¦¸ à¦•à¦°à¦¬ à¦à¦¬à¦‚ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¸à¦®à§à¦ªà¦°à§à¦•à§‡ à¦†à¦ªà¦¨à¦¾à¦•à§‡ à¦œà¦¾à¦¨à¦¾à¦¬à¥¤",
    },
    show_customer_info: true,
    show_items_table: true,
    show_totals: true,
    show_track_button: true,
    track_button_text: { en: "Track Your Order", bn: "à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦° à¦Ÿà§à¦°à§à¦¯à¦¾à¦• à¦•à¦°à§à¦¨" },
    before_block: { ...EMPTY_BI },
    after_block: { ...EMPTY_BI },
  },
  password_reset: {
    subject: { en: "Your Password Reset Code", bn: "à¦†à¦ªà¦¨à¦¾à¦° à¦ªà¦¾à¦¸à¦“à¦¯à¦¼à¦¾à¦°à§à¦¡ à¦°à¦¿à¦¸à§‡à¦Ÿ à¦•à§‹à¦¡" },
    heading: { en: "Password Reset", bn: "à¦ªà¦¾à¦¸à¦“à¦¯à¦¼à¦¾à¦°à§à¦¡ à¦°à¦¿à¦¸à§‡à¦Ÿ" },
    intro: {
      en: "Use the code below to reset your password.",
      bn: "à¦†à¦ªà¦¨à¦¾à¦° à¦ªà¦¾à¦¸à¦“à¦¯à¦¼à¦¾à¦°à§à¦¡ à¦°à¦¿à¦¸à§‡à¦Ÿ à¦•à¦°à¦¾à¦° à¦œà¦¨à§à¦¯ à¦¨à¦¿à¦šà§‡ à¦à¦•à¦Ÿà¦¿ à¦•à§‹à¦¡ à¦¦à§‡à¦“à¦¯à¦¼à¦¾ à¦¹à¦²à§‹à¥¤",
    },
    footer: {
      en: "If you didn't request this, you can safely ignore this email.",
      bn: "à¦¯à¦¦à¦¿ à¦†à¦ªà¦¨à¦¿ à¦ªà¦¾à¦¸à¦“à¦¯à¦¼à¦¾à¦°à§à¦¡ à¦°à¦¿à¦¸à§‡à¦Ÿ à¦•à¦°à¦¾à¦° à¦…à¦¨à§à¦°à§‹à¦§ à¦¨à¦¾ à¦•à¦°à§‡ à¦¥à¦¾à¦•à§‡à¦¨, à¦¤à¦¾à¦¹à¦²à§‡ à¦à¦‡ à¦‡à¦®à§‡à¦‡à¦²à¦Ÿà¦¿ à¦‰à¦ªà§‡à¦•à§à¦·à¦¾ à¦•à¦°à§à¦¨à¥¤",
    },
    button_text: { ...EMPTY_BI },
    button_url: "",
    before_block: { ...EMPTY_BI },
    after_block: { ...EMPTY_BI },
  },
  admin_order_notification: {
    subject: {
      en: "ðŸ›’ New Order #{{order_id}} â€” à§³{{total}} â€” {{customer_name}}",
      bn: "ðŸ›’ à¦¨à¦¤à§à¦¨ à¦…à¦°à§à¦¡à¦¾à¦° #{{order_id}} â€” à§³{{total}} â€” {{customer_name}}",
    },
    heading: { en: "New Order Received", bn: "à¦¨à¦¤à§à¦¨ à¦…à¦°à§à¦¡à¦¾à¦° à¦à¦¸à§‡à¦›à§‡" },
    intro: {
      en: "A new order has been placed on your store.",
      bn: "à¦†à¦ªà¦¨à¦¾à¦° à¦¸à§à¦Ÿà§‹à¦°à§‡ à¦à¦•à¦Ÿà¦¿ à¦¨à¦¤à§à¦¨ à¦…à¦°à§à¦¡à¦¾à¦° à¦à¦¸à§‡à¦›à§‡à¥¤",
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
      en: "ðŸ“¬ New Contact Form Submission from {{name}}",
      bn: "ðŸ“¬ à¦¨à¦¤à§à¦¨ à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦— à¦«à¦°à§à¦® à¦œà¦®à¦¾ â€” {{name}}",
    },
    heading: { en: "New Contact Form Submission", bn: "à¦¨à¦¤à§à¦¨ à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦— à¦¬à¦¾à¦°à§à¦¤à¦¾" },
    intro: {
      en: "Someone submitted the contact form on your site.",
      bn: "à¦•à§‡à¦‰ à¦†à¦ªà¦¨à¦¾à¦° à¦¸à¦¾à¦‡à¦Ÿà§‡à¦° à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦— à¦«à¦°à§à¦® à¦ªà§‚à¦°à¦£ à¦•à¦°à§‡à¦›à§‡à¦¨à¥¤",
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


