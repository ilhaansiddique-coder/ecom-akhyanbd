import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, notFound, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { mobileShortlinkUpdateSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

const DAY_MS = 86400000;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dayKey(d: Date): string {
  return startOfUtcDay(d).toISOString().slice(0, 10);
}

function buildSparkline(clicks: { createdAt: Date }[], now: Date): { sparkline: number[]; sevenDayClicks: number; daily: { date: string; count: number }[] } {
  const today = startOfUtcDay(now);
  const buckets: { key: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today.getTime() - i * DAY_MS);
    buckets.push({ key: dayKey(day), count: 0 });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const c of clicks) {
    const i = idx.get(dayKey(c.createdAt));
    if (i !== undefined) buckets[i].count += 1;
  }
  const sparkline = buckets.map((b) => b.count);
  const daily = buckets.map((b) => ({ date: b.key, count: b.count }));
  return { sparkline, sevenDayClicks: sparkline.reduce((a, b) => a + b, 0), daily };
}

export const GET = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const idNum = Number(id);
  if (!idNum) return notFound("Invalid id");

  const now = new Date();
  const since = new Date(now.getTime() - 7 * DAY_MS);

  const row = await prisma.shortlink.findUnique({
    where: { id: idNum },
    include: {
      clicks: {
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      },
    },
  });
  if (!row) return notFound("Shortlink not found");

  const { sparkline, sevenDayClicks, daily } = buildSparkline(row.clicks, now);

  return jsonResponse({
    data: {
      id: row.id,
      slug: row.slug,
      targetUrl: row.targetUrl,
      hits: row.hits,
      isActive: row.isActive,
      createdAt: row.createdAt?.toISOString() ?? null,
      updatedAt: row.updatedAt?.toISOString() ?? null,
      sevenDayClicks,
      sparkline,
      clicks: { daily },
    },
  });
});

export const PATCH = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const idNum = Number(id);
  if (!idNum) return notFound("Invalid id");

  const existing = await prisma.shortlink.findUnique({ where: { id: idNum } });
  if (!existing) return notFound("Shortlink not found");

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);

    const parsed = mobileShortlinkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const input = parsed.data;

    const data: Prisma.ShortlinkUncheckedUpdateInput = {};

    if (input.targetUrl !== undefined) {
      const targetUrl = input.targetUrl.trim();
      if (!targetUrl) return errorResponse("Target URL is required.", 422);
      if (/^\s*(javascript|data|vbscript):/i.test(targetUrl)) {
        return errorResponse("Target URL scheme not allowed.", 422);
      }
      data.targetUrl = targetUrl;
    }
    if (input.isActive !== undefined) data.isActive = input.isActive;

    if (Object.keys(data).length === 0) return errorResponse("Nothing to update", 400);

    const updated = await prisma.shortlink.update({ where: { id: idNum }, data });

    bumpVersion("shortlinks");
    return jsonResponse({
      data: {
        id: updated.id,
        slug: updated.slug,
        targetUrl: updated.targetUrl,
        hits: updated.hits,
        isActive: updated.isActive,
        createdAt: updated.createdAt?.toISOString() ?? null,
        updatedAt: updated.updatedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("[m/shortlinks] update error:", error);
    return errorResponse("Failed to update shortlink", 500);
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;
  const idNum = Number(id);
  if (!idNum) return notFound("Invalid id");

  const existing = await prisma.shortlink.findUnique({ where: { id: idNum } });
  if (!existing) return notFound("Shortlink not found");

  await prisma.shortlink.delete({ where: { id: idNum } });
  bumpVersion("shortlinks");
  return jsonResponse({ data: { id: idNum, deleted: true } });
});
