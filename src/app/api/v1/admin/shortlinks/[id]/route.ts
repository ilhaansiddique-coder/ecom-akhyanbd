import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { requireStaff, requireAdmin } from "@/lib/auth-helpers";
import { isValidShortlinkSlug } from "@/lib/reservedSlugs";

// PUT — update. Body can change slug, target_url, is_active.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try { await requireStaff(); } catch (e) { return e as Response; }
  try {
    const { id } = await params;
    const idNum = Number(id);
    if (!idNum) return notFound("Invalid id");

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);

    // Build the partial update — only touch fields the caller actually sent.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (body.slug !== undefined) {
      const slug = String(body.slug).trim().toLowerCase();
      const v = isValidShortlinkSlug(slug);
      if (!v.ok) return errorResponse(v.reason, 422);
      // Reject collision with another row.
      const collision = await prisma.shortlink.findFirst({
        where: { slug, NOT: { id: idNum } },
      });
      if (collision) return errorResponse(`Slug "${slug}" already exists.`, 409);
      data.slug = slug;
    }

    if (body.target_url !== undefined) {
      const targetUrl = String(body.target_url).trim();
      if (!targetUrl) return errorResponse("Target URL is required.", 422);
      if (/^\s*(javascript|data|vbscript):/i.test(targetUrl)) {
        return errorResponse("Target URL scheme not allowed.", 422);
      }
      data.targetUrl = targetUrl;
    }

    if (body.is_active !== undefined) {
      data.isActive = !!body.is_active;
    }

    if (Object.keys(data).length === 0) return errorResponse("Nothing to update", 400);

    const updated = await prisma.shortlink.update({ where: { id: idNum }, data });
    return jsonResponse({ data: updated });
  } catch (e) {
    console.error("[Shortlinks] update error:", e);
    return errorResponse("Failed to update shortlink", 500);
  }
}

// DELETE — admin-only. Same rationale as orders: don't let staff wipe
// shareable URLs that may be live in social posts / ads.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try { await requireAdmin(); } catch (e) { return e as Response; }
  try {
    const { id } = await params;
    const idNum = Number(id);
    if (!idNum) return notFound("Invalid id");
    await prisma.shortlink.delete({ where: { id: idNum } }).catch(() => null);
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("[Shortlinks] delete error:", e);
    return errorResponse("Failed to delete shortlink", 500);
  }
}
