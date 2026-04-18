import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import Hero from "@/components/Hero";
import FlashSale from "@/components/FlashSale";
import AllProducts from "@/components/AllProducts";
import LazyCustomerReviews from "@/components/LazyCustomerReviews";
import Features from "@/components/Features";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { mapApiProduct } from "@/data/products";
import type { Product } from "@/data/products";
import { resolveHomeSections, HOME_SECTION_KEY } from "@/lib/page-sections";

// ISR: regenerate every 60s instead of force-dynamic
export const revalidate = 60;

interface FlashSaleData {
  title: string;
  ends_at?: string;
  products: Product[];
}

const getFlashSale = unstable_cache(
  async (): Promise<FlashSaleData | null> => {
    const now = new Date();
    const flashSale = await prisma.flashSale.findFirst({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: {
        products: {
          include: {
            product: {
              include: {
                category: { select: { id: true, name: true, slug: true } },
                brand: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    });

    if (!flashSale || !flashSale.products.length) return null;

    return {
      title: flashSale.title || "ফ্ল্যাশ সেল অফার",
      ends_at: flashSale.endsAt.toISOString(),
      products: flashSale.products.map((fp) => {
        const p = serialize(fp.product);
        const mapped = mapApiProduct(p);
        mapped.originalPrice = Number(fp.product.price) || 0;
        mapped.price = Number(fp.salePrice);
        return mapped;
      }),
    };
  },
  ["homepage-flash-sale"],
  { tags: ["products", "flash-sales"], revalidate: 60 }
);

const getProducts = unstable_cache(
  async (): Promise<{ products: Product[]; total: number }> => {
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true, name: true, slug: true, price: true, originalPrice: true,
          image: true, images: true, badge: true, badgeColor: true, weight: true,
          stock: true, unlimitedStock: true, soldCount: true, isActive: true,
          isFeatured: true, hasVariations: true, variationType: true,
          customShipping: true, shippingCost: true, sortOrder: true, createdAt: true,
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, label: true, price: true, originalPrice: true, stock: true, unlimitedStock: true, image: true, sortOrder: true },
          },
        },
        orderBy: { sortOrder: "asc" },
        take: 20,
      }),
      prisma.product.count({ where: { isActive: true } }),
    ]);

    return { products: rows.map((p) => mapApiProduct(serialize(p))), total };
  },
  ["homepage-products"],
  { tags: ["products"], revalidate: 60 }
);

const getApprovedReviews = unstable_cache(
  async () => {
    const reviews = await prisma.review.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { product: { select: { name: true } } },
    });
    return reviews.map((r) => ({ ...serialize(r), product_name: r.product?.name || "" }));
  },
  ["homepage-reviews"],
  { tags: ["reviews"], revalidate: 120 }
);

const getHomepageContent = unstable_cache(
  async () => {
    try {
      const setting = await prisma.siteSetting.findUnique({ where: { key: "homepage_content" } });
      if (setting?.value) return JSON.parse(setting.value);
    } catch { /* */ }
    return null;
  },
  ["homepage-content"],
  { tags: ["settings"], revalidate: 300 }
);

const getHomeSections = unstable_cache(
  async () => {
    try {
      const setting = await prisma.siteSetting.findUnique({ where: { key: HOME_SECTION_KEY } });
      return resolveHomeSections({ [HOME_SECTION_KEY]: setting?.value ?? null });
    } catch {
      return resolveHomeSections({});
    }
  },
  ["homepage-sections"],
  { tags: ["settings"], revalidate: 300 }
);

export default async function Home() {
  let flashSale: FlashSaleData | null = null;
  let products: Product[] = [];
  let total = 0;
  let reviews: any[] = [];
  let homepageContent: any = null;
  let sections = resolveHomeSections({});

  try {
    [flashSale, { products, total }, reviews, homepageContent, sections] = await Promise.all([
      getFlashSale(),
      getProducts(),
      getApprovedReviews(),
      getHomepageContent(),
      getHomeSections(),
    ]);
  } catch {
    // DB unavailable at build time — page will be empty shell, revalidated on first request
  }

  // Render sections in user-defined order, skipping disabled ones.
  return (
    <>
      {sections.filter((s) => s.enabled).map((s) => {
        switch (s.id) {
          case "hero":
            return <Hero key={s.id} content={homepageContent?.hero} />;
          case "flash_sale":
            return <FlashSale key={s.id} data={flashSale} />;
          case "all_products":
            return <AllProducts key={s.id} initialProducts={products} total={total} />;
          case "reviews":
            return (
              <Suspense key={s.id} fallback={null}>
                <LazyCustomerReviews reviews={reviews} content={homepageContent?.reviews} />
              </Suspense>
            );
          case "features":
            return <Features key={s.id} content={homepageContent?.features} />;
          default:
            return null;
        }
      })}
    </>
  );
}
