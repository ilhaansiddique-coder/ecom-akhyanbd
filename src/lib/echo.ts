"use client";

// WebSocket disabled — Laravel Reverb removed in full-stack Next.js conversion.
// This is a no-op stub to prevent import errors.

export function getEcho() {
  return {
    channel: () => ({
      listen: () => ({}),
      stopListening: () => {},
    }),
  };
}
