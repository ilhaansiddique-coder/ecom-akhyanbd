"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { readOption, type OptionDef } from "./theme-options";

type Settings = Record<string, string | null>;

interface Ctx {
  /** Effective settings = initialSettings ∪ previewOverrides. */
  settings: Settings;
  /** Replace preview-mode overrides (used by PreviewBridge). */
  setPreviewOverrides: (overrides: Settings) => void;
}

const SiteSettingsContext = createContext<Ctx>({ settings: {}, setPreviewOverrides: () => {} });

export function SiteSettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings?: Settings;
}) {
  const [settings, setSettings] = useState<Settings>(initialSettings || {});
  const [overrides, setOverrides] = useState<Settings>({});
  const hasInitial = !!initialSettings && Object.keys(initialSettings).length > 0;

  useEffect(() => {
    // If we already hydrated from the server, skip the initial fetch to avoid an extra round-trip.
    if (hasInitial) return;
    api.getSettings().then((data) => setSettings(data)).catch(() => {});
  }, [hasInitial]);

  // Effective settings layer overrides on top so customizer preview wins.
  const effective = useMemo<Settings>(() => {
    if (Object.keys(overrides).length === 0) return settings;
    return { ...settings, ...overrides };
  }, [settings, overrides]);

  // Merge so the customizer can push tokens, options, and branding through
  // separate postMessage channels without clobbering one another.
  const setPreviewOverrides = useCallback(
    (next: Settings) => setOverrides((prev) => ({ ...prev, ...next })),
    []
  );

  const value = useMemo<Ctx>(() => ({ settings: effective, setPreviewOverrides }), [effective, setPreviewOverrides]);

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

/**
 * Read all site settings as a flat key/value map.
 *
 * Returns a `Record<string,string|null>` so existing callers like
 * `settings.site_name` keep working unchanged.
 */
export function useSiteSettings(): Settings {
  return useContext(SiteSettingsContext).settings;
}

/** Internal hook used by PreviewBridge to push live overrides. */
export function useSiteSettingsInternal(): Ctx {
  return useContext(SiteSettingsContext);
}

/** Typed helper for option keys (booleans, variants). */
export function useOption<T = string>(key: string): T {
  const settings = useSiteSettings();
  return readOption<T>(settings, key);
}

export type { OptionDef };
