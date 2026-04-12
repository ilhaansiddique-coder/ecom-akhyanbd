import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { testSmtpConnection, clearSmtpCache } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const { host, port, user, pass, from } = await request.json();

    // Save to DB first
    const keys: Record<string, string> = {
      smtp_host: host || "",
      smtp_port: String(port || 587),
      smtp_user: user || "",
      smtp_pass: pass || "",
      smtp_from: from || user || "",
    };

    for (const [key, value] of Object.entries(keys)) {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value, group: "email" },
      });
    }

    clearSmtpCache();

    // Test connection
    const result = await testSmtpConnection({
      host: host || "smtp.gmail.com",
      port: Number(port) || 587,
      user: user || "",
      pass: pass || "",
      from: from || user || "",
    });

    return jsonResponse(result);
  } catch (err: any) {
    return errorResponse(err?.message || "Test failed", 500);
  }
}
