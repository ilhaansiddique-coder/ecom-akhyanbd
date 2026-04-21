"use client";

import { useEffect, useState } from "react";
import { FiDownload } from "react-icons/fi";
import { useAuth } from "@/lib/AuthContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Tiny "Install" button for the dashboard topbar. Shows ONLY when:
 *   - current user is admin/staff (role check)
 *   - browser fired beforeinstallprompt (Chrome/Edge/Android, not iOS Safari)
 *   - user hasn't already installed it
 *
 * iOS Safari has no programmatic install — users do "Share → Add to Home
 * Screen" manually. We render a tiny hint in that case (display:standalone
 * media query stays false until they install). Keep UI minimal so it
 * doesn't clutter the topbar.
 */
export default function InstallPwaButton() {
  const { user } = useAuth();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  const isStaffOrAdmin = user?.role === "admin" || user?.role === "staff";

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already running as installed PWA?
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // iOS Safari quirk
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!isStaffOrAdmin) return null;
  if (installed) return null;
  if (!promptEvent) return null; // browser not ready / already dismissed / iOS

  const handleInstall = async () => {
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "dismissed") {
        // Browser will fire beforeinstallprompt again later
      }
    } finally {
      setPromptEvent(null);
    }
  };

  return (
    <button
      type="button"
      onClick={handleInstall}
      title="Install dashboard as an app"
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
    >
      <FiDownload className="w-4 h-4" />
      <span>Install App</span>
    </button>
  );
}
