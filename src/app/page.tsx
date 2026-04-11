import { Suspense } from "react";
import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import FlashSale from "@/components/FlashSale";
import LatestProducts from "@/components/LatestProducts";
import AdBanners from "@/components/AdBanners";
import TopRatedProducts from "@/components/TopRatedProducts";
import LazyCustomerReviews from "@/components/LazyCustomerReviews";
import Features from "@/components/Features";
import { mapApiProduct, latestProducts as staticLatest, topRatedProducts as staticTopRated } from "@/data/products";
import type { Product } from "@/data/products";

const API_URL = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/v1`;

const emojiMap: Record<string, string> = {
  "ভেষজ গুঁড়ো": "🌿", "ভেষজ চা": "🍵", "হার্ট কেয়ার": "❤️",
  "চুলের যত্ন": "💇", "কম্বো প্যাক": "📦", "ভেষজ মিশ্রণ": "🧪",
};

const colorMap: Record<string, string> = {
  "ভেষজ গুঁড়ো": "from-green-50 to-green-100", "ভেষজ চা": "from-amber-50 to-amber-100",
  "হার্ট কেয়ার": "from-red-50 to-red-100", "চুলের যত্ন": "from-purple-50 to-purple-100",
  "কম্বো প্যাক": "from-orange-50 to-orange-100", "ভেষজ মিশ্রণ": "from-teal-50 to-teal-100",
};

const fallbackCategories = [
  { name: "ভেষজ গুঁড়ো", emoji: "🌿", slug: "herbal-powder", color: "from-green-50 to-green-100" },
  { name: "ভেষজ চা", emoji: "🍵", slug: "herbal-tea", color: "from-amber-50 to-amber-100" },
  { name: "হার্ট কেয়ার", emoji: "❤️", slug: "heart-care", color: "from-red-50 to-red-100" },
  { name: "চুলের যত্ন", emoji: "💇", slug: "hair-care", color: "from-purple-50 to-purple-100" },
  { name: "কম্বো প্যাক", emoji: "📦", slug: "combo-pack", color: "from-orange-50 to-orange-100" },
  { name: "সকল পণ্য", emoji: "🛒", slug: "all", color: "from-lime-50 to-lime-100" },
];

async function fetchCategories() {
  try {
    const res = await fetch(`${API_URL}/categories`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300, tags: ["categories"] },
    });
    if (!res.ok) return fallbackCategories;
    const data = await res.json();
    const cats = Array.isArray(data) ? data : data.data || [];
    if (cats.length === 0) return fallbackCategories;
    const mapped = cats.map((c: { id?: number; name: string; slug: string; image?: string; products_count?: number }) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image || null,
      products_count: c.products_count || 0,
      emoji: emojiMap[c.name] || "📦",
      color: colorMap[c.name] || "from-gray-50 to-gray-100",
    }));
    return mapped;
  } catch {
    return fallbackCategories;
  }
}

interface FlashSaleData {
  title: string;
  ends_at?: string;
  products: Product[];
}

async function fetchFlashSale(): Promise<FlashSaleData | null> {
  try {
    const res = await fetch(`${API_URL}/flash-sales/active`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60, tags: ["flash-sales"] },
    });
    if (!res.ok) return null;
    const sale = await res.json();
    if (!sale || !sale.products || sale.products.length === 0) return null;
    return {
      title: sale.title || "ফ্ল্যাশ সেল অফার",
      ends_at: sale.ends_at,
      products: sale.products.map((p: Record<string, unknown>) => {
        const mapped = mapApiProduct(p);
        const salePrice = (p.pivot as { sale_price?: number })?.sale_price;
        if (salePrice) {
          mapped.originalPrice = Number(p.price) || 0;
          mapped.price = Number(salePrice);
        }
        return mapped;
      }),
    };
  } catch {
    return null;
  }
}

async function fetchLatestProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/products?sort_by=created_at&sort_dir=desc&per_page=4`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300, tags: ["products"] },
    });
    if (!res.ok) return staticLatest;
    const json = await res.json();
    const data = json.data || json;
    if (Array.isArray(data) && data.length > 0) return data.map(mapApiProduct);
    return staticLatest;
  } catch {
    return staticLatest;
  }
}

async function fetchTopRatedProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/products/top-rated`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300, tags: ["products", "top-rated"] },
    });
    if (!res.ok) return staticTopRated;
    const json = await res.json();
    const data = json.data || json;
    if (Array.isArray(data) && data.length > 0) return data.map(mapApiProduct);
    return staticTopRated;
  } catch {
    return staticTopRated;
  }
}

async function fetchBanners() {
  try {
    const res = await fetch(`${API_URL}/banners`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600, tags: ["banners"] },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch {
    return [];
  }
}

async function fetchApprovedReviews() {
  try {
    // Fetch all products, then get reviews for each — or use a simpler approach:
    // Get all approved reviews from the admin endpoint (public-facing)
    const res = await fetch(`${API_URL}/reviews/approved`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300, tags: ["reviews"] },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch {
    return [];
  }
}

/* ---------- Independent async section components ---------- */

async function CategoriesSection() {
  const categories = await fetchCategories();
  return <Categories categories={categories} />;
}

async function FlashSaleSection() {
  const flashSale = await fetchFlashSale();
  return <FlashSale data={flashSale} />;
}

async function LatestProductsSection() {
  const products = await fetchLatestProducts();
  return <LatestProducts products={products} />;
}

async function TopRatedProductsSection() {
  const products = await fetchTopRatedProducts();
  return <TopRatedProducts products={products} />;
}

async function BannersSection() {
  const banners = await fetchBanners();
  return <AdBanners banners={banners} />;
}

async function ReviewsSection() {
  const reviews = await fetchApprovedReviews();
  return <LazyCustomerReviews reviews={reviews} />;
}

/* ---------- Lightweight skeleton placeholders ---------- */

function CategorySkeleton() {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="h-8 bg-gray-100 rounded-lg w-32 mx-auto animate-pulse" />
          <div className="h-4 bg-gray-50 rounded w-48 mx-auto mt-4 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gray-100 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-16 mt-3 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductsSkeleton() {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="h-8 bg-gray-100 rounded-lg w-40 mb-10 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-5 bg-gray-100 rounded w-1/3" />
                <div className="h-10 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Page: Hero streams instantly, sections stream as data arrives ---------- */

export default function Home() {
  return (
    <>
      <Hero />
      <Suspense fallback={<CategorySkeleton />}>
        <CategoriesSection />
      </Suspense>
      <Suspense fallback={null}>
        <FlashSaleSection />
      </Suspense>
      <Suspense fallback={<ProductsSkeleton />}>
        <LatestProductsSection />
      </Suspense>
      <Suspense fallback={null}>
        <BannersSection />
      </Suspense>
      <Suspense fallback={<ProductsSkeleton />}>
        <TopRatedProductsSection />
      </Suspense>
      <Suspense fallback={null}>
        <ReviewsSection />
      </Suspense>
      <Features />
    </>
  );
}
