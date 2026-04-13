import Link from "next/link";
import { notFound } from "next/navigation";
import { FiTruck, FiShield, FiStar } from "react-icons/fi";
import { products as staticProducts } from "@/data/products";
import { toBn } from "@/utils/toBn";
import ProductCard from "@/components/ProductCard";
import { AddToCartSection, ReviewsSection } from "@/components/ProductDetailClient";
import ProductGallery from "@/components/ProductGallery";
import type { Metadata } from "next";

const API_URL = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/v1`;
const API_BASE = "";

function resolveImage(img: string): string {
  if (img.startsWith("/storage/")) return `${API_BASE}${img}`;
  return img;
}

function makeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function getProduct(slug: string) {
  try {
    const res = await fetch(`${API_URL}/products/${slug}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60, tags: ["products"] },
    });
    if (res.ok) return await res.json();
  } catch {}
  // Fallback to static data
  return staticProducts.find((p) => makeSlug(p.name) === slug) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "পণ্য পাওয়া যায়নি" };

  const name = product.nameBn || product.name_bn || product.name;
  const desc = product.descriptionBn || product.description_bn || product.description || "";
  const image = product.image || "/placeholder.svg";

  return {
    title: `${name} — মা ভেষজ বাণিজ্যালয়`,
    description: desc.slice(0, 160) || `${name} — প্রাকৃতিক ভেষজ পণ্য। মা ভেষজ বাণিজ্যালয় থেকে অর্ডার করুন।`,
    openGraph: {
      title: name,
      description: desc.slice(0, 160) || `${name} — প্রাকৃতিক ভেষজ পণ্য`,
      images: image.startsWith("http") ? [image] : undefined,
    },
  };
}

// Pre-render product pages at build time for instant loading
export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/products?per_page=100`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const products = data.data || data || [];
      return products.map((p: any) => ({ slug: p.slug }));
    }
  } catch {}
  return [];
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = await getProduct(slug);

  if (!raw) notFound();

  // Normalize API (snake_case) vs static (camelCase)
  const product = {
    id: raw.id as number,
    name: (raw.name as string) || "",
    nameBn: (raw.name_bn as string) || (raw.nameBn as string) || (raw.name as string) || "",
    price: Number(raw.price) || 0,
    originalPrice: raw.original_price != null ? Number(raw.original_price) : (raw.originalPrice as number | undefined),
    image: resolveImage((raw.image as string) || "/placeholder.svg"),
    category: typeof raw.category === "string" ? raw.category : (raw.category as { name?: string })?.name || "",
    categoryBn: (raw.categoryBn as string) || (typeof raw.category === "string" ? raw.category : (raw.category as { name?: string })?.name || ""),
    badge: (raw.badge as string) || (raw.badgeColor as string) || undefined,
    badgeColor: (raw.badge_color as string) || (raw.badgeColor as string) || undefined,
    description: (raw.description as string) || "",
    descriptionBn: (raw.description_bn as string) || (raw.descriptionBn as string) || (raw.description as string) || "",
    images: Array.isArray(raw.images) && raw.images.length > 0 ? (raw.images as string[]).map(resolveImage) : [],
  };

  const displayName = product.nameBn || product.name;
  const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

  // Related products (static, same category)
  const cat = product.categoryBn || product.category;
  const related = staticProducts.filter((p) => (p.categoryBn || p.category) === cat && p.id !== product.id).slice(0, 4);

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mavesoj.com";
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayName,
    description: product.descriptionBn || product.description || "",
    image: product.image.startsWith("http") ? product.image : `${SITE_URL}${product.image}`,
    url: `${SITE_URL}/products/${slug}`,
    brand: { "@type": "Brand", name: "মা ভেষজ বাণিজ্যালয়" },
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
      {/* Product JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
          <Link href="/" className="hover:text-primary transition-colors">হোম</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-primary transition-colors">শপ</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-48">{displayName}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Image gallery */}
          <div className="relative">
            <ProductGallery mainImage={product.image} images={product.images} alt={displayName} />
            {discount > 0 && (
              <span className="absolute top-4 right-4 z-10 bg-sale-red text-white text-sm font-bold px-3 py-1.5 rounded-full" suppressHydrationWarning>-{toBn(discount)}%</span>
            )}
            {product.badge && (
              <span className={`absolute top-4 left-4 z-10 ${product.badgeColor || "bg-primary"} text-white text-sm font-bold px-3 py-1.5 rounded-full`}>{product.badge}</span>
            )}
          </div>

          {/* Details — server rendered for SEO */}
          <div>
            {product.categoryBn && (
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-3">
                {product.categoryBn}
              </span>
            )}

            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{displayName}</h1>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-3xl font-bold text-primary" suppressHydrationWarning>৳{toBn(product.price)}</span>
              {product.originalPrice && (
                <span className="text-xl text-text-light line-through" suppressHydrationWarning>৳{toBn(product.originalPrice)}</span>
              )}
              {discount > 0 && (
                <span className="text-sm font-bold text-sale-red bg-sale-red/10 px-2.5 py-1 rounded-lg" suppressHydrationWarning>{toBn(discount)}% ছাড়</span>
              )}
            </div>

            {/* Client island: Add to cart + quantity */}
            <div className="mt-6">
              <AddToCartSection productId={product.id} productName={displayName} price={product.price} image={product.image} />
            </div>

            {/* Trust badges — static */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: FiTruck, text: "দ্রুত ডেলিভারি" },
                { icon: FiShield, text: "১০০% খাঁটি" },
                { icon: FiStar, text: "সেরা মান" },
              ].map((b) => (
                <div key={b.text} className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-border">
                  <b.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-medium text-text-body">{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Description */}
        {product.descriptionBn && (
          <div className="mt-10 bg-white rounded-2xl border border-border p-6 md:p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">পণ্যের বিবরণ</h2>
            <div className="text-text-body leading-relaxed whitespace-pre-line">{product.descriptionBn}</div>
          </div>
        )}

        {/* Client island: Reviews (fetches client-side) */}
        <ReviewsSection productId={product.id} />

        {/* Related Products — server rendered */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-foreground mb-6">সম্পর্কিত পণ্য</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
