import { DashboardLayoutShell } from "@/components/DashboardLayout";
import PwaRegister from "@/components/dashboard/PwaRegister";

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
