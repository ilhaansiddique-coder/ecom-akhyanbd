import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validation";
import { jsonResponse, validationError } from "@/lib/api-response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendAdminContactNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (rateLimit(`contact:${ip}`, 3, 60000)) {
    return jsonResponse({ message: "Too many requests." }, 429);
  }

  const body = await request.json();
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] = [issue.message];
    return validationError(errors);
  }

  const data = parsed.data;

  // Store in database
  const submission = await prisma.formSubmission.create({
    data: {
      name: data.name,
      email: data.email,
      phone: (data as any).phone || null,
      subject: data.subject || null,
      message: data.message,
    },
  });

  // Send admin email notification (non-blocking)
  sendAdminContactNotification({
    id: submission.id,
    name: data.name,
    email: data.email,
    phone: (data as any).phone || "",
    subject: data.subject || "",
    message: data.message,
  });

  return jsonResponse({ message: "আপনার বার্তা পাঠানো হয়েছে। ধন্যবাদ!" });
}
