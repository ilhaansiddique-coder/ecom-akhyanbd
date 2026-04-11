import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { makeBanglaSlug } from "@/lib/bangla-slug";

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const body = await request.json();
    const name = body.name;

    if (!name || typeof name !== "string") {
      return errorResponse("Name is required", 422);
    }

    const slug = makeBanglaSlug(name);
    return jsonResponse({ slug });
  } catch (error) {
    return errorResponse("Failed to generate slug", 500);
  }
}
