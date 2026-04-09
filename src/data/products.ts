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
  badge?: string;
  badgeColor?: string;
  description?: string;
  descriptionBn?: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1").replace(/\/api\/v1$/, "");

/** Resolve image path — prepend API base URL for relative /storage/ paths */
function resolveImage(raw: unknown): string {
  const img = (raw as string) || "/placeholder.png";
  if (img.startsWith("/storage/")) return `${API_BASE}${img}`;
  return img;
}

/** Map a raw API product (snake_case) to the frontend Product interface */
export function mapApiProduct(p: Record<string, unknown>): Product {
  const cat = p.category as { name?: string; slug?: string } | string | null;
  const catName = typeof cat === "string" ? cat : cat?.name || "";
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
