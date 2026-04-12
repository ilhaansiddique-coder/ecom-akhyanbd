import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

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
  return db.smtp_from || process.env.SMTP_FROM || process.env.SMTP_USER || "info@mavesoj.com";
}

async function getAdminEmail(): Promise<string> {
  const db = await getSmtpConfig();
  return db.smtp_admin_email || process.env.ADMIN_EMAIL || await getFrom();
}

export async function sendWelcomeEmail(to: string, name: string) {
  try {
    const transporter = await getTransporter();
    const from = await getFrom();
    await transporter.sendMail({
      from: `"মা ভেষজ বাণিজ্যালয়" <${from}>`,
      to,
      subject: "স্বাগতম! আপনার অ্যাকাউন্ট তৈরি হয়েছে",
      html: `
        <h2>স্বাগতম, ${h(name)}!</h2>
        <p>মা ভেষজ বাণিজ্যালয়ে আপনাকে স্বাগত জানাই।</p>
        <p>আমাদের প্রাকৃতিক ও ভেষজ পণ্য ব্রাউজ করুন এবং আপনার পছন্দের পণ্য অর্ডার করুন।</p>
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

    const itemsHtml = data.items
      .map((i) => `<tr><td style="padding:8px;border:1px solid #e5e5e5">${h(i.productName)}</td><td style="padding:8px;border:1px solid #e5e5e5;text-align:center">${i.quantity}</td><td style="padding:8px;border:1px solid #e5e5e5;text-align:right">৳${i.price}</td><td style="padding:8px;border:1px solid #e5e5e5;text-align:right">৳${i.price * i.quantity}</td></tr>`)
      .join("");

    const paymentLabels: Record<string, string> = { cod: "Cash on Delivery", bkash: "bKash", nagad: "Nagad", bank: "Bank Transfer" };
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mavesoj.com";
    const orderUrl = data.orderToken ? `${siteUrl}/order/${data.orderToken}` : `${siteUrl}/dashboard/orders`;

    await transporter.sendMail({
      from: `"মা ভেষজ বাণিজ্যালয়" <${from}>`,
      to: adminEmail,
      subject: `🛒 নতুন অর্ডার #${data.orderId} — ৳${data.total} — ${data.customerName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0f5931;color:white;padding:20px;border-radius:12px 12px 0 0">
            <h2 style="margin:0">🛒 নতুন অর্ডার এসেছে!</h2>
            <p style="margin:4px 0 0;opacity:0.8">অর্ডার #${data.orderId}</p>
          </div>
          <div style="padding:20px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
            <h3 style="color:#0f5931;margin-bottom:8px">গ্রাহকের তথ্য</h3>
            <table style="width:100%;margin-bottom:16px">
              <tr><td style="padding:4px 0;color:#666">নাম:</td><td style="padding:4px 0"><strong>${h(data.customerName)}</strong></td></tr>
              <tr><td style="padding:4px 0;color:#666">ফোন:</td><td style="padding:4px 0"><strong>${h(data.phone)}</strong></td></tr>
              <tr><td style="padding:4px 0;color:#666">ঠিকানা:</td><td style="padding:4px 0">${h(data.address)}</td></tr>
              <tr><td style="padding:4px 0;color:#666">শহর:</td><td style="padding:4px 0">${h(data.city)}</td></tr>
              <tr><td style="padding:4px 0;color:#666">পেমেন্ট:</td><td style="padding:4px 0">${h(paymentLabels[data.paymentMethod] || data.paymentMethod)}</td></tr>
            </table>
            <h3 style="color:#0f5931;margin-bottom:8px">অর্ডারকৃত পণ্য</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #e5e5e5;text-align:left">পণ্য</th><th style="padding:8px;border:1px solid #e5e5e5;text-align:center">পরিমাণ</th><th style="padding:8px;border:1px solid #e5e5e5;text-align:right">দাম</th><th style="padding:8px;border:1px solid #e5e5e5;text-align:right">মোট</th></tr>
              ${itemsHtml}
            </table>
            <div style="background:#f9f9f9;padding:12px;border-radius:8px;margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#666">সাবটোটাল:</span><span>৳${data.total - data.shippingCost}</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#666">শিপিং:</span><span>৳${data.shippingCost}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:bold;color:#0f5931;border-top:2px solid #0f5931;padding-top:8px;margin-top:8px"><span>সর্বমোট:</span><span>৳${data.total}</span></div>
            </div>
            <a href="${orderUrl}" style="display:inline-block;background:#0f5931;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold">অর্ডার দেখুন →</a>
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
    const itemsHtml = data.items
      .map((i) => `<tr><td>${h(i.productName)}</td><td>${i.quantity}</td><td>৳${i.price}</td></tr>`)
      .join("");

    await transporter.sendMail({
      from: `"মা ভেষজ বাণিজ্যালয়" <${from}>`,
      to,
      subject: `অর্ডার নিশ্চিতকরণ #${data.orderId}`,
      html: `
        <h2>ধন্যবাদ, ${h(data.customerName)}!</h2>
        <p>আপনার অর্ডার #${data.orderId} সফলভাবে গৃহীত হয়েছে।</p>
        <table border="1" cellpadding="8" cellspacing="0">
          <tr><th>পণ্য</th><th>পরিমাণ</th><th>মূল্য</th></tr>
          ${itemsHtml}
        </table>
        <p><strong>মোট: ৳${data.total}</strong></p>
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

    const subjectLabels: Record<string, string> = {
      order: "অর্ডার সংক্রান্ত",
      product: "পণ্য সংক্রান্ত",
      delivery: "ডেলিভারি সংক্রান্ত",
      refund: "রিফান্ড/রিটার্ন",
      other: "অন্যান্য",
    };

    await transporter.sendMail({
      from: `"মা ভেষজ বাণিজ্যালয়" <${from}>`,
      to: adminEmail,
      replyTo: data.email,
      subject: `📩 নতুন যোগাযোগ #${data.id} — ${h(data.name)} — ${subjectLabels[data.subject] || "সাধারণ"}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0f5931;color:white;padding:20px;border-radius:12px 12px 0 0">
            <h2 style="margin:0">📩 নতুন যোগাযোগ ফর্ম জমা</h2>
            <p style="margin:4px 0 0;opacity:0.8">#${data.id}</p>
          </div>
          <div style="padding:20px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
            <table style="width:100%;margin-bottom:16px">
              <tr><td style="padding:6px 0;color:#666;width:100px">নাম:</td><td style="padding:6px 0"><strong>${h(data.name)}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#666">ইমেইল:</td><td style="padding:6px 0"><a href="mailto:${encodeURIComponent(data.email)}">${h(data.email)}</a></td></tr>
              ${data.phone ? `<tr><td style="padding:6px 0;color:#666">ফোন:</td><td style="padding:6px 0"><a href="tel:${h(data.phone)}">${h(data.phone)}</a></td></tr>` : ""}
              ${data.subject ? `<tr><td style="padding:6px 0;color:#666">বিষয়:</td><td style="padding:6px 0">${h(subjectLabels[data.subject] || data.subject)}</td></tr>` : ""}
            </table>
            <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin-bottom:16px">
              <p style="margin:0;color:#333;white-space:pre-line">${h(data.message)}</p>
            </div>
            <a href="mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent('Re: ' + (subjectLabels[data.subject] || 'আপনার বার্তা'))}" style="display:inline-block;background:#0f5931;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold">উত্তর দিন →</a>
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
