import { prisma } from "@/lib/prisma";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { isValidShortlinkSlug } from "@/lib/reservedSlugs";
import { mobileShortlinkCreateSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

const DAY_MS = 86400000;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dayKey(d: Date): string {
  return startOfUtcDay(d).toISOString().slice(0, 10);
}

function buildSparkline(clicks: { createdAt: Date }[], now: Date): { sparkline: number[]; sevenDayClicks: number } {
  // 7 daily buckets, oldest first.
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
  return { sparkline, sevenDayClicks: sparkline.reduce((a, b) => a + b, 0) };
}

export const GET = withAdmin(async (_request) => {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * DAY_MS);

  const rows = await prisma.shortlink.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      clicks: {
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      },
    },
  });

  const data = rows.map((r) => {
    const { sparkline, sevenDayClicks } = buildSparkline(r.clicks, now);
    return {
      id: r.id,
      slug: r.slug,
      targetUrl: r.targetUrl,
      hits: r.hits,
      isActive: r.isActive,
      createdAt: r.createdAt?.toISOString() ?? null,
      updatedAt: r.updatedAt?.toISOString() ?? null,
      sevenDayClicks,
      sparkline,
    };
  });

  return jsonResponse({ data });
});

export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);

    const parsed = mobileShortlinkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    const slug = data.slug.trim().toLowerCase();
    const targetUrl = data.targetUrl.trim();
    const isActive = data.isActive === false ? false : true;

    const v = isValidShortlinkSlug(slug);
    if (!v.ok) return errorResponse(v.reason, 422);

    if (!targetUrl) return errorResponse("Target URL is required.", 422);
    if (/^\s*(javascript|data|vbscript):/i.test(targetUrl)) {
      return errorResponse("Target URL scheme not allowed.", 422);
    }

    const existing = await prisma.shortlink.findUnique({ where: { slug } });
    if (existing) return errorResponse(`Slug "${slug}" already exists.`, 409);

    const created = await prisma.shortlink.create({
      data: { slug, targetUrl, isActive },
    });

    bumpVersion("shortlinks");
    return jsonResponse({
      data: {
        id: created.id,
        slug: created.slug,
        targetUrl: created.targetUrl,
        hits: created.hits,
        isActive: created.isActive,
        createdAt: created.createdAt?.toISOString() ?? null,
        updatedAt: created.updatedAt?.toISOString() ?? null,
        sevenDayClicks: 0,
        sparkline: [0, 0, 0, 0, 0, 0, 0],
      },
    }, 201);
  } catch (error) {
    console.error("[m/shortlinks] create error:", error);
    return errorResponse("Failed to create shortlink", 500);
  }
});
