import { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────
// Selection sets
// ─────────────────────────────────────────────────────────────────────────
// LIST view never needs variants or full category/brand rows. Pulling them
// makes a 20-row page query 150-300 join rows + every column. Tight `select`
// here cuts the payload ~50% and the query plan to a single index scan.
export const productListSelect = {
  id: true,
  name: true,
  slug: true,
  categoryId: true,
  brandId: true,
  price: true,
  originalPrice: true,
  image: true,
  badge: true,
  badgeColor: true,
  weight: true,
  stock: true,
  unlimitedStock: true,
  soldCount: true,
  isActive: true,
  isFeatured: true,
  hasVariations: true, // Flutter list cards show a "Variants" badge from this
  customShipping: true,
  shippingCost: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  // Multi-category names for Flutter product list card subtitle.
  // Capped at 8 so a product in every tag doesn't blow up payload size.
  categories: {
    take: 8,
    select: { id: true, name: true, slug: true },
  },
  // Slim variants for the Flutter product list card (chip grid showing
  // `label : stock` per variant). We only include the four fields the
  // card renders; price/sku/image/createdAt stay on the detail endpoint.
  // Capped at 24 per product so a pathological "1 SKU per color" product
  // can't blow up payload size.
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 24,
    select: {
      id: true,
      label: true,
      price: true,
      originalPrice: true,
      stock: true,
      unlimitedStock: true,
    },
  },
} satisfies Prisma.ProductSelect;

// DETAIL view keeps full description + images JSON + variants array. The
// detail screen is the only place that renders variant pickers and the long
// description, so these fields earn their wire cost there.
export const productDetailSelect = {
  ...productListSelect,
  description: true,
  images: true,
  variationType: true,
  categories: {
    select: { id: true, name: true, slug: true },
  },
  variants: {
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      productId: true,
      label: true,
      price: true,
      originalPrice: true,
      sku: true,
      stock: true,
      unlimitedStock: true,
      image: true,
      sortOrder: true,
      isActive: true,
    },
  },
} satisfies Prisma.ProductSelect;

export type ProductListRow = Prisma.ProductGetPayload<{ select: typeof productListSelect }>;
export type ProductDetailRow = Prisma.ProductGetPayload<{ select: typeof productDetailSelect }>;

export function shapeListProduct(p: ProductListRow) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    brandId: p.brandId,
    price: p.price,
    originalPrice: p.originalPrice,
    image: p.image,
    badge: p.badge,
    badgeColor: p.badgeColor,
    weight: p.weight,
    stock: p.stock,
    unlimitedStock: p.unlimitedStock,
    soldCount: p.soldCount,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    hasVariations: p.hasVariations,
    customShipping: p.customShipping,
    shippingCost: p.shippingCost,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt?.toISOString() ?? null,
    updatedAt: p.updatedAt?.toISOString() ?? null,
    category: p.category,
    brand: p.brand,
    // Slim variants — list cards render `label : stock` chips. Detail
    // endpoint still ships the full variant rows (price, sku, image, etc.).
    categories: p.categories,
    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      price: v.price,
      originalPrice: v.originalPrice,
      stock: v.stock,
      unlimitedStock: v.unlimitedStock,
    })),
    // description/images intentionally omitted from list — fetched by
    // /m/products/[id] when the user opens the detail screen.
  };
}

export function shapeDetailProduct(p: ProductDetailRow) {
  return {
    ...shapeListProduct(p),
    description: p.description,
    images: p.images,
    variationType: p.variationType,
    categories: p.categories,
    variants: p.variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      label: v.label,
      price: v.price,
      originalPrice: v.originalPrice,
      sku: v.sku,
      stock: v.stock,
      unlimitedStock: v.unlimitedStock,
      image: v.image,
      sortOrder: v.sortOrder,
      isActive: v.isActive,
    })),
  };
}
