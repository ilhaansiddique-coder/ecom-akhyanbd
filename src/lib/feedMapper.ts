/**
 * Canonical product → feed item mapper.
 *
 * Each `FeedItem` is one row in the feed. Variants get exploded into
 * separate rows that share the same `item_group_id` so Facebook / Google
 * Dynamic Ads can show "size M" and "size L" as variants of the same
 * product — clicking on a specific size lands on the parent product page
 * with a query selector (the storefront product page reads `?variant=...`
 * if needed; for now both variants link to the same product slug).
 *
 * Out-of-stock items are NOT excluded — feeds keep them with
 * availability="out of stock" so retargeting audiences stay intact.
 *
 * Sale prices come from active FlashSales: when a product has a
 * FlashSaleProduct row inside the live window, sale_price + the effective
 * date range get populated. FB/Google then render the strike-through
 * price treatment in ads.
 */

export interface FeedItem {
  id: string;
  itemGroupId: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  availability: "in stock" | "out of stock" | "preorder";
  price: string;          // e.g. "550.00 BDT"
  salePrice: string | null;
  salePriceEffectiveDate: string | null; // ISO range "<from>/<to>"
  brand: string;
  condition: "new" | "refurbished" | "used";
  identifierExists: "no";
  googleProductCategory: string | null;
  // Variant-only fields. Empty for simple products.
  color: string | null;
  size: string | null;
  // Optional categorisation we always pass through when set.
  productType: string | null; // e.g. "Apparel > Kids > Pants"
}

export interface FeedDefaults {
  brand: string;
  condition: "new" | "refurbished" | "used";
  googleProductCategory: string | null;
  baseUrl: string;        // e.g. "https://akhiyanbd.com" — drives link + image
  currency: string;       // "BDT"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProductLike = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VariantLike = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlashSaleLike = any;

/**
 * Resolve image URL. Stored values are sometimes bare paths ("uploads/x.webp"),
 * sometimes leading-slash paths ("/uploads/x.webp"), sometimes full CDN URLs.
 * Normalise everything to an absolute URL using baseUrl.
 */
export function absoluteImage(raw: string | null | undefined, baseUrl: string): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return baseUrl.replace(/\/$/, "") + trimmed;
  return baseUrl.replace(/\/$/, "") + "/" + trimmed;
}

/**
 * Pick the active flash-sale price for a product, if any. Picks the lowest
 * sale_price when multiple are stacked (rare but possible).
 */
function activeFlashSale(flashSales: FlashSaleLike[] | null | undefined): { salePrice: number; from: Date; to: Date } | null {
  if (!Array.isArray(flashSales)) return null;
  const now = Date.now();
  let best: { salePrice: number; from: Date; to: Date } | null = null;
  for (const fsp of flashSales) {
    const fs = fsp.flashSale;
    if (!fs?.isActive) continue;
    const from = fs.startsAt instanceof Date ? fs.startsAt : new Date(fs.startsAt);
    const to = fs.endsAt instanceof Date ? fs.endsAt : new Date(fs.endsAt);
    if (now < from.getTime() || now > to.getTime()) continue;
    const sp = Number(fsp.salePrice);
    if (!Number.isFinite(sp) || sp <= 0) continue;
    if (!best || sp < best.salePrice) best = { salePrice: sp, from, to };
  }
  return best;
}

/**
 * Plain-text-ify HTML descriptions so feeds get clean copy. FB rejects
 * scripts; Google strips most HTML; safer to send plain text everywhere.
 * We collapse whitespace + cap at 5000 chars (FB hard limit).
 */
function plainText(html: string | null | undefined): string {
  if (!html) return "";
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

function isInStock(stock: number, unlimited: boolean | null | undefined): boolean {
  return !!unlimited || stock > 0;
}

function fmtMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

function fmtRange(from: Date, to: Date): string {
  // ISO 8601 interval — FB + Google both accept this format.
  return `${from.toISOString().slice(0, 19) + "+00:00"}/${to.toISOString().slice(0, 19) + "+00:00"}`;
}

/**
 * Map a single product (with variants + flashSales loaded) into one or more
 * feed items.  Simple products → 1 item.  Variable products → 1 item per
 * variant, all sharing the same item_group_id.
 */
export function mapProductToFeedItems(
  product: ProductLike,
  defaults: FeedDefaults,
): FeedItem[] {
  const groupId = String(product.id);
  const productLink = `${defaults.baseUrl.replace(/\/$/, "")}/products/${product.slug}`;
  const mainImage = absoluteImage(product.image, defaults.baseUrl);
  const extraImages = (() => {
    if (!product.images) return [];
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed)) return parsed.map((i: string) => absoluteImage(i, defaults.baseUrl)).filter(Boolean);
    } catch {}
    return [];
  })();
  const description = plainText(product.description) || product.name;
  const productType = product.category?.name || null;
  const flash = activeFlashSale(product.flashSales);

  const baseItem: Omit<FeedItem, "id" | "itemGroupId" | "price" | "salePrice" | "salePriceEffectiveDate" | "availability" | "color" | "size" | "imageLink" | "additionalImageLinks"> = {
    title: product.name,
    description,
    link: productLink,
    brand: defaults.brand,
    condition: defaults.condition,
    identifierExists: "no",
    googleProductCategory: defaults.googleProductCategory,
    productType,
  };

  // Simple product (no variants) → one row.
  const variants: VariantLike[] = product.hasVariations && Array.isArray(product.variants) && product.variants.length > 0
    ? product.variants.filter((v: VariantLike) => v.isActive)
    : [];

  if (variants.length === 0) {
    const stock = Number(product.stock || 0);
    const unlimited = product.unlimitedStock;
    const inStock = isInStock(stock, unlimited);
    const basePrice = Number(product.price);
    const sale = flash;
    return [{
      ...baseItem,
      id: String(product.id),
      itemGroupId: groupId,
      imageLink: mainImage,
      additionalImageLinks: extraImages.slice(0, 10), // FB caps at 10 extra
      availability: inStock ? "in stock" : "out of stock",
      price: fmtMoney(product.originalPrice || basePrice, defaults.currency),
      salePrice: sale ? fmtMoney(sale.salePrice, defaults.currency) : (
        product.originalPrice && product.originalPrice > basePrice
          ? fmtMoney(basePrice, defaults.currency)
          : null
      ),
      salePriceEffectiveDate: sale ? fmtRange(sale.from, sale.to) : null,
      color: null,
      size: null,
    }];
  }

  // Variable product → row per variant.
  return variants.map((v: VariantLike) => {
    const stock = Number(v.stock || 0);
    const unlimited = v.unlimitedStock;
    const inStock = isInStock(stock, unlimited);
    const variantPrice = Number(v.price);
    const variantOriginal = v.originalPrice && v.originalPrice > variantPrice ? v.originalPrice : null;
    const sale = flash;
    const variantImage = v.image ? absoluteImage(v.image, defaults.baseUrl) : mainImage;
    return {
      ...baseItem,
      id: `${product.id}-v${v.id}`,
      itemGroupId: groupId,
      title: `${product.name} - ${v.label}`,
      imageLink: variantImage,
      additionalImageLinks: extraImages.slice(0, 10),
      availability: inStock ? "in stock" : "out of stock",
      price: fmtMoney(variantOriginal || variantPrice, defaults.currency),
      salePrice: sale
        ? fmtMoney(sale.salePrice, defaults.currency)
        : (variantOriginal ? fmtMoney(variantPrice, defaults.currency) : null),
      salePriceEffectiveDate: sale ? fmtRange(sale.from, sale.to) : null,
      // Variation type lives on Product ("সাইজ" / "রং" / "ওজন"). Map heuristically.
      color: /রং|color/i.test(product.variationType || "") ? v.label : null,
      size: /সাইজ|size/i.test(product.variationType || "") ? v.label : null,
    };
  });
}
