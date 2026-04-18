import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import LandingPagesClient from "./LandingPagesClient";

export const dynamic = "force-dynamic";

function parseSectionVisibility(raw: string | null | undefined): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>;
    }
  } catch { /* fall through */ }
  return {};
}

export default async function LandingPagesPage() {
  const user = await getSessionUser();
  if (!user || !isStaffOrAdmin(user.role)) redirect("/cdlogin");

  try {
    const data = await prisma.landingPage.findMany({
      orderBy: { createdAt: "desc" },
    });

    const items = data.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      is_active: p.isActive,
      primary_color: p.primaryColor ?? "var(--primary)",
      hero_headline: p.heroHeadline ?? "",
      hero_subheadline: p.heroSubheadline ?? "",
      hero_image: p.heroImage ?? "",
      hero_video_autoplay: p.heroVideoAutoplay ?? false,
      hero_cta: p.heroCta ?? "",
      hero_trust_text: p.heroTrustText ?? "",
      hero_badge: p.heroBadge ?? "",
      problem_title: p.problemTitle ?? "",
      problem_points: p.problemPoints ?? "",
      features: p.features ?? "",
      testimonials: p.testimonials ?? "",
      how_it_works: p.howItWorks ?? "",
      faq: p.faq ?? "",
      products: p.products ?? "",
      products_title: p.productsTitle ?? "",
      // `products_subtitle` and `how_it_works_subtitle` aren't on the Prisma
      // model (only checkoutSubtitle is). Client form has slots for them so
      // pass empty strings; saves are still accepted but not persisted.
      products_subtitle: "",
      features_title: p.featuresTitle ?? "",
      features_image: p.featuresImage ?? "",
      testimonials_title: p.testimonialsTitle ?? "",
      testimonials_mode: p.testimonialsMode ?? "all_site",
      how_it_works_title: p.howItWorksTitle ?? "",
      how_it_works_subtitle: "",
      faq_title: p.faqTitle ?? "",
      checkout_title: p.checkoutTitle ?? "",
      checkout_subtitle: p.checkoutSubtitle ?? "",
      checkout_btn_text: p.checkoutBtnText ?? "",
      shipping_cost: p.shippingCost != null ? String(Number(p.shippingCost)) : "",
      custom_shipping: p.customShipping ?? false,
      show_email: p.showEmail ?? false,
      show_city: p.showCity ?? false,
      guarantee_text: p.guaranteeText ?? "",
      success_message: p.successMessage ?? "",
      meta_title: p.metaTitle ?? "",
      meta_description: p.metaDescription ?? "",
      whatsapp: p.whatsapp ?? "",
      contact_mode: p.contactMode ?? "inherit",
      // sectionVisibility is stored as a JSON-encoded string in Postgres.
      section_visibility: parseSectionVisibility(p.sectionVisibility),
    }));

    return <LandingPagesClient initialData={{ items }} />;
  } catch {
    return <LandingPagesClient initialData={{ items: [] }} />;
  }
}
