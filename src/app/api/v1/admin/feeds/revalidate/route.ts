/**
 * POST /api/v1/admin/feeds/revalidate
 *
 * Manually bust the feed cache. Used by the "Refresh feeds now" button on
 * the dashboard /feeds page when admin wants the FB/Google/TikTok feeds to
 * pick up a change immediately, without waiting for the 1-hour TTL.
 *
 * Busts the "feeds" tag (set on `loadFeedItems` in src/lib/feedSource.ts)
 * AND each feed URL via revalidatePath, so both the data layer and the
 * route-level cache regenerate on the next hit.
 *
 * Idempotent — safe to call repeatedly. No body required.
 */
import { revalidateTag, revalidatePath } from "next/cache";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";

export const POST = withStaff(async (request) => {
  try {
    revalidateTag("feeds", "max");
    // Also bust each route's static cache so the next request rebuilds
    // from scratch, not just from a fresh data fetch.
    revalidatePath("/feed/facebook.csv");
    revalidatePath("/feed/facebook.xml");
    revalidatePath("/feed/google.csv");
    revalidatePath("/feed/google.xml");
    revalidatePath("/feed/tiktok.csv");
    return jsonResponse({ ok: true, revalidated: ["feeds tag", "5 feed routes"] });
  } catch (e) {
    console.error("[Feeds] revalidate error:", e);
    return errorResponse("Failed to revalidate feeds", 500);
  }
});
