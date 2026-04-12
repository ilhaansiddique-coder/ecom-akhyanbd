import { notFound } from "next/navigation";
import type { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";

const API_URL = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/v1`;

interface LandingPageData {
  id: number;
  slug: string;
  title: string;
  hero_headline?: string;
  hero_subheadline?: string;
  hero_image?: string;
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
  }[];
}

async function getLandingPage(slug: string): Promise<LandingPageData | null> {
  try {
    const res = await fetch(`${API_URL}/landing-pages/${slug}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

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
