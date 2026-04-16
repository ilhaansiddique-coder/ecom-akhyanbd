"use client";

import { useFingerprint } from "@/hooks/useFingerprint";

/**
 * Silent component that collects browser fingerprint on every page load.
 * If the server responds with blocked=true, sets cookie for middleware.
 */
export default function FingerprintCollector() {
  useFingerprint();
  return null;
}
