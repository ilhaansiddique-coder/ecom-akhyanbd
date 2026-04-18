import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import HomepageClient from "./HomepageClient";

export const dynamic = "force-dynamic";

const DEFAULT_CONTENT = {
  hero: { badge: "", title: "", subtitle: "", description: "", cta_primary: "", cta_secondary: "", trust_1: "", trust_2: "", trust_3: "", hero_logo: "", floating_tags: [{ emoji: "🌿", label: "" }, { emoji: "🍵", label: "" }, { emoji: "❤️", label: "" }] },
  features: [
    { icon: "truck", title: "", description: "" },
    { icon: "headphones", title: "", description: "" },
    { icon: "shield", title: "", description: "" },
    { icon: "refresh", title: "", description: "" },
  ],
  reviews: { title: "", subtitle: "", testimonials: [{ name: "", rating: 5, text: "" }, { name: "", rating: 5, text: "" }, { name: "", rating: 5, text: "" }] },
};

export default async function HomepagePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "homepage_content" } });
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        const content = {
          ...DEFAULT_CONTENT,
          ...parsed,
          hero: { ...DEFAULT_CONTENT.hero, ...parsed.hero },
          reviews: { ...DEFAULT_CONTENT.reviews, ...parsed.reviews },
        };
        return <HomepageClient initialData={content} />;
      } catch { /* */ }
    }
    return <HomepageClient initialData={DEFAULT_CONTENT} />;
  } catch {
    return <HomepageClient initialData={DEFAULT_CONTENT} />;
  }
}
