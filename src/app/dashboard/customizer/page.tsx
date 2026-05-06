import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { snapshotTokens, TOKEN_KEYS } from "@/lib/theme-tokens";
import { snapshotOptions, OPTION_KEYS } from "@/lib/theme-options";
import { resolveHomeSections, PAGE_SECTION_KEYS } from "@/lib/page-sections";
import { HOMEPAGE_CONTENT_KEY, parseHomepageContent } from "@/lib/page-content";
import { BRANDING_KEYS, snapshotBranding } from "@/lib/site-branding";
import { getSessionUser } from "@/lib/auth";
import CustomizerClient from "./CustomizerClient";

export const dynamic = "force-dynamic";

export default async function CustomizerPage() {
  // Server-side admin guard â€” bypass the dashboard shell, so we can't rely on
  // the client-side redirect that DashboardLayoutShell normally provides.
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/");

  // Pre-load tokens, options, and per-page section configs so the customizer
  // opens with the user's current values populated (no flash of defaults).
  const allKeys = [...TOKEN_KEYS, ...OPTION_KEYS, ...PAGE_SECTION_KEYS, ...BRANDING_KEYS, HOMEPAGE_CONTENT_KEY];
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: allKeys } } });
  const settings: Record<string, string | null> = {};
  for (const r of rows) settings[r.key] = r.value ?? null;
  const initialTokens = snapshotTokens(settings);
  const initialOptions = snapshotOptions(settings);
  const initialSections = {
    home: resolveHomeSections(settings),
  };
  const initialContent = {
    home: parseHomepageContent(settings[HOMEPAGE_CONTENT_KEY]),
  };
  const initialBranding = snapshotBranding(settings);

  return (
    <CustomizerClient
      initialTokens={initialTokens}
      initialOptions={initialOptions}
      initialSections={initialSections}
      initialContent={initialContent}
      initialBranding={initialBranding}
    />
  );
}


