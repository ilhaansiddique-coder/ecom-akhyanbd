import { NextRequest } from "next/server";
import { revalidateAll } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { landingPageSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";

export const GET = withStaff(async (_request) => {
  const pages = await prisma.landingPage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return jsonResponse(pages.map(serialize));
});

export const POST = withStaff(async (request) => {
  try {
    const body = await request.json();
    const parsed = landingPageSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.title, "landingPage", data.slug);

    const page = await prisma.landingPage.create({
      data: {
        slug,
        title: data.title,
        isActive: data.is_active ?? true,
        heroHeadline: data.hero_headline || null,
        heroSubheadline: data.hero_subheadline || null,
        heroImage: data.hero_image || null,
        heroVideoAutoplay: data.hero_video_autoplay ?? false,
        heroCta: data.hero_cta || null,
        heroTrustText: data.hero_trust_text || null,
        heroBadge: data.hero_badge || null,
        problemTitle: data.problem_title || null,
        problemPoints: data.problem_points || null,
        productsTitle: data.products_title || null,
        productsSub: data.products_subtitle || null,
        featuresTitle: data.features_title || null,
        featuresImage: data.features_image || null,
        features: data.features || null,
        testimonialsTitle: data.testimonials_title || null,
        testimonialsMode: data.testimonials_mode || "custom",
        testimonials: data.testimonials || null,
        howItWorksTitle: data.how_it_works_title || null,
        howItWorksSub: data.how_it_works_subtitle || null,
        howItWorks: data.how_it_works || null,
        faqTitle: data.faq_title || null,
        faq: data.faq || null,
        products: data.products || null,
        checkoutTitle: data.checkout_title || null,
        checkoutSubtitle: data.checkout_subtitle || null,
        checkoutBtnText: data.checkout_btn_text || null,
        customShipping: data.custom_shipping ?? false,
        shippingCost: data.shipping_cost != null ? Number(data.shipping_cost) : 60,
        showEmail: data.show_email ?? false,
        showCity: data.show_city ?? true,
        guaranteeText: data.guarantee_text || null,
        successMessage: data.success_message || null,
        metaTitle: data.meta_title || null,
        metaDescription: data.meta_description || null,
        whatsapp: data.whatsapp || null,
        contactMode: data.contact_mode || "inherit",
        sectionVisibility: data.section_visibility || null,
        primaryColor: data.primary_color || "#0f5931",
      },
    });

    revalidateAll("landing-pages");
    bumpVersion("landing-pages");
    return jsonResponse(serialize(page), 201);
  } catch (error) {
    console.error("Landing page create error:", error);
    return errorResponse("Failed to create landing page", 500);
  }
});
