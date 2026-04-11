"use client";

import { useRef, useCallback } from "react";

const API_URL = "/api/v1";

/**
 * Hook that auto-generates a slug from Bengali/English text via the backend API.
 * Debounces calls and falls back to client-side slug if API fails.
 *
 * Usage:
 *   const generateSlug = useAutoSlug();
 *   const handleNameChange = (name: string) => {
 *     setForm(f => ({ ...f, name }));
 *     if (!editMode) generateSlug(name, (slug) => setForm(f => ({ ...f, slug })));
 *   };
 */
export function useAutoSlug(debounceMs = 400) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const generate = useCallback((name: string, onSlug: (slug: string) => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!name.trim()) {
      onSlug("");
      return;
    }

    // Instant client-side fallback (basic)
    const clientSlug = name.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    onSlug(clientSlug);

    // Debounced API call for proper Bengali transliteration
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/admin/generate-slug`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.slug) onSlug(data.slug);
        }
      } catch {
        // Keep the client-side slug
      }
    }, debounceMs);
  }, [debounceMs]);

  return generate;
}
