import { loadFeedItems } from "@/lib/feedSource";
import { renderGoogleCsv } from "@/lib/feedRenderers";

export const revalidate = 3600;

export async function GET() {
  const items = await loadFeedItems();
  const csv = renderGoogleCsv(items);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "inline; filename=\"google-feed.csv\"",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
