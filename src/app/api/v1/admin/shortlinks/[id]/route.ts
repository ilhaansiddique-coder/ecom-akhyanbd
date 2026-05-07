import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, notFound, validationError } from "@/lib/api-response";
import { withAdmin, withStaff } from "@/lib/auth-helpers";
import { isValidShortlinkSlug } from "@/lib/reservedSlugs";
import { shortlinkUpdateSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

// PUT — update. Body can change slug, target_url, is_active.
export const PUT = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  try {
    const { id } = await params;
    const idNum = Number(id);
    if (!idNum) return notFound("Invalid id");

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);
    const parsed = shortlinkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const input = parsed.data;

    // Build the partial update — only touch fields the caller actually sent.
    const data: Prisma.ShortlinkUncheckedUpdateInput = {};

    if (input.slug !== undefined) {
      const slug = String(input.slug).trim().toLowerCase();
      const v = isValidShortlinkSlug(slug);
      if (!v.ok) return errorResponse(v.reason, 422);
      // Reject collision with another row.
      const collision = await prisma.shortlink.findFirst({
        where: { slug, NOT: { id: idNum } },
      });
      if (collision) return errorResponse(`Slug "${slug}" already exists.`, 409);
      data.slug = slug;
    }

    if (input.target_url !== undefined) {
      const targetUrl = String(input.target_url).trim();
      if (!targetUrl) return errorResponse("Target URL is required.", 422);
      if (/^\s*(javascript|data|vbscript):/i.test(targetUrl)) {
        return errorResponse("Target URL scheme not allowed.", 422);
      }
      data.targetUrl = targetUrl;
    }

    if (input.is_active !== undefined) {
      data.isActive = !!input.is_active;
    }

    if (Object.keys(data).length === 0) return errorResponse("Nothing to update", 400);

    const updated = await prisma.shortlink.update({ where: { id: idNum }, data });
    bumpVersion("shortlinks", { kind: "shortlink.updated", title: "Shortlink updated", body: `/${updated.slug}`, severity: "info" });
    return jsonResponse({ data: updated });
  } catch (e) {
    console.error("[Shortlinks] update error:", e);
    return errorResponse("Failed to update shortlink", 500);
  }
});

// DELETE — admin-only. Same rationale as orders: don't let staff wipe
// shareable URLs that may be live in social posts / ads.
export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  try {
    const { id } = await params;
    const idNum = Number(id);
    if (!idNum) return notFound("Invalid id");
    await prisma.shortlink.delete({ where: { id: idNum } }).catch(() => null);
    bumpVersion("shortlinks", { kind: "shortlink.deleted", title: "Shortlink deleted", body: `id ${idNum}`, severity: "warn" });
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("[Shortlinks] delete error:", e);
    return errorResponse("Failed to delete shortlink", 500);
  }
});
