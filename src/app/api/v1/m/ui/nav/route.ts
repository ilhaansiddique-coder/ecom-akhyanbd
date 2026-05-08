import { withAdmin } from "@/lib/auth-helpers";
import { cachedJsonResponse } from "@/lib/api-response";
import { NAV_TREE } from "@/lib/nav-tree";

/**
 * GET /api/v1/m/ui/nav
 *
 * Returns the canonical admin nav tree as JSON. The Flutter app fetches this
 * on startup (and on `settings`/`theme` SSE bumps as a cheap future-proof
 * refresh) and renders the sidebar from it. Same data source as the web
 * dashboard sidebar — change `nav-tree.ts`, redeploy, both UIs update.
 *
 * Admin-only: the menu reveals the admin surface area, and we already gate
 * every linked route with withAdmin/withStaff anyway.
 *
 * Response shape (stable contract — Dart `LiveNav.fromJson` decodes this):
 *
 *   {
 *     "groups": [
 *       { "i18nKey": "...", "label": "...", "icon": "...",
 *         "webRoute": "/dashboard", "mobileRoute": "/dashboard" },
 *       { "i18nKey": "...", "label": "...", "icon": "...",
 *         "items": [ { ...leaf }, ... ] },
 *       ...
 *     ]
 *   }
 *
 * Cached at the edge for 5 minutes (s-maxage). Any per-deploy change to
 * nav-tree.ts invalidates naturally on redeploy; no SSE bump needed because
 * the tree is build-time data.
 */
export const GET = withAdmin(async () => {
  return cachedJsonResponse({ groups: NAV_TREE }, { sMaxAge: 300 });
});
