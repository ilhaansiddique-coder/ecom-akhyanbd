export interface Product {
  id: number;
  name: string;
  nameBn: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  categoryBn: string;
  category_id?: number;
  category_slug?: string;
  brand_id?: number;
  badge?: string;
  badgeColor?: string;
  description?: string;
  descriptionBn?: string;
}

const API_BASE = "";

/** Resolve image path — prepend API base URL for relative /storage/ paths */
function resolveImage(raw: unknown): string {
  const img = (raw as string) || "/placeholder.svg";
  if (img.startsWith("/storage/")) return `${API_BASE}${img}`;
  return img;
}

/** Map a raw API product (snake_case) to the frontend Product interface */
export function mapApiProduct(p: Record<string, unknown>): Product {
  const cat = p.category as { id?: number; name?: string; slug?: string } | string | null;
  const catName = typeof cat === "string" ? cat : cat?.name || "";
  const catObj = typeof cat === "object" && cat ? cat : null;
  return {
    id: p.id as number,
    name: (p.name as string) || "",
    nameBn: (p.name_bn as string) || (p.nameBn as string) || (p.name as string) || "",
    slug: (p.slug as string) || "",
    price: Number(p.price) || 0,
    originalPrice: p.original_price != null ? Number(p.original_price) : undefined,
    image: resolveImage(p.image),
    category: catName,
    categoryBn: catName,
    category_id: (p.category_id as number) || catObj?.id as number || undefined,
    category_slug: (p.category_slug as string) || catObj?.slug || undefined,
    brand_id: (p.brand_id as number) || undefined,
    badge: (p.badge as string) || undefined,
    badgeColor: (p.badge_color as string) || undefined,
    description: (p.description as string) || undefined,
    descriptionBn: (p.description_bn as string) || (p.descriptionBn as string) || (p.description as string) || undefined,
  };
}

export const products: Product[] = [];

export const flashSaleProducts: Product[] = [];
export const latestProducts: Product[] = [];
export const topRatedProducts: Product[] = [];
