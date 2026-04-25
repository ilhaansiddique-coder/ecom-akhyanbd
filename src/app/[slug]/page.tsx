import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RESERVED_SLUGS } from "@/lib/reservedSlugs";

// Catch-all top-level dynamic route. Static segments (e.g. /shop, /blog,
// /dashboard) take precedence in the Next.js router, so this only fires for
// paths that don't match anything else. We look up the slug in the
// shortlinks table; if found and active, server-side redirect; otherwise
// notFound() so Next renders the 404 page.
//
// `dynamic = "force-dynamic"` keeps Vercel/Hostinger from trying to
// statically pre-render arbitrary slugs at build time.
export const dynamic = "force-dynamic";

export default async function ShortlinkResolver({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = String(rawSlug || "").toLowerCase();

  // Defensive: even though the router precedence handles this, double-check
  // we never serve a redirect for a reserved system slug.
  if (RESERVED_SLUGS.has(slug)) notFound();

  const link = await prisma.shortlink.findUnique({ where: { slug } });
  if (!link || !link.isActive) notFound();

  // Fire-and-forget hit counter. Don't block the redirect on it.
  prisma.shortlink
    .update({ where: { id: link.id }, data: { hits: { increment: 1 } } })
    .catch(() => {});

  redirect(link.targetUrl);
}
