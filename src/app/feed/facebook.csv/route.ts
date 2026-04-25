import { loadFeedItems } from "@/lib/feedSource";
import { renderFacebookCsv } from "@/lib/feedRenderers";

export const revalidate = 3600;

export async function GET() {
  const items = await loadFeedItems();
  const csv = renderFacebookCsv(items);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "inline; filename=\"facebook-feed.csv\"",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
