import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || "info@mavesoj.com";

export async function sendWelcomeEmail(to: string, name: string) {
  try {
    await transporter.sendMail({
      from: `"মা ভেষজ বাণিজ্যালয়" <${FROM}>`,
      to,
      subject: "স্বাগতম! আপনার অ্যাকাউন্ট তৈরি হয়েছে",
      html: `
        <h2>স্বাগতম, ${name}!</h2>
        <p>মা ভেষজ বাণিজ্যালয়ে আপনাকে স্বাগত জানাই।</p>
        <p>আমাদের প্রাকৃতিক ও ভেষজ পণ্য ব্রাউজ করুন এবং আপনার পছন্দের পণ্য অর্ডার করুন।</p>
      `,
    });
  } catch {
    // Non-blocking: don't fail registration if email fails
  }
}

interface OrderEmailData {
  customerName: string;
  orderId: number;
  total: number;
  items: { productName: string; quantity: number; price: number }[];
}

export async function sendOrderConfirmation(to: string, data: OrderEmailData) {
  try {
    const itemsHtml = data.items
      .map((i) => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>৳${i.price}</td></tr>`)
      .join("");

    await transporter.sendMail({
      from: `"মা ভেষজ বাণিজ্যালয়" <${FROM}>`,
      to,
      subject: `অর্ডার নিশ্চিতকরণ #${data.orderId}`,
      html: `
        <h2>ধন্যবাদ, ${data.customerName}!</h2>
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
