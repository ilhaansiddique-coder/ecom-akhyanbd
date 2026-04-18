import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import LandingPageClient from "./LandingPageClient";

// ISR: regenerate every 5 minutes. Landing pages change rarely; admin mutations
// can call revalidateTag(`landing-page:${slug}`) for instant updates.
export const revalidate = 300;
export const dynamicParams = true;

interface LandingPageData {
  id: number;
  slug: string;
  title: string;
  hero_headline?: string;
  hero_subheadline?: string;
  hero_image?: string;
  hero_video_autoplay?: boolean;
  hero_cta?: string;
  hero_trust_text?: string;
  problem_title?: string;
  problem_points?: string;
  features?: string;
  testimonials?: string;
  how_it_works?: string;
  faq?: string;
  products?: string;
  guarantee_text?: string;
  success_message?: string;
  meta_title?: string;
  meta_description?: string;
  primary_color?: string;
  contact_mode?: string;
  whatsapp?: string;
  resolved_products?: {
    id: number;
    name: string;
    slug: string;
    price: number;
    original_price?: number;
    image: string;
    description?: string;
    stock: number;
    selected_quantity: number;
    has_variations?: boolean;
    variation_type?: string;
    custom_shipping?: boolean;
    shipping_cost?: number;
    variants?: { id: number; label: string; price: number; original_price?: number; stock: number; image?: string; isActive?: boolean }[];
  }[];
}

// React `cache()` dedupes per request: generateMetadata + the page itself
// share one DB read instead of two. We hit Prisma directly (no HTTP hop) so
// the page works regardless of NEXTAUTH_URL / hosting domain config.
const getLandingPage = cache(async (slug: string): Promise<LandingPageData | null> => {
  try {
    const page = await prisma.landingPage.findFirst({
      where: { slug, isActive: true },
    });
    if (!page) return null;

    // Resolve products referenced by ID inside the `products` JSON column.
    let resolvedProducts: Record<string, unknown>[] = [];
    if (page.products) {
      try {
        const productEntries = JSON.parse(page.products) as { product_id: number; quantity?: number }[];
        const productIds = productEntries.map((p) => p.product_id);
        if (productIds.length > 0) {
          const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            include: {
              category: true,
              variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
            },
          });
          resolvedProducts = productEntries
            .map((entry) => {
              const product = products.find((p) => p.id === entry.product_id);
              if (!product) return null;
              return {
                ...serialize(product),
                selected_quantity: entry.quantity || 1,
              };
            })
            .filter(Boolean) as Record<string, unknown>[];
        }
      } catch {
        // Malformed products JSON — render the page without products rather than 404.
      }
    }

    return {
      ...(serialize(page) as Record<string, unknown>),
      resolved_products: resolvedProducts,
    } as LandingPageData;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLandingPage(slug);
  if (!page) return {};
  return {
    title: page.meta_title || page.hero_headline || page.title,
    description: page.meta_description || page.hero_subheadline || "",
  };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getLandingPage(slug);
  if (!page) notFound();
  return <LandingPageClient page={page} />;
}
