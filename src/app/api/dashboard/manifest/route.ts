import { NextResponse } from "next/server";
import { isStaffOrAdmin } from "@/lib/auth-helpers";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/dashboard/manifest
 *
 * Returns the dashboard PWA manifest, but ONLY for logged-in admin/staff.
 * Anyone else → 404 (not 401, so the browser silently ignores it instead
 * of showing an "auth required" dev-tools warning).
 *
 * The <link rel="manifest"> tag is only injected into the page from
 * PwaRegister.tsx when useAuth() reports staff/admin, so customers never
 * even hit this endpoint. This server check is defense-in-depth.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !isStaffOrAdmin(user.role)) {
    // Pretend it doesn't exist — no leakage that a dashboard PWA exists
    return new NextResponse("Not Found", { status: 404 });
  }

  const manifest = {
    name: "Akhiyan Dashboard",
    short_name: "Akhiyan Admin",
    description: "Manage Akhiyan store — orders, products, customers.",
    start_url: "/dashboard",
    scope: "/dashboard",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["business", "productivity"],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      // Manifest can change per-user (role) — never let a CDN cache it
      "Cache-Control": "private, no-store",
    },
  });
}
