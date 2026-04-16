/**
 * Facebook Pixel + Conversion API tracking utility.
 *
 * Every exported function fires the browser pixel event AND sends a
 * server-side POST to /api/v1/tracking/fb with the same event_id,
 * so Facebook can deduplicate browser ↔ server events.
 */

// --------------- helpers ---------------

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function genEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// --------------- pixel ID + user store ---------------

let _pixelId = "";
let _userId = "";

/** Called by FacebookPixel component after init */
export function setPixelId(id: string) {
  _pixelId = id;
}

/** Called when user logs in — enables external_id on all events */
export function setTrackingUserId(id: string | number) {
  _userId = String(id);
}

// --------------- core send ---------------

interface CustomData {
  content_ids?: string[];
  content_type?: string;
  content_name?: string;
  content_category?: string;
  contents?: { id: string | number; quantity: number; item_price?: number }[];
  currency?: string;
  value?: number;
  search_string?: string;
  num_items?: number;
  order_id?: string;
}

interface UserData {
  em?: string;       // plaintext email — hashed server-side
  ph?: string;       // plaintext phone — hashed server-side
  fn?: string;       // plaintext first name — hashed server-side
  ln?: string;       // plaintext last name — hashed server-side
  ct?: string;       // city — hashed server-side
  st?: string;       // state — hashed server-side
  zp?: string;       // postal/zip code — hashed server-side
  country?: string;  // 2-letter country code — hashed server-side
  external_id?: string;
}

export type { UserData };

function sendEvent(
  eventName: string,
  customData: CustomData = {},
  userData: UserData = {},
  clientOnly = false,
  sourceUrl?: string,
) {
  if (typeof window === "undefined") return;

  const eventId = genEventId();

  // Ensure currency is always present for events that need it
  const dataWithCurrency = { ...customData };
  if (customData.value !== undefined && !customData.currency) {
    dataWithCurrency.currency = "BDT";
  }

  // 1. Browser pixel — send event data + user data for Advanced Matching
  if (typeof window.fbq === "function") {
    // Build clean pixel custom_data (only Facebook-recognized keys)
    const PIXEL_KEYS = new Set([
      "content_ids", "content_type", "content_name", "content_category",
      "contents", "currency", "value", "search_string", "num_items",
    ]);
    const pixelData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dataWithCurrency)) {
      if (PIXEL_KEYS.has(k) && v !== undefined) pixelData[k] = v;
    }

    // Build Advanced Matching user_data for browser pixel
    // Facebook pixel accepts: em, ph, fn, ln, ct, st, zp, country, external_id
    // Values should be lowercase, trimmed (pixel hashes them automatically)
    const pixelUserData: Record<string, string> = {};
    if (userData.em) pixelUserData.em = userData.em.trim().toLowerCase();
    if (userData.ph) pixelUserData.ph = userData.ph.replace(/[^0-9]/g, "");
    if (userData.fn) pixelUserData.fn = userData.fn.trim().toLowerCase();
    if (userData.ln) pixelUserData.ln = userData.ln.trim().toLowerCase();
    if (userData.ct) pixelUserData.ct = userData.ct.trim().toLowerCase();
    if (userData.st) pixelUserData.st = userData.st.trim().toLowerCase();
    if (userData.zp) pixelUserData.zp = userData.zp.trim();
    if (userData.country) pixelUserData.country = userData.country.trim().toLowerCase();
    if (userData.external_id) pixelUserData.external_id = userData.external_id;

    // Pass Advanced Matching user_data via fbq('init') before firing event
    // Re-calling init with user data updates matching parameters
    if (Object.keys(pixelUserData).length > 0 && _pixelId) {
      window.fbq("init", _pixelId, pixelUserData);
    }

    window.fbq("track", eventName, pixelData, { eventID: eventId });
  }

  // 2. Server-side CAPI (skip for PageView — browser handles it fine)
  if (!clientOnly) {
    const eventUrl = sourceUrl || window.location.href;
    setTimeout(() => {
      const body = {
        event_name: eventName,
        event_id: eventId,
        event_source_url: eventUrl,
        custom_data: dataWithCurrency,
        user_data: {
          fbp: getCookie("_fbp"),
          fbc: getCookie("_fbc"),
          ...(_userId ? { external_id: _userId } : {}),
          ...userData,
        },
      };

      fetch("/api/v1/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {});
    }, 0);
  }
}

// --------------- public API ---------------

/** PageView — browser pixel + server CAPI */
export function trackPageView() {
  sendEvent("PageView", {}, {}, false);
}

/** Product page viewed */
export function trackViewContent(data: {
  content_ids: (string | number)[];
  content_name: string;
  content_type?: string;
  value: number;
  content_category?: string;
  sourceUrl?: string;
}) {
  sendEvent("ViewContent", {
    content_ids: data.content_ids.map(String),
    content_name: data.content_name,
    content_type: data.content_type || "product",
    contents: data.content_ids.map((id) => ({ id: String(id), quantity: 1 })),
    value: data.value,
    currency: "BDT",
    content_category: data.content_category,
  }, {}, false, data.sourceUrl);
}

/** Item added to cart */
export function trackAddToCart(data: {
  content_ids: (string | number)[];
  content_name: string;
  content_type?: string;
  value: number;
  quantity?: number;
}) {
  sendEvent("AddToCart", {
    content_ids: data.content_ids.map(String),
    content_name: data.content_name,
    content_type: data.content_type || "product",
    contents: data.content_ids.map((id) => ({ id: String(id), quantity: data.quantity || 1 })),
    value: data.value,
    currency: "BDT",
  });
}

/** Checkout page opened */
export function trackInitiateCheckout(data: {
  content_ids: (string | number)[];
  content_name?: string;
  contents?: { id: string | number; quantity: number; item_price?: number }[];
  num_items: number;
  value: number;
}, userData?: UserData) {
  sendEvent("InitiateCheckout", {
    content_ids: data.content_ids.map(String),
    content_name: data.content_name,
    content_type: "product",
    contents: data.contents || data.content_ids.map((id) => ({ id: String(id), quantity: 1 })),
    num_items: data.num_items,
    value: data.value,
    currency: "BDT",
  }, userData);
}

/** Order completed — currency + value REQUIRED by Facebook */
export function trackPurchase(data: {
  content_ids: (string | number)[];
  content_name?: string;
  contents?: { id: string | number; quantity: number; item_price?: number }[];
  num_items: number;
  value: number;
  order_id?: string;
  shipping?: number;
}, userData?: UserData) {
  if (typeof window === "undefined") return;

  const eventId = genEventId();
  const customData: CustomData = {
    content_ids: data.content_ids.map(String),
    content_name: data.content_name,
    content_type: "product",
    contents: data.contents,
    num_items: data.num_items,
    value: data.value,
    currency: "BDT",
    order_id: data.order_id,
  };

  // Browser pixel always fires immediately
  if (typeof window.fbq === "function") {
    const PIXEL_KEYS = new Set([
      "content_ids", "content_type", "content_name", "content_category",
      "contents", "currency", "value", "search_string", "num_items",
    ]);
    const pixelData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(customData)) {
      if (PIXEL_KEYS.has(k) && v !== undefined) pixelData[k] = v;
    }

    // Advanced Matching
    const pixelUserData: Record<string, string> = {};
    if (userData?.em) pixelUserData.em = userData.em.trim().toLowerCase();
    if (userData?.ph) pixelUserData.ph = userData.ph.replace(/[^0-9]/g, "");
    if (userData?.fn) pixelUserData.fn = userData.fn.trim().toLowerCase();
    if (userData?.ln) pixelUserData.ln = userData.ln.trim().toLowerCase();
    if (userData?.ct) pixelUserData.ct = userData.ct.trim().toLowerCase();
    if (userData?.country) pixelUserData.country = userData.country.trim().toLowerCase();
    if (Object.keys(pixelUserData).length > 0 && _pixelId) {
      window.fbq("init", _pixelId, pixelUserData);
    }

    window.fbq("track", "Purchase", pixelData, { eventID: eventId });
  }

  // Server CAPI — always send to collect with order_id
  // Server decides whether to fire immediately or defer based on fb_deferred_purchase setting
  setTimeout(() => {
    const body = {
      event_name: "Purchase",
      event_id: eventId,
      event_source_url: window.location.href,
      custom_data: customData,
      user_data: {
        fbp: getCookie("_fbp"),
        fbc: getCookie("_fbc"),
        ...(_userId ? { external_id: _userId } : {}),
        ...userData,
      },
      order_id: data.order_id,
    };

    fetch("/api/v1/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }, 0);
}

/** Search performed */
export function trackSearch(data: { search_string: string }) {
  sendEvent("Search", { search_string: data.search_string, content_type: "product" });
}

/** Contact form / lead form submitted */
export function trackLead(userData?: UserData) {
  sendEvent("Lead", {}, userData);
}

/** User registered */
export function trackCompleteRegistration(userData?: UserData) {
  sendEvent("CompleteRegistration", {}, userData);
}
