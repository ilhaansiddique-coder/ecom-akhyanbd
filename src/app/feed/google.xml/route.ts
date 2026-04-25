import { loadFeedItems, loadFeedDefaults } from "@/lib/feedSource";
import { renderRssXml } from "@/lib/feedRenderers";

export const revalidate = 3600;

export async function GET() {
  const [items, defaults] = await Promise.all([loadFeedItems(), loadFeedDefaults()]);
  const xml = renderRssXml(items, {
    title: `${defaults.brand} — Google Merchant Center Feed`,
    link: defaults.baseUrl,
    description: `Product catalog for ${defaults.brand}`,
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
