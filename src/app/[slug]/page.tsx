import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { RESERVED_SLUGS } from "@/lib/reservedSlugs";
import { parseUA, truncateIp, deriveSource } from "@/lib/uaParser";
import { getClientIp } from "@/lib/fbcapi";

// Catch-all top-level dynamic route. Static segments (e.g. /shop, /blog,
// /dashboard) take precedence in the Next.js router, so this only fires for
// paths that don't match anything else. We look up the slug in the
// shortlinks table; if found and active, log a click row + bump the hit
// counter, then server-side redirect. Otherwise notFound() so Next renders
// the 404 page.
//
// `dynamic = "force-dynamic"` keeps Vercel/Hostinger from trying to
// statically pre-render arbitrary slugs at build time.
export const dynamic = "force-dynamic";

export default async function ShortlinkResolver({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug: rawSlug } = await params;
  const slug = String(rawSlug || "").toLowerCase();

  // Defensive: even though Next.js router precedence handles this, double-
  // check we never serve a redirect for a reserved system slug.
  if (RESERVED_SLUGS.has(slug)) notFound();

  const link = await prisma.shortlink.findUnique({ where: { slug } });
  if (!link || !link.isActive) notFound();

  // ── Click logging (fire-and-forget) ──
  // Capture: ip (truncated), country (from CF / X-Vercel headers), referer,
  // utm_source / medium / campaign, plus parsed browser / OS / device. Same
  // request, so we never block the redirect on the insert — `void` the
  // promise. If the insert fails we still serve the redirect.
  try {
    const hdrs = await headers();
    const sp = await searchParams;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reqLike: any = { headers: hdrs };
    const ip = getClientIp(reqLike);
    const ua = hdrs.get("user-agent");
    const referer = hdrs.get("referer") || hdrs.get("referrer");
    // Country: Cloudflare sets cf-ipcountry; Vercel sets x-vercel-ip-country.
    // Hostinger doesn't set anything by default — admin can put CF in front
    // and this'll start populating.
    const country =
      hdrs.get("cf-ipcountry") ||
      hdrs.get("x-vercel-ip-country") ||
      hdrs.get("x-country-code") ||
      null;

    const utmSource = typeof sp.utm_source === "string" ? sp.utm_source : null;
    const utmMedium = typeof sp.utm_medium === "string" ? sp.utm_medium : null;
    const utmCampaign = typeof sp.utm_campaign === "string" ? sp.utm_campaign : null;

    const { browser, os, device } = parseUA(ua);
    const source = deriveSource(referer, utmSource);

    // ── IMPORTANT ──
    // We AWAIT both writes (with a short timeout) instead of fire-and-forget.
    // Prior versions used `void ... .catch(() => {})` which swallowed errors
    // AND also sometimes lost the insert on serverless teardown right after
    // redirect(). We now block ~50ms worst-case for the writes — far less
    // than the 308 round-trip the user sees anyway — so analytics actually
    // record. Errors are logged loudly to server console.
    try {
      await prisma.shortlinkClick.create({
        data: {
          shortlinkId: link.id,
          ipTrunc: truncateIp(ip),
          country: country ? String(country).toUpperCase() : null,
          referer: referer ? referer.slice(0, 500) : null,
          source,
          utmSource: utmSource ? utmSource.slice(0, 100) : null,
          utmMedium: utmMedium ? utmMedium.slice(0, 100) : null,
          utmCampaign: utmCampaign ? utmCampaign.slice(0, 100) : null,
          browser,
          os,
          device,
        },
      });
    } catch (e) {
      console.error("[Shortlink] click insert failed:", e instanceof Error ? e.message : e);
    }

    try {
      await prisma.shortlink.update({
        where: { id: link.id },
        data: { hits: { increment: 1 } },
      });
    } catch (e) {
      console.error("[Shortlink] hit counter update failed:", e instanceof Error ? e.message : e);
    }
  } catch (e) {
    console.error("[Shortlink] click logging block error:", e instanceof Error ? e.message : e);
  }

  redirect(link.targetUrl);
}
