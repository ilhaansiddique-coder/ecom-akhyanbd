import type { FeedItem } from "./feedMapper";

/**
 * XML escaping for feed values. Most fields end up inside <tag>value</tag>
 * or inside CDATA — we use entity escapes either way so the same helper
 * works in both spots.
 */
function xml(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * CSV cell escaping per RFC 4180: wrap in double quotes if the cell
 * contains comma, quote, or newline; escape internal quotes by doubling.
 */
function csv(s: string | null | undefined): string {
  if (s == null) return "";
  const v = String(s);
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/**
 * Facebook / Google share the RSS 2.0 + g: namespace format. The two specs
 * disagree on a couple of optional fields, but the core 95% is identical
 * so we render one feed and use it for both. Caller passes the channel
 * title + link metadata to brand the feed for the source.
 */
export function renderRssXml(items: FeedItem[], meta: { title: string; link: string; description: string }): string {
  const itemsXml = items.map((it) => `
    <item>
      <g:id>${xml(it.id)}</g:id>
      <g:item_group_id>${xml(it.itemGroupId)}</g:item_group_id>
      <title><![CDATA[${it.title}]]></title>
      <description><![CDATA[${it.description}]]></description>
      <link>${xml(it.link)}</link>
      <g:image_link>${xml(it.imageLink)}</g:image_link>
      ${it.additionalImageLinks.map((u) => `<g:additional_image_link>${xml(u)}</g:additional_image_link>`).join("")}
      <g:availability>${xml(it.availability)}</g:availability>
      <g:price>${xml(it.price)}</g:price>
      ${it.salePrice ? `<g:sale_price>${xml(it.salePrice)}</g:sale_price>` : ""}
      ${it.salePriceEffectiveDate ? `<g:sale_price_effective_date>${xml(it.salePriceEffectiveDate)}</g:sale_price_effective_date>` : ""}
      <g:brand>${xml(it.brand)}</g:brand>
      <g:condition>${xml(it.condition)}</g:condition>
      <g:identifier_exists>${xml(it.identifierExists)}</g:identifier_exists>
      ${it.googleProductCategory ? `<g:google_product_category>${xml(it.googleProductCategory)}</g:google_product_category>` : ""}
      ${it.productType ? `<g:product_type>${xml(it.productType)}</g:product_type>` : ""}
      ${it.color ? `<g:color>${xml(it.color)}</g:color>` : ""}
      ${it.size ? `<g:size>${xml(it.size)}</g:size>` : ""}
    </item>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xml(meta.title)}</title>
    <link>${xml(meta.link)}</link>
    <description>${xml(meta.description)}</description>
${itemsXml}
  </channel>
</rss>`;
}

/**
 * Generic CSV renderer. Columns are passed in so we can emit the exact
 * header names each platform expects (Facebook uses `id`, Google uses
 * `id` too but TikTok's CSV format wants `sku_id`, etc.).
 */
export function renderCsv(items: FeedItem[], columns: string[], rowFn: (it: FeedItem) => Record<string, string | null>): string {
  const header = columns.map(csv).join(",");
  const rows = items.map((it) => {
    const row = rowFn(it);
    return columns.map((c) => csv(row[c] ?? "")).join(",");
  });
  return [header, ...rows].join("\n") + "\n";
}

/**
 * Facebook Catalog CSV. Field names per
 * https://developers.facebook.com/docs/marketing-api/catalog/reference
 * Required: id, title, description, availability, condition, price, link,
 * image_link, brand. Recommended: sale_price, item_group_id, color, size.
 */
export function renderFacebookCsv(items: FeedItem[]): string {
  const cols = [
    "id", "title", "description", "availability", "condition", "price",
    "link", "image_link", "brand", "google_product_category", "sale_price",
    "sale_price_effective_date", "item_group_id", "color", "size",
    "additional_image_link",
  ];
  return renderCsv(items, cols, (it) => ({
    id: it.id,
    title: it.title,
    description: it.description,
    availability: it.availability,
    condition: it.condition,
    price: it.price,
    link: it.link,
    image_link: it.imageLink,
    brand: it.brand,
    google_product_category: it.googleProductCategory,
    sale_price: it.salePrice,
    sale_price_effective_date: it.salePriceEffectiveDate,
    item_group_id: it.itemGroupId,
    color: it.color,
    size: it.size,
    // Facebook accepts pipe-separated additional image URLs in CSV.
    additional_image_link: it.additionalImageLinks.join(","),
  }));
}

/**
 * Google Merchant Center CSV. Same field set as Facebook with two name
 * differences: GMC accepts plural `additional_image_link` repeated OR a
 * comma-joined value. Both work.
 */
export function renderGoogleCsv(items: FeedItem[]): string {
  return renderFacebookCsv(items); // close enough — same columns, GMC accepts.
}

/**
 * TikTok Shop CSV. Their format is similar to Facebook but with a few
 * mandatory extras: `quantity` (required), `material`, `gender`, `age_group`.
 * We emit blanks for what we don't have — TT lets you upload partial feeds
 * and fill the rest in their dashboard.
 */
export function renderTiktokCsv(items: FeedItem[]): string {
  const cols = [
    "sku_id", "title", "description", "availability", "condition", "price",
    "sale_price", "link", "image_link", "additional_image_link", "brand",
    "item_group_id", "color", "size", "google_product_category",
    "age_group", "gender",
  ];
  return renderCsv(items, cols, (it) => ({
    sku_id: it.id,
    title: it.title,
    description: it.description,
    availability: it.availability,
    condition: it.condition,
    price: it.price,
    sale_price: it.salePrice,
    link: it.link,
    image_link: it.imageLink,
    additional_image_link: it.additionalImageLinks.join(","),
    brand: it.brand,
    item_group_id: it.itemGroupId,
    color: it.color,
    size: it.size,
    google_product_category: it.googleProductCategory,
    age_group: null,
    gender: null,
  }));
}
