import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getEmailTemplate, getEmailTemplateBool, getEmailTemplateString } from "@/lib/email-templates";

/** Escape HTML to prevent injection in email templates */
function h(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Cache SMTP config for 5 minutes
let cachedConfig: Record<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getSmtpConfig(): Promise<Record<string, string>> {
  if (cachedConfig && Date.now() - cacheTime < CACHE_TTL) return cachedConfig;
  try {
    const settings = await prisma.siteSetting.findMany({
      where: { key: { startsWith: "smtp_" } },
    });
    const config: Record<string, string> = {};
    for (const s of settings) {
      config[s.key] = s.value || "";
    }
    cachedConfig = config;
    cacheTime = Date.now();
    return config;
  } catch {
    return {};
  }
}

// Clear cache (call after settings update)
export function clearSmtpCache() {
  cachedConfig = null;
  cacheTime = 0;
}

async function getTransporter() {
  const db = await getSmtpConfig();
  const host = db.smtp_host || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(db.smtp_port || process.env.SMTP_PORT) || 587;
  const user = db.smtp_user || process.env.SMTP_USER || "";
  const pass = db.smtp_pass || process.env.SMTP_PASS || "";

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function getFrom(): Promise<string> {
  const db = await getSmtpConfig();
  return db.smtp_from || process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";
}

async function getSiteName(): Promise<string> {
  try {
    const s = await prisma.siteSetting.findUnique({ where: { key: "site_name" } });
    return s?.value || "Site";
  } catch {
    return "Site";
  }
}

/**
 * Resolve the public site URL for use in email links.
 *
 * Resolution order:
 *   1. `site_url` row in `site_settings` (admin-editable, no redeploy needed)
 *   2. `NEXT_PUBLIC_SITE_URL` env var (build-time)
 *   3. Empty string — better than emitting `localhost` links into customer
 *      inboxes. Callers should guard against empty and either skip the link
 *      or build a relative one.
 *
 * Trailing slash is stripped so callers can append `/path` safely.
 */
/** True for `http://localhost:*`, `https://localhost:*`, `http://127.0.0.1:*`, etc. */
function isLocalUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?)(:\d+)?(\/|$)/i.test(url);
}

async function getSiteUrl(): Promise<string> {
  // 1. DB-driven (admin-editable, no redeploy)
  try {
    const s = await prisma.siteSetting.findUnique({ where: { key: "site_url" } });
    const fromDb = (s?.value ?? "").trim();
    if (fromDb && !isLocalUrl(fromDb)) {
      return fromDb.replace(/\/+$/, "");
    }
    if (fromDb && isLocalUrl(fromDb)) {
      // Loud warning so the bug is obvious in server logs instead of silently
      // mailing a localhost link to a customer.
      console.warn(
        `[email] site_settings.site_url = "${fromDb}" looks like a local address. ` +
        `Update Settings → Site Settings → site_url to your real domain.`,
      );
    }
  } catch {
    // ignore — fall through to env
  }
  // 2. Env var
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (fromEnv && !isLocalUrl(fromEnv)) {
    return fromEnv.replace(/\/+$/, "");
  }
  if (fromEnv && isLocalUrl(fromEnv)) {
    console.warn(
      `[email] NEXT_PUBLIC_SITE_URL = "${fromEnv}" is local. ` +
      `Set NEXT_PUBLIC_SITE_URL in production env (or add site_url in Site Settings).`,
    );
  }
  // 3. No real URL available — return empty so callers can decide what to do.
  // Localhost fallback intentionally omitted: shipping localhost links to
  // customers' inboxes is worse than no link at all.
  return "";
}

/**
 * Brand context for email templates. Pulls primary color (customizer) +
 * dashboard language so every outgoing email matches the storefront theme
 * + admin's chosen language. One DB hit per email; cached 5min via the
 * SMTP cache (expanded below).
 */
interface EmailBrand {
  primary: string;        // hex, e.g. "#0f5931"
  primaryDark: string;    // for hover/accent borders
  lang: "en" | "bn";
}

let cachedBrand: EmailBrand | null = null;
let brandCacheTime = 0;

async function getEmailBrand(): Promise<EmailBrand> {
  if (cachedBrand && Date.now() - brandCacheTime < CACHE_TTL) return cachedBrand;
  try {
    const rows = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            "theme.color.primary",
            "theme.color.primary_dark",
            "site_language",
            "dashboard_language",
          ],
        },
      },
    });
    const map: Record<string, string> = {};
    for (const r of rows) if (r.value) map[r.key] = r.value;
    const langRaw = (map.dashboard_language || map.site_language || "bn").toLowerCase();
    cachedBrand = {
      primary: map["theme.color.primary"] || "#0f5931",
      primaryDark: map["theme.color.primary_dark"] || "#0a3d22",
      lang: langRaw === "en" ? "en" : "bn",
    };
    brandCacheTime = Date.now();
    return cachedBrand;
  } catch {
    return { primary: "#0f5931", primaryDark: "#0a3d22", lang: "bn" };
  }
}

/** Bust brand cache (call when settings/customizer save). */
export function clearEmailBrandCache() {
  cachedBrand = null;
}

/** Bilingual string picker. */
function tx(en: string, bn: string, lang: "en" | "bn"): string {
  return lang === "en" ? en : bn;
}

async function getAdminEmail(): Promise<string> {
  const db = await getSmtpConfig();
  return db.smtp_admin_email || process.env.ADMIN_EMAIL || await getFrom();
}

export async function sendWelcomeEmail(to: string, name: string) {
  try {
    const transporter = await getTransporter();
    const from = await getFrom();
    const siteName = await getSiteName();
    const siteUrl = await getSiteUrl();
    const brand = await getEmailBrand();
    const lang = brand.lang;

    const tplVars = { site_name: siteName, site_url: siteUrl, customer_name: name, name };
    const subject = await getEmailTemplate(
      "welcome",
      "subject",
      lang,
      tplVars,
      tx("Welcome! Your account is created", "স্বাগতম! আপনার অ্যাকাউন্ট তৈরি হয়েছে", lang),
    );
    const intro = await getEmailTemplate(
      "welcome",
      "intro",
      lang,
      tplVars,
      tx(
        `Welcome to ${siteName}. Browse our products and order what you like.`,
        `${siteName}-এ আপনাকে স্বাগত জানাই। আমাদের পণ্য ব্রাউজ করুন এবং আপনার পছন্দের পণ্য অর্ডার করুন।`,
        lang,
      ),
    );
    const closing = await getEmailTemplate("welcome", "closing", lang, tplVars, "");
    const beforeBlock = await getEmailTemplate("welcome", "before_block", lang, tplVars, "");
    const afterBlock = await getEmailTemplate("welcome", "after_block", lang, tplVars, "");
    const buttonText = await getEmailTemplate("welcome", "button_text", lang, tplVars, "");
    const buttonUrlRaw = await getEmailTemplateString("welcome", "button_url", { site_url: siteUrl }, "");
    const buttonUrl = buttonUrlRaw.trim();
    const showButton =
      buttonText.trim() !== "" && buttonUrl !== "" && !isLocalUrl(buttonUrl);

    await transporter.sendMail({
      from: `"${siteName}" <${from}>`,
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:${brand.primary};color:white;padding:20px;border-radius:12px 12px 0 0">
            <h2 style="margin:0">${tx(`Welcome, ${h(name)}!`, `স্বাগতম, ${h(name)}!`, lang)}</h2>
          </div>
          <div style="padding:20px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;color:#333">
            <p>${h(intro)}</p>
            ${beforeBlock ? `<div>${beforeBlock}</div>` : ""}
            ${afterBlock ? `<div>${afterBlock}</div>` : ""}
            ${showButton ? `<p style="margin-top:16px"><a href="${buttonUrl}" style="display:inline-block;background:${brand.primary};color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold">${h(buttonText)}</a></p>` : ""}
            ${closing ? `<p style="white-space:pre-line;margin-top:16px;color:#444">${h(closing)}</p>` : ""}
          </div>
        </div>
      `,
    });
  } catch {
    // Non-blocking
  }
}

interface OrderEmailData {
  customerName: string;
  orderId: number;
  total: number;
  items: { productName: string; quantity: number; price: number }[];
}

export async function sendAdminOrderNotification(data: OrderEmailData & { phone: string; address: string; city: string; paymentMethod: string; shippingCost: number; orderToken?: string }) {
  try {
    const transporter = await getTransporter();
    const from = await getFrom();
    const adminEmail = await getAdminEmail();
    if (!adminEmail) return;
    const brand = await getEmailBrand();
    const lang = brand.lang;

    const itemsHtml = data.items
      .map((i) => `<tr><td style="padding:8px;border:1px solid #e5e5e5">${h(i.productName)}</td><td style="padding:8px;border:1px solid #e5e5e5;text-align:center">${i.quantity}</td><td style="padding:8px;border:1px solid #e5e5e5;text-align:right">৳${i.price}</td><td style="padding:8px;border:1px solid #e5e5e5;text-align:right">৳${i.price * i.quantity}</td></tr>`)
      .join("");

    const paymentLabels: Record<string, { en: string; bn: string }> = {
      cod: { en: "Cash on Delivery", bn: "ক্যাশ অন ডেলিভারি" },
      bkash: { en: "bKash", bn: "বিকাশ" },
      nagad: { en: "Nagad", bn: "নগদ" },
      bank: { en: "Bank Transfer", bn: "ব্যাংক ট্রান্সফার" },
    };
    const pmLabel = paymentLabels[data.paymentMethod];
    const paymentText = pmLabel ? tx(pmLabel.en, pmLabel.bn, lang) : data.paymentMethod;

    const siteUrl = await getSiteUrl();
    const orderUrl = siteUrl
      ? (data.orderToken ? `${siteUrl}/order/${data.orderToken}` : `${siteUrl}/dashboard/orders`)
      : "";
    const siteName = await getSiteName();

    const tplVars = {
      order_id: data.orderId,
      customer_name: data.customerName,
      total: data.total,
      site_name: siteName,
    };
    // Add site_url to vars for variable substitution in user-edited fields
    const fullTplVars = { ...tplVars, site_url: siteUrl };

    const subject = await getEmailTemplate(
      "admin_order_notification",
      "subject",
      lang,
      fullTplVars,
      tx(
        `🛒 New Order #${data.orderId} — ৳${data.total} — ${data.customerName}`,
        `🛒 নতুন অর্ডার #${data.orderId} — ৳${data.total} — ${data.customerName}`,
        lang,
      ),
    );
    const heading = await getEmailTemplate(
      "admin_order_notification",
      "heading",
      lang,
      fullTplVars,
      tx("New Order Received", "নতুন অর্ডার এসেছে", lang),
    );
    const intro = await getEmailTemplate(
      "admin_order_notification",
      "intro",
      lang,
      fullTplVars,
      tx("A new order has been placed on your store.", "আপনার স্টোরে একটি নতুন অর্ডার এসেছে।", lang),
    );
    const showCustomerInfo = await getEmailTemplateBool(
      "admin_order_notification",
      "show_customer_info",
      true,
    );
    const showItemsTable = await getEmailTemplateBool(
      "admin_order_notification",
      "show_items_table",
      true,
    );
    const beforeBlock = await getEmailTemplate("admin_order_notification", "before_block", lang, fullTplVars, "");
    const afterBlock = await getEmailTemplate("admin_order_notification", "after_block", lang, fullTplVars, "");
    const customButtonText = await getEmailTemplate("admin_order_notification", "button_text", lang, fullTplVars, "");
    const customButtonUrlRaw = await getEmailTemplateString(
      "admin_order_notification",
      "button_url",
      { site_url: siteUrl },
      "",
    );
    const customButtonUrl = customButtonUrlRaw.trim();
    const showCustomButton =
      customButtonText.trim() !== "" && customButtonUrl !== "" && !isLocalUrl(customButtonUrl);

    await transporter.sendMail({
      from: `"${siteName}" <${from}>`,
      to: adminEmail,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:${brand.primary};color:white;padding:20px;border-radius:12px 12px 0 0">
            <h2 style="margin:0">${h(heading)}</h2>
            <p style="margin:4px 0 0;opacity:0.8">${tx("Order", "অর্ডার", lang)} #${data.orderId}</p>
          </div>
          <div style="padding:16px 20px 0;border-left:1px solid #e5e5e5;border-right:1px solid #e5e5e5">
            <p style="margin:0;color:#444">${h(intro)}</p>
          </div>
          <div style="padding:20px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
            ${beforeBlock ? `<div style="margin-bottom:16px">${beforeBlock}</div>` : ""}
            ${showCustomerInfo ? `
            <h3 style="color:${brand.primary};margin-bottom:8px">${tx("Customer Info", "গ্রাহকের তথ্য", lang)}</h3>
            <table style="width:100%;margin-bottom:16px">
              <tr><td style="padding:4px 0;color:#666">${tx("Name:", "নাম:", lang)}</td><td style="padding:4px 0"><strong>${h(data.customerName)}</strong></td></tr>
              <tr><td style="padding:4px 0;color:#666">${tx("Phone:", "ফোন:", lang)}</td><td style="padding:4px 0"><strong>${h(data.phone)}</strong></td></tr>
              <tr><td style="padding:4px 0;color:#666">${tx("Address:", "ঠিকানা:", lang)}</td><td style="padding:4px 0">${h(data.address)}</td></tr>
              <tr><td style="padding:4px 0;color:#666">${tx("City:", "শহর:", lang)}</td><td style="padding:4px 0">${h(data.city)}</td></tr>
              <tr><td style="padding:4px 0;color:#666">${tx("Payment:", "পেমেন্ট:", lang)}</td><td style="padding:4px 0">${h(paymentText)}</td></tr>
            </table>` : ""}
            ${showItemsTable ? `
            <h3 style="color:${brand.primary};margin-bottom:8px">${tx("Items Ordered", "অর্ডারকৃত পণ্য", lang)}</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #e5e5e5;text-align:left">${tx("Product", "পণ্য", lang)}</th><th style="padding:8px;border:1px solid #e5e5e5;text-align:center">${tx("Qty", "পরিমাণ", lang)}</th><th style="padding:8px;border:1px solid #e5e5e5;text-align:right">${tx("Price", "দাম", lang)}</th><th style="padding:8px;border:1px solid #e5e5e5;text-align:right">${tx("Total", "মোট", lang)}</th></tr>
              ${itemsHtml}
            </table>
            <div style="background:#f9f9f9;padding:12px;border-radius:8px;margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#666">${tx("Subtotal:", "সাবটোটাল:", lang)}</span><span>৳${data.total - data.shippingCost}</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#666">${tx("Shipping:", "শিপিং:", lang)}</span><span>৳${data.shippingCost}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:bold;color:${brand.primary};border-top:2px solid ${brand.primary};padding-top:8px;margin-top:8px"><span>${tx("Grand Total:", "সর্বমোট:", lang)}</span><span>৳${data.total}</span></div>
            </div>` : ""}
            ${afterBlock ? `<div style="margin-bottom:16px">${afterBlock}</div>` : ""}
            ${showCustomButton ? `<a href="${customButtonUrl}" style="display:inline-block;background:${brand.primary};color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-right:8px">${h(customButtonText)} →</a>` : ""}
            ${orderUrl ? `<a href="${orderUrl}" style="display:inline-block;background:${brand.primary};color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold">${tx("View Order", "অর্ডার দেখুন", lang)} →</a>` : ""}
          </div>
        </div>
      `,
    });
  } catch {
    // Non-blocking
  }
}

export async function sendOrderConfirmation(to: string, data: OrderEmailData) {
  try {
    const transporter = await getTransporter();
    const from = await getFrom();
    const siteName = await getSiteName();
    const brand = await getEmailBrand();
    const lang = brand.lang;

    const itemsHtml = data.items
      .map((i) => `<tr><td style="padding:8px;border:1px solid #e5e5e5">${h(i.productName)}</td><td style="padding:8px;border:1px solid #e5e5e5;text-align:center">${i.quantity}</td><td style="padding:8px;border:1px solid #e5e5e5;text-align:right">৳${i.price}</td></tr>`)
      .join("");

    await transporter.sendMail({
      from: `"${siteName}" <${from}>`,
      to,
      subject: tx(
        `Order Confirmation #${data.orderId}`,
        `অর্ডার নিশ্চিতকরণ #${data.orderId}`,
        lang,
      ),
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:${brand.primary};color:white;padding:20px;border-radius:12px 12px 0 0">
            <h2 style="margin:0">${tx(`Thank you, ${h(data.customerName)}!`, `ধন্যবাদ, ${h(data.customerName)}!`, lang)}</h2>
            <p style="margin:4px 0 0;opacity:0.9">${tx("Order", "অর্ডার", lang)} #${data.orderId}</p>
          </div>
          <div style="padding:20px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;color:#333">
            <p>${tx(
              `Your order #${data.orderId} has been received successfully.`,
              `আপনার অর্ডার #${data.orderId} সফলভাবে গৃহীত হয়েছে।`,
              lang,
            )}</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #e5e5e5;text-align:left">${tx("Product", "পণ্য", lang)}</th><th style="padding:8px;border:1px solid #e5e5e5;text-align:center">${tx("Qty", "পরিমাণ", lang)}</th><th style="padding:8px;border:1px solid #e5e5e5;text-align:right">${tx("Price", "মূল্য", lang)}</th></tr>
              ${itemsHtml}
            </table>
            <div style="background:#f9f9f9;padding:12px;border-radius:8px;font-size:18px;font-weight:bold;color:${brand.primary};display:flex;justify-content:space-between">
              <span>${tx("Total:", "মোট:", lang)}</span><span>৳${data.total}</span>
            </div>
          </div>
        </div>
      `,
    });
  } catch {
    // Non-blocking
  }
}

export async function sendAdminContactNotification(data: { id: number; name: string; email: string; phone: string; subject: string; message: string }) {
  try {
    const transporter = await getTransporter();
    const from = await getFrom();
    const adminEmail = await getAdminEmail();
    if (!adminEmail) return;
    const siteName = await getSiteName();
    const brand = await getEmailBrand();
    const lang = brand.lang;

    const subjectLabels: Record<string, { en: string; bn: string }> = {
      order:    { en: "Order related",     bn: "অর্ডার সংক্রান্ত" },
      product:  { en: "Product related",   bn: "পণ্য সংক্রান্ত" },
      delivery: { en: "Delivery related",  bn: "ডেলিভারি সংক্রান্ত" },
      refund:   { en: "Refund / Return",   bn: "রিফান্ড/রিটার্ন" },
      other:    { en: "Other",             bn: "অন্যান্য" },
    };
    const subj = subjectLabels[data.subject];
    const subjText = subj ? tx(subj.en, subj.bn, lang) : (data.subject || tx("General", "সাধারণ", lang));

    const siteUrl = await getSiteUrl();
    const tplVars = { name: data.name, site_name: siteName, site_url: siteUrl };
    const subject = await getEmailTemplate(
      "admin_contact_notification",
      "subject",
      lang,
      tplVars,
      tx(
        `📩 New contact #${data.id} — ${data.name} — ${subjText}`,
        `📩 নতুন যোগাযোগ #${data.id} — ${data.name} — ${subjText}`,
        lang,
      ),
    );
    const heading = await getEmailTemplate(
      "admin_contact_notification",
      "heading",
      lang,
      tplVars,
      tx("New Contact Form Submission", "নতুন যোগাযোগ বার্তা", lang),
    );
    const intro = await getEmailTemplate(
      "admin_contact_notification",
      "intro",
      lang,
      tplVars,
      tx("Someone submitted the contact form on your site.", "কেউ আপনার সাইটের যোগাযোগ ফর্ম পূরণ করেছেন।", lang),
    );
    const beforeBlock = await getEmailTemplate("admin_contact_notification", "before_block", lang, tplVars, "");
    const afterBlock = await getEmailTemplate("admin_contact_notification", "after_block", lang, tplVars, "");
    const customButtonText = await getEmailTemplate("admin_contact_notification", "button_text", lang, tplVars, "");
    const customButtonUrlRaw = await getEmailTemplateString(
      "admin_contact_notification",
      "button_url",
      { site_url: siteUrl },
      "",
    );
    const customButtonUrl = customButtonUrlRaw.trim();
    const showCustomButton =
      customButtonText.trim() !== "" && customButtonUrl !== "" && !isLocalUrl(customButtonUrl);

    await transporter.sendMail({
      from: `"${siteName}" <${from}>`,
      to: adminEmail,
      replyTo: data.email,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:${brand.primary};color:white;padding:20px;border-radius:12px 12px 0 0">
            <h2 style="margin:0">${h(heading)}</h2>
            <p style="margin:4px 0 0;opacity:0.8">#${data.id}</p>
          </div>
          <div style="padding:20px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
            <p style="margin:0 0 16px;color:#444">${h(intro)}</p>
            ${beforeBlock ? `<div style="margin-bottom:16px">${beforeBlock}</div>` : ""}
            <table style="width:100%;margin-bottom:16px">
              <tr><td style="padding:6px 0;color:#666;width:100px">${tx("Name:", "নাম:", lang)}</td><td style="padding:6px 0"><strong>${h(data.name)}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#666">${tx("Email:", "ইমেইল:", lang)}</td><td style="padding:6px 0"><a href="mailto:${encodeURIComponent(data.email)}">${h(data.email)}</a></td></tr>
              ${data.phone ? `<tr><td style="padding:6px 0;color:#666">${tx("Phone:", "ফোন:", lang)}</td><td style="padding:6px 0"><a href="tel:${h(data.phone)}">${h(data.phone)}</a></td></tr>` : ""}
              ${data.subject ? `<tr><td style="padding:6px 0;color:#666">${tx("Subject:", "বিষয়:", lang)}</td><td style="padding:6px 0">${h(subjText)}</td></tr>` : ""}
            </table>
            <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin-bottom:16px">
              <p style="margin:0;color:#333;white-space:pre-line">${h(data.message)}</p>
            </div>
            ${afterBlock ? `<div style="margin-bottom:16px">${afterBlock}</div>` : ""}
            ${showCustomButton ? `<a href="${customButtonUrl}" style="display:inline-block;background:${brand.primary};color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-right:8px">${h(customButtonText)} →</a>` : ""}
            <a href="mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent("Re: " + subjText)}" style="display:inline-block;background:${brand.primary};color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold">${tx("Reply", "উত্তর দিন", lang)} →</a>
          </div>
        </div>
      `,
    });
  } catch {
    // Non-blocking
  }
}

export async function sendResetCodeEmail(to: string, code: string) {
  try {
    const transporter = await getTransporter();
    const from = await getFrom();
    const siteName = await getSiteName();
    const brand = await getEmailBrand();
    const lang = brand.lang;

    const subject = tx(
      `Password Reset Code — ${siteName}`,
      `পাসওয়ার্ড রিসেট কোড — ${siteName}`,
      lang,
    );

    await transporter.sendMail({
      from: `"${siteName}" <${from}>`,
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:${brand.primary};color:white;padding:20px;border-radius:12px 12px 0 0">
            <h2 style="margin:0">${tx("Password Reset", "পাসওয়ার্ড রিসেট", lang)}</h2>
          </div>
          <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;color:#333">
            <p>${tx("Use the code below to reset your password. It expires in 30 minutes.", "নিচের কোডটি ব্যবহার করে আপনার পাসওয়ার্ড রিসেট করুন। কোডটি ৩০ মিনিটের মধ্যে মেয়াদ শেষ হবে।", lang)}</p>
            <div style="background:#f5f5f5;border:2px dashed ${brand.primary};border-radius:8px;padding:16px 24px;text-align:center;margin:16px 0">
              <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:${brand.primary}">${code}</span>
            </div>
            <p style="color:#888;font-size:13px">${tx("If you did not request a password reset, ignore this email.", "আপনি যদি পাসওয়ার্ড রিসেটের অনুরোধ না করে থাকেন তাহলে এই ইমেইলটি উপেক্ষা করুন।", lang)}</p>
          </div>
        </div>
      `,
    });
  } catch {
    // Non-blocking
  }
}

export async function testSmtpConnection(config: { host: string; port: number; user: string; pass: string; from: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
    await transporter.verify();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Connection failed" };
  }
}
