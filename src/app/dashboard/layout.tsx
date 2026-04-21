import type { Metadata } from "next";
import { DashboardLayoutShell } from "@/components/DashboardLayout";
import PwaRegister from "@/components/dashboard/PwaRegister";
import { getSessionUser } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/auth-helpers";

/**
 * Server-render the <link rel="manifest"> only for staff/admin sessions.
 * Chrome's PWA install heuristic looks for the manifest link at initial
 * HTML parse time — injecting it client-side via useEffect (as the old
 * approach did) was unreliable: by the time React hydrated, Chrome had
 * often already decided the page was not installable and never fired
 * beforeinstallprompt. Putting it in metadata guarantees it ships in
 * the first response.
 *
 * Customers and logged-out visitors get NO manifest link → no install
 * prompt, no leakage that an admin PWA exists. The /api/dashboard/manifest
 * endpoint also 404s for non-staff as defense-in-depth.
 */
// generateMetadata reads cookies() via getSessionUser → layout must be dynamic.
// Without this, Next may try to prerender at build time and fail on cookies().
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const user = await getSessionUser();
    if (user && isStaffOrAdmin(user.role)) {
      return { manifest: "/api/dashboard/manifest" };
    }
  } catch {
    // Session lookup failed — treat as unauthenticated, no manifest
  }
  return {};
}

/**
 * Persistent dashboard shell — sidebar + header mount ONCE and stay mounted
 * across navigations between dashboard pages. Only the inner main content
 * unmounts/remounts (and shows loading.tsx as a fallback).
 *
 * Per-page <DashboardLayout title="..."> calls now act as no-op title-setters
 * via DashboardShellContext, so existing pages don't need to be refactored.
 */
export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayoutShell>
      {/* Registers /sw-dashboard.js + injects /api/dashboard/manifest link.
          Does nothing for non-staff users; auto-unregisters on logout. */}
      <PwaRegister />
      {children}
    </DashboardLayoutShell>
  );
}
