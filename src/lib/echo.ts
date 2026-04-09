"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).Pusher = Pusher;
}

type EchoInstance = InstanceType<typeof Echo<"reverb">>;

let echoInstance: EchoInstance | null = null;

export function getEcho(): EchoInstance {
  if (echoInstance) return echoInstance;

  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  const host = process.env.NEXT_PUBLIC_REVERB_HOST || "localhost";
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT || 6001);
  const useTLS = process.env.NEXT_PUBLIC_REVERB_SCHEME === "https";

  if (!key) {
    console.warn("[Echo] NEXT_PUBLIC_REVERB_APP_KEY is not set. WebSocket disabled.");
  }

  echoInstance = new Echo({
    broadcaster: "reverb",
    key: key || "",
    wsHost: host,
    wsPort: useTLS ? 443 : port,
    wssPort: useTLS ? 443 : port,
    forceTLS: useTLS,
    enabledTransports: useTLS ? ["wss"] : ["ws"],
    encrypted: useTLS,
    disableStats: true,
    cluster: "",
  });

  return echoInstance;
}
