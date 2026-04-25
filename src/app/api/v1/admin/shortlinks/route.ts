import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { isValidShortlinkSlug } from "@/lib/reservedSlugs";

// GET — list all shortlinks (newest first). Staff + admin can manage.
export async function GET() {
  try { await requireStaff(); } catch (e) { return e as Response; }
  try {
    const rows = await prisma.shortlink.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return jsonResponse({ data: rows });
  } catch (e) {
    console.error("[Shortlinks] list error:", e);
    return errorResponse("Failed to fetch shortlinks", 500);
  }
}

// POST — create. Body: { slug, target_url, is_active? }
export async function POST(request: NextRequest) {
  try { await requireStaff(); } catch (e) { return e as Response; }
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);

    const slug = String(body.slug || "").trim().toLowerCase();
    const targetUrl = String(body.target_url || "").trim();
    const isActive = body.is_active === false ? false : true;

    const v = isValidShortlinkSlug(slug);
    if (!v.ok) return errorResponse(v.reason, 422);

    if (!targetUrl) return errorResponse("Target URL is required.", 422);
    // Allow internal paths (/shop?...) and external URLs (https://...).
    // Reject only obviously dangerous schemes — javascript:, data:, vbscript:.
    if (/^\s*(javascript|data|vbscript):/i.test(targetUrl)) {
      return errorResponse("Target URL scheme not allowed.", 422);
    }

    // Check uniqueness explicitly so we can return a friendly message rather
    // than a Prisma P2002.
    const existing = await prisma.shortlink.findUnique({ where: { slug } });
    if (existing) return errorResponse(`Slug "${slug}" already exists.`, 409);

    const created = await prisma.shortlink.create({
      data: { slug, targetUrl, isActive },
    });
    return jsonResponse({ data: created }, 201);
  } catch (e) {
    console.error("[Shortlinks] create error:", e);
    return errorResponse("Failed to create shortlink", 500);
  }
}
