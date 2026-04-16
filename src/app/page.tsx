import { Suspense } from "react";
import Hero from "@/components/Hero";
import FlashSale from "@/components/FlashSale";
import AllProducts from "@/components/AllProducts";
import LazyCustomerReviews from "@/components/LazyCustomerReviews";
import Features from "@/components/Features";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { mapApiProduct } from "@/data/products";
import type { Product } from "@/data/products";

// ISR: regenerate every 60s instead of force-dynamic
export const revalidate = 60;

interface FlashSaleData {
  title: string;
  ends_at?: string;
  products: Product[];
}

async function getFlashSale(): Promise<FlashSaleData | null> {
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
}

async function getProducts(): Promise<{ products: Product[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true, price: true, originalPrice: true, stock: true, unlimitedStock: true, image: true, sortOrder: true } },
      },
      orderBy: { sortOrder: "asc" },
      take: 20,
    }),
    prisma.product.count({ where: { isActive: true } }),
  ]);

  return {
    products: rows.map((p) => mapApiProduct(serialize(p))),
    total,
  };
}

async function getApprovedReviews() {
  const reviews = await prisma.review.findMany({
    where: { isApproved: true },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { product: { select: { name: true } } },
  });

  return reviews.map((r) => ({
    ...serialize(r),
    product_name: r.product?.name || "",
  }));
}

async function getHomepageContent() {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "homepage_content" } });
    if (setting?.value) return JSON.parse(setting.value);
  } catch { /* */ }
  return null;
}

export default async function Home() {
  let flashSale: FlashSaleData | null = null;
  let products: Product[] = [];
  let total = 0;
  let reviews: any[] = [];
  let homepageContent: any = null;

  try {
    [flashSale, { products, total }, reviews, homepageContent] = await Promise.all([
      getFlashSale(),
      getProducts(),
      getApprovedReviews(),
      getHomepageContent(),
    ]);
  } catch {
    // DB unavailable at build time — page will be empty shell, revalidated on first request
  }

  return (
    <>
      <Hero content={homepageContent?.hero} />
      <FlashSale data={flashSale} />
      <AllProducts initialProducts={products} total={total} />
      <Suspense fallback={null}>
        <LazyCustomerReviews reviews={reviews} content={homepageContent?.reviews} />
      </Suspense>
      <Features content={homepageContent?.features} />
    </>
  );
}
