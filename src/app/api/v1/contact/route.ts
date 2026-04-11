import { NextRequest } from "next/server";
import { contactSchema } from "@/lib/validation";
import { jsonResponse, validationError } from "@/lib/api-response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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

  // TODO: Store contact message or send email notification
  return jsonResponse({ message: "আপনার বার্তা পাঠানো হয়েছে। ধন্যবাদ!" });
}
