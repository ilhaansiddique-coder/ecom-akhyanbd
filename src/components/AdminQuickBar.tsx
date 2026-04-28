"use client";

import Link from "next/link";
import { FiExternalLink, FiShield, FiX } from "react-icons/fi";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";

/**
 * Slim banner shown across the storefront ONLY when the logged-in user is
 * an admin or staff member. Gives one-click access back to the dashboard
 * without leaving them stranded on the customer-facing site.
 *
 * Hidden for:
 *   - Guests (no session)
 *   - Regular customers (role !== "admin" / "staff")
 *   - Anyone already inside /dashboard (handled by the parent — this
 *     component is only mounted on storefront paths)
 *
 * Dismissable per session (stored in sessionStorage so it reappears on next
 * browser restart — important so the admin doesn't lose the link forever).
 */
export default function AdminQuickBar() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid SSR flash

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(sessionStorage.getItem("adminQuickBarDismissed") === "1");
  }, []);

  if (!user) return null;
  const role = user.role;
  if (role !== "admin" && role !== "staff") return null;
  if (dismissed) return null;

  const isAdmin = role === "admin";
  const roleLabel = lang === "en"
    ? (isAdmin ? "Admin" : "Staff")
    : (isAdmin ? "অ্যাডমিন" : "স্টাফ");
  const greeting = lang === "en"
    ? `You're signed in as ${roleLabel}`
    : `আপনি ${roleLabel} হিসেবে লগইন আছেন`;
  const goToDashboard = lang === "en" ? "Go to Dashboard" : "ড্যাশবোর্ডে যান";
  const dismissLabel = lang === "en" ? "Dismiss" : "বন্ধ করুন";

  const onDismiss = () => {
    sessionStorage.setItem("adminQuickBarDismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="bg-primary text-white text-sm">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FiShield className="w-4 h-4 shrink-0" />
          <span className="font-medium truncate">{greeting}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 hover:bg-white/25 rounded-md text-xs font-semibold transition-colors"
          >
            <FiExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{goToDashboard}</span>
            <span className="sm:hidden">{lang === "en" ? "Dashboard" : "ড্যাশবোর্ড"}</span>
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel}
            title={dismissLabel}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
