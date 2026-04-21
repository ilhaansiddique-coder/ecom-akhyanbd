"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

/**
 * Mounts inside the dashboard layout. Three jobs:
 *
 * 1. Inject <link rel="manifest" href="/api/dashboard/manifest"> only when
 *    the current user is admin/staff. Customers never see the install
 *    prompt because the manifest tag is never inserted into their DOM.
 *
 * 2. Register /sw-dashboard.js with scope: '/dashboard'. The SW cannot
 *    intercept any URL outside that scope, even if it stays installed
 *    after logout.
 *
 * 3. On role loss (logout, demotion) → unregister the SW + purge its
 *    cache so a former staff member can't pull cached dashboard pages
 *    from disk after their access is revoked.
 *
 * The actual "Install" UI is in <InstallPwaButton />. This component is
 * pure side-effect and renders nothing.
 */
export default function PwaRegister() {
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === "admin" || user?.role === "staff";

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ---- 1. Manifest <link> injection ----
    const MANIFEST_ID = "akh-dashboard-manifest";
    const existing = document.getElementById(MANIFEST_ID) as HTMLLinkElement | null;

    if (isStaffOrAdmin) {
      if (!existing) {
        const link = document.createElement("link");
        link.id = MANIFEST_ID;
        link.rel = "manifest";
        link.href = "/api/dashboard/manifest";
        document.head.appendChild(link);
      }
    } else if (existing) {
      existing.remove();
    }

    // ---- 2. Service worker register / unregister ----
    if (!("serviceWorker" in navigator)) return;

    if (isStaffOrAdmin) {
      navigator.serviceWorker
        .register("/sw-dashboard.js", { scope: "/dashboard" })
        .catch((err) => {
          console.warn("[pwa] dashboard SW register failed:", err);
        });
    } else {
      // Lost access (logout / role demotion) → kill SW + cache
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => {
          if (r.scope.endsWith("/dashboard") || r.scope.endsWith("/dashboard/")) {
            // Tell the SW to drop its cache before unregistering
            r.active?.postMessage({ type: "PURGE_CACHE" });
            r.unregister().catch(() => {});
          }
        });
      });
    }
  }, [isStaffOrAdmin]);

  return null;
}
