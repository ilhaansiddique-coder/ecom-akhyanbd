"use client";

import { useRouter } from "next/navigation";
import { useChannel } from "@/lib/useChannel";
import type { ReactNode } from "react";

interface LiveRefreshProps {
  /** WebSocket channel name */
  channel: string;
  /** WebSocket event name (with dot prefix) */
  event: string;
  /** Server-rendered children (shown immediately, preserved for SEO) */
  children: ReactNode;
}

/**
 * Wraps server-rendered content and listens for WebSocket events.
 * When an event fires, calls router.refresh() which re-fetches
 * all server components on the page without a full page reload.
 * No flash, no loading state — server HTML is swapped seamlessly.
 */
export default function LiveRefresh({ channel, event, children }: LiveRefreshProps) {
  const router = useRouter();

  useChannel(channel, event, () => {
    router.refresh();
  });

  return <>{children}</>;
}
