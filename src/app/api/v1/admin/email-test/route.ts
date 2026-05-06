import { NextRequest } from "next/server";
import { jsonResponse, errorResponse, validationError } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { testSmtpConnection, clearSmtpCache } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { smtpTestSchema } from "@/lib/validation";

export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json();
    const parsed = smtpTestSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const { host, port, user, pass, from } = parsed.data;

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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Test failed";
    return errorResponse(message, 500);
  }
});
