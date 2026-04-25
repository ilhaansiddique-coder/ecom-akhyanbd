/**
 * Top-level paths that already exist in the app router. Shortlink slugs must
 * not collide with these — Next.js routing precedence means a static segment
 * always wins over the dynamic [slug] catch-all, so a shortlink with one of
 * these names would silently never resolve. Validated at create time.
 *
 * Keep this list in sync with src/app/* top-level directories + system files.
 */
export const RESERVED_SLUGS = new Set<string>([
  // App routes
  "about", "api", "blog", "cart", "cdlogin", "checkout", "contact",
  "dashboard", "feed", "lp", "order", "orders", "privacy", "products", "refund",
  "search", "shop", "terms", "wishlist", "login", "register", "auth",
  "forgot-password", "reset-password",
  // Generated files
  "robots.txt", "sitemap.xml", "favicon.ico", "favicon.png", "icon.svg",
  "manifest.json", "sw.js", "sw-dashboard.js",
  // Common reserved words you'd never want to lose
  "admin", "static", "_next", "uploads", "storage", "public",
]);

/** Slug must be URL-safe + non-empty + not in reserved set. */
export function isValidShortlinkSlug(slug: string): { ok: true } | { ok: false; reason: string } {
  if (!slug) return { ok: false, reason: "Slug is required." };
  if (slug.length > 100) return { ok: false, reason: "Slug too long (max 100 chars)." };
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(slug)) {
    return { ok: false, reason: "Slug can only contain letters, numbers, hyphens, and underscores." };
  }
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return { ok: false, reason: `"${slug}" is a reserved path.` };
  }
  return { ok: true };
}
