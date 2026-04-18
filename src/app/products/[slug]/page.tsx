import { cache, Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiTruck, FiShield, FiStar } from "react-icons/fi";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { mapApiProduct, type Product } from "@/data/products";
import { toBn } from "@/utils/toBn";
import ProductCard from "@/components/ProductCard";
import { ProductGalleryWithVariants, ReviewsSection } from "@/components/ProductDetailClient";
import type { Metadata } from "next";

// ISR: regenerate every 5 minutes (was 60s — too aggressive, kills static cache).
export const revalidate = 300;
export const dynamicParams = true;

function resolveImage(img: string): string {
  if (img.startsWith("/storage/")) return img;
  return img;
}

// React `cache()` dedupes calls within a single request. Without this, the
// product fetch ran TWICE per request (once in generateMetadata, once in the
// page itself) — adding ~150-300ms of extra Singapore round-trip.
const getProduct = cache(async (slug: string) => {
  try {
    const decoded = decodeURIComponent(slug);
    const product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { slug: decoded }] },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand:    { select: { id: true, name: true, slug: true } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!product) return null;
    return serialize(product);
  } catch {
    return null;
  }
});

export async function generateStaticParams() {
  try {
    // Pre-render up to 500 active products at build time so the most popular
    // slugs serve from the static cache instead of cold-starting Prisma.
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true },
      take: 500,
    });
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "পণ্য পাওয়া যায়নি" };

  const name = product.name_bn || product.name;
  const desc = product.description_bn || product.description || "";

  return {
    title: name,
    description: desc.slice(0, 160) || `${name} — অর্ডার করুন।`,
    openGraph: {
      title: name,
      description: desc.slice(0, 160) || name,
      images: product.image?.startsWith("http") ? [product.image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = await getProduct(slug);

  if (!raw) notFound();

  const product = {
    id: raw.id as number,
    name: (raw.name as string) || "",
    nameBn: (raw.name_bn as string) || (raw.name as string) || "",
    price: Number(raw.price) || 0,
    originalPrice: raw.original_price != null ? Number(raw.original_price) : undefined,
    image: resolveImage((raw.image as string) || "/placeholder.svg"),
    category: typeof raw.category === "string" ? raw.category : (raw.category as { name?: string })?.name || "",
    categoryBn: typeof raw.category === "string" ? raw.category : (raw.category as { name?: string })?.name || "",
    badge: (raw.badge as string) || undefined,
    badgeColor: (raw.badge_color as string) || undefined,
    description: (raw.description as string) || "",
    descriptionBn: (raw.description_bn as string) || (raw.description as string) || "",
    images: Array.isArray(raw.images) && raw.images.length > 0 ? (raw.images as string[]).map(resolveImage) : [],
    stock: Number(raw.stock) || 0,
    unlimitedStock: Boolean(raw.unlimited_stock),
    hasVariations: raw.has_variations || false,
    variationType: (raw.variation_type as string) || "",
    variants: Array.isArray(raw.variants) ? raw.variants.map((v: any) => ({
      id: v.id,
      label: v.label,
      price: Number(v.price),
      original_price: v.original_price != null ? Number(v.original_price) : undefined,
      stock: Number(v.stock) || 0,
      unlimited_stock: v.unlimited_stock || false,
      image: v.image ? resolveImage(v.image) : undefined,
    })) : [],
  };

  const displayName = product.nameBn || product.name;
  const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  // Brand name for JSON-LD — avoid a separate DB round-trip just for this.
  // Falls back to env or a static default; not worth a query per page render.
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Site";
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayName,
    description: product.descriptionBn || product.description || "",
    image: product.image.startsWith("http") ? product.image : `${SITE_URL}${product.image}`,
    url: `${SITE_URL}/products/${slug}`,
    brand: { "@type": "Brand", name: siteName },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "BDT",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/products/${slug}`,
      ...(product.originalPrice ? { priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] } : {}),
    },
    ...(product.categoryBn ? { category: product.categoryBn } : {}),
  };

  return (
    <section className="py-8 md:py-12 bg-background-alt min-h-[70vh]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="hover:text-primary transition-colors">হোম</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-primary transition-colors">শপ</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-48">{displayName}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <ProductGalleryWithVariants
            mainImage={product.image}
            images={product.images}
            alt={displayName}
            productId={product.id}
            productName={displayName}
            price={product.price}
            productStock={product.stock}
            productUnlimitedStock={product.unlimitedStock}
            hasVariations={product.hasVariations}
            variationType={product.variationType}
            variants={product.variants}
            galleryOverlay={<>
              {discount > 0 && (
                <span className="absolute top-4 right-4 z-10 bg-sale-red text-white text-sm font-bold px-3 py-1.5 rounded-full" suppressHydrationWarning>-{toBn(discount)}%</span>
              )}
              {product.badge && (
                <span className={`absolute top-4 left-4 z-10 ${product.badgeColor || "bg-primary"} text-white text-sm font-bold px-3 py-1.5 rounded-full`}>{product.badge}</span>
              )}
            </>}
            detailsTop={<>
              {product.categoryBn && (
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-3">
                  {product.categoryBn}
                </span>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{displayName}</h1>
              {!product.hasVariations && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-3xl font-bold text-primary" suppressHydrationWarning>৳{toBn(product.price)}</span>
                  {product.originalPrice && (
                    <span className="text-xl text-text-light line-through" suppressHydrationWarning>৳{toBn(product.originalPrice)}</span>
                  )}
                  {discount > 0 && (
                    <span className="text-sm font-bold text-sale-red bg-sale-red/10 px-2.5 py-1 rounded-lg" suppressHydrationWarning>{toBn(discount)}% ছাড়</span>
                  )}
                </div>
              )}
            </>}
            detailsBottom={
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { icon: FiTruck, text: "দ্রুত ডেলিভারি" },
                  { icon: FiShield, text: "ত্বক-বান্ধব" },
                  { icon: FiStar, text: "প্রিমিয়াম মান" },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-border">
                    <b.icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-medium text-text-body">{b.text}</span>
                  </div>
                ))}
              </div>
            }
          />
        </div>

        {product.descriptionBn && (
          <div className="mt-10 bg-white rounded-2xl border border-border p-6 md:p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">পণ্যের বিবরণ</h2>
            <div className="text-text-body leading-relaxed whitespace-pre-line">{product.descriptionBn}</div>
          </div>
        )}

        <ReviewsSection productId={product.id} />

        {/* Related products stream in separately — the main product paints
            the moment its own query resolves; this section can take its time
            without blocking the rest of the page. */}
        <Suspense fallback={<RelatedSkeleton />}>
          <RelatedProducts categoryId={raw.category_id as number} excludeId={product.id} />
        </Suspense>
      </div>
    </section>
  );
}

// ─── Related products: own async server component, own Suspense boundary ───

async function RelatedProducts({ categoryId, excludeId }: { categoryId: number; excludeId: number }) {
  let related: Product[] = [];
  try {
    const relatedRows = await prisma.product.findMany({
      where: { isActive: true, categoryId, id: { not: excludeId } },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true, price: true, originalPrice: true, stock: true, unlimitedStock: true, image: true, sortOrder: true } },
      },
      orderBy: { sortOrder: "asc" },
      take: 4,
    });
    related = relatedRows.map((p) => mapApiProduct(serialize(p)));
  } catch {}

  if (related.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold text-foreground mb-6">সম্পর্কিত পণ্য</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function RelatedSkeleton() {
  return (
    <div className="mt-12">
      <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="aspect-square w-full bg-gray-200 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-1/2 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
