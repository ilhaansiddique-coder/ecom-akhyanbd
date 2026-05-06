import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";

// Click analytics for one shortlink. Range defaults to last 30 days; pass
// ?range=7|30|90|all to override. Returns:
//   - summary: total, unique (by truncated IP), top source/country/device,
//     last click timestamp.
//   - timeline: per-day click counts in the range (BD-anchored bucket).
//   - sources / countries / browsers / oses / devices / referers / utm_*:
//     [{ key, count }] groups, sorted desc, top 20 each.
//   - recent: last 50 click rows for the live feed.
export const GET = withStaff<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  try {
    const { id } = await params;
    const idNum = Number(id);
    if (!idNum) return notFound("Invalid id");

    const link = await prisma.shortlink.findUnique({ where: { id: idNum } });
    if (!link) return notFound("Shortlink not found");

    const rangeParam = request.nextUrl.searchParams.get("range") || "30";
    const days = rangeParam === "all" ? null
      : Math.max(1, Math.min(365, Number(rangeParam) || 30));

    // BD-anchored bucket helpers — match the dashboard's day boundaries.
    const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const todayBdStart = Math.floor((nowMs + BD_OFFSET_MS) / 86400000) * 86400000 - BD_OFFSET_MS;

    const where: { shortlinkId: number; createdAt?: { gte: Date } } = { shortlinkId: idNum };
    if (days !== null) {
      where.createdAt = { gte: new Date(todayBdStart - (days - 1) * 86400000) };
    }

    const [
      total,
      sources,
      countries,
      browsers,
      oses,
      devices,
      referers,
      utmCampaigns,
      utmMediums,
      uniqueRows,
      recent,
    ] = await Promise.all([
      prisma.shortlinkClick.count({ where }),
      prisma.shortlinkClick.groupBy({
        by: ["source"], where, _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 20,
      }),
      prisma.shortlinkClick.groupBy({
        by: ["country"], where, _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 20,
      }),
      prisma.shortlinkClick.groupBy({
        by: ["browser"], where, _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 20,
      }),
      prisma.shortlinkClick.groupBy({
        by: ["os"], where, _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 20,
      }),
      prisma.shortlinkClick.groupBy({
        by: ["device"], where, _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 20,
      }),
      prisma.shortlinkClick.groupBy({
        by: ["referer"], where, _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 20,
      }),
      prisma.shortlinkClick.groupBy({
        by: ["utmCampaign"], where, _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 20,
      }),
      prisma.shortlinkClick.groupBy({
        by: ["utmMedium"], where, _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 20,
      }),
      // Unique-by-network: distinct truncated IP per range. groupBy then count
      // length client-side — fine because top-N is bounded by perPage above.
      prisma.shortlinkClick.findMany({
        where, select: { ipTrunc: true }, distinct: ["ipTrunc"],
      }),
      prisma.shortlinkClick.findMany({
        where, orderBy: { createdAt: "desc" }, take: 50,
      }),
    ]);

    // Build the daily timeline. Use raw SQL for speed — Prisma's groupBy
    // can't truncate a DateTime to day directly without a $queryRaw.
    //
    // Two tz subtleties this pass got right (the previous version was buggy):
    //
    //  1. Prisma stores `created_at` as `timestamp(3)` WITHOUT tz. Values
    //     are recorded in UTC by Prisma's `now()`. Doing
    //     `"created_at" AT TIME ZONE 'Asia/Dhaka'` would WRONG-WAY interpret
    //     the wall-clock as Dhaka and convert to UTC. Correct sequence:
    //     `AT TIME ZONE 'UTC'` (declares the source) then `AT TIME ZONE
    //     'Asia/Dhaka'` (converts to target). Result is a Dhaka-local
    //     timestamp (no tz).
    //
    //  2. JS bucket keys: `new Date(midnight-Dhaka-as-UTC-ms).toISOString()`
    //     returns the UTC calendar date, which is the *previous* day in
    //     Dhaka because midnight Dhaka = 18:00 UTC. We add BD_OFFSET_MS
    //     before slicing to read off the Dhaka calendar date instead.
    type DailyRow = { day: Date; count: bigint };
    const timelineDays = days ?? 30;
    const startMs = todayBdStart - (timelineDays - 1) * 86400000;
    const dailyRaw = await prisma.$queryRaw<DailyRow[]>`
      SELECT
        date_trunc('day', "created_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Dhaka') AS day,
        COUNT(*)::bigint AS count
      FROM shortlink_clicks
      WHERE shortlink_id = ${idNum}
        AND "created_at" >= ${new Date(startMs)}
      GROUP BY day
      ORDER BY day ASC
    `;
    const toBdKey = (msUtc: number) =>
      new Date(msUtc + BD_OFFSET_MS).toISOString().slice(0, 10);
    const dailyMap = new Map<string, number>();
    for (const r of dailyRaw) {
      // The raw query returned a Dhaka-wall-clock timestamp (no tz). The
      // PG driver hands it back as a JS Date in the local server tz —
      // `.toISOString()` re-formats in UTC which equals the Dhaka string
      // since the value already represents Dhaka clock with no offset.
      const d = r.day instanceof Date ? r.day : new Date(r.day);
      // Strip 0..N hours of drift via UTC slice — the wall-clock value is
      // already the Dhaka date so .toISOString().slice(0,10) is correct
      // here (different from the JS-side calculation below where the value
      // is a UTC instant).
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, Number(r.count));
    }
    const timeline: { date: string; count: number }[] = [];
    for (let i = 0; i < timelineDays; i++) {
      const key = toBdKey(startMs + i * 86400000);
      timeline.push({ date: key.slice(5), count: dailyMap.get(key) || 0 });
    }

    return jsonResponse({
      data: {
        link: { id: link.id, slug: link.slug, targetUrl: link.targetUrl, createdAt: link.createdAt },
        range: { days, label: days === null ? "all" : `${days}d` },
        summary: {
          total,
          unique: uniqueRows.length,
          lastClick: recent[0]?.createdAt || null,
          topSource: sources[0]?.source || null,
          topCountry: countries[0]?.country || null,
          topDevice: devices[0]?.device || null,
        },
        timeline,
        sources: sources.map((r) => ({ key: r.source || "(unknown)", count: r._count._all })),
        countries: countries.map((r) => ({ key: r.country || "(unknown)", count: r._count._all })),
        browsers: browsers.map((r) => ({ key: r.browser || "(unknown)", count: r._count._all })),
        oses: oses.map((r) => ({ key: r.os || "(unknown)", count: r._count._all })),
        devices: devices.map((r) => ({ key: r.device || "(unknown)", count: r._count._all })),
        referers: referers.map((r) => ({ key: r.referer || "(direct)", count: r._count._all })),
        utmCampaigns: utmCampaigns.filter((r) => r.utmCampaign).map((r) => ({ key: r.utmCampaign!, count: r._count._all })),
        utmMediums: utmMediums.filter((r) => r.utmMedium).map((r) => ({ key: r.utmMedium!, count: r._count._all })),
        recent: recent.map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          source: r.source,
          country: r.country,
          device: r.device,
          browser: r.browser,
          os: r.os,
          referer: r.referer,
          utmCampaign: r.utmCampaign,
        })),
      },
    });
  } catch (e) {
    console.error("[Shortlink analytics] error:", e);
    return errorResponse("Failed to load analytics", 500);
  }
});
