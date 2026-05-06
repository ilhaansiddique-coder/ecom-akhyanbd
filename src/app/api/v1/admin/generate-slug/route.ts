import { NextRequest } from "next/server";
import { jsonResponse, errorResponse, validationError } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { makeBanglaSlug } from "@/lib/bangla-slug";
import { generateSlugSchema } from "@/lib/validation";

export const POST = withStaff(async (request) => {
  try {
    const body = await request.json();
    const parsed = generateSlugSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const slug = makeBanglaSlug(parsed.data.name);
    return jsonResponse({ slug });
  } catch (error) {
    return errorResponse("Failed to generate slug", 500);
  }
});
