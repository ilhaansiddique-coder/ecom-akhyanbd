"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

/**
 * Mounts inside the dashboard layout. Two jobs:
 *
 * 1. Register /sw-dashboard.js with scope: '/dashboard'. The SW cannot
 *    intercept any URL outside that scope, even if it stays installed
 *    after logout.
 *
 * 2. On role loss (logout, demotion) → unregister the SW + purge its
 *    cache so a former staff member can't pull cached dashboard pages
 *    from disk after their access is revoked.
 *
 * The <link rel="manifest"> tag is rendered server-side from the dashboard
 * layout's generateMetadata so Chrome detects it on initial HTML parse
 * (client-side injection via useEffect was unreliable — Chrome had already
 * given up on installability by the time React hydrated).
 *
 * The actual "Install" UI is in <InstallPwaButton />. This component is
 * pure side-effect and renders nothing.
 */
export default function PwaRegister() {
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === "admin" || user?.role === "staff";

  useEffect(() => {
    if (typeof window === "undefined") return;
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
