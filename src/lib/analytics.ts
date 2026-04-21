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

function setCookie(name: string, value: string, days = 90) {
  if (typeof document === "undefined") return;
  const exp = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
}

/**
 * Build _fbc value from a fresh fbclid query param when the Pixel hasn't
 * written the cookie yet. Format per Facebook spec: fb.1.{ts}.{fbclid}.
 * Caches into the _fbc cookie too so subsequent events read consistently.
 */
function getFbc(): string | undefined {
  const cookie = getCookie("_fbc");
  if (cookie) return cookie;
  if (typeof window === "undefined") return undefined;
  try {
    const fbclid = new URL(window.location.href).searchParams.get("fbclid");
    if (!fbclid) return undefined;
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    setCookie("_fbc", fbc);
    return fbc;
  } catch {
    return undefined;
  }
}

/**
 * Stable anonymous ID for guest users. Improves CAPI external_id coverage
 * (FB dashboard wants this >= 80%; logged-in-only gets ~25%). Stored in a
 * 1-year cookie so the same browser is recognized across sessions and
 * paired with the eventual logged-in id when the user signs up.
 */
function getAnonId(): string {
  const existing = getCookie("_aid");
  if (existing) return existing;
  const id = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  setCookie("_aid", id, 365);
  return id;
}

function genEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Defense-in-depth: even if a tracker function gets called from inside the
 * dashboard (race, leaked import, future regression), no-op. Components are
 * already gated in ClientLayout, but this guarantees admin clicks never
 * reach Facebook.
 */
function isExcludedPath(): boolean {
  if (typeof window === "undefined") return true;
  return window.location.pathname.startsWith("/dashboard");
}

/**
 * Reliable POST to /api/v1/collect that survives page navigation.
 * sendBeacon is the spec-blessed primary; keepalive fetch is the fallback
 * when Beacon is unavailable (older Safari) or rejects the payload size.
 */
function postCollect(body: unknown) {
  try {
    const json = JSON.stringify(body);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([json], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/v1/collect", blob);
      if (ok) return;
    }
    fetch("/api/v1/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never throw from analytics
  }
}

// --------------- pixel ID + user store ---------------

let _pixelId = "";
let _userId = "";
let _deferPurchase = false;
// Track the last advanced-matching payload we pushed to fbq so we only
// re-init when user data actually changes (on login, checkout submit).
// Re-initializing on every event trips Pixel Helper's "duplicate pixel ID"
// warning — the FB-recommended pattern for late advanced matching but
// cosmetically noisy.
let _lastAdvancedMatchingHash = "";

/**
 * Update Pixel Advanced Matching. Call on login, registration, or
 * checkout-form submit — NOT on every event. Internally hashes the
 * payload and skips the fbq init call when nothing meaningful changed,
 * so repeated calls are safe.
 */
export function setAdvancedMatching(userData: {
  em?: string; ph?: string; fn?: string; ln?: string;
  ct?: string; st?: string; zp?: string; country?: string;
  external_id?: string;
} | undefined) {
  if (typeof window === "undefined") return;
  if (!_pixelId) return;
  if (typeof window.fbq !== "function") return;
  const pixelUserData: Record<string, string> = {};
  if (userData?.em) pixelUserData.em = userData.em.trim().toLowerCase();
  if (userData?.ph) pixelUserData.ph = userData.ph.replace(/[^0-9]/g, "");
  if (userData?.fn) pixelUserData.fn = userData.fn.trim().toLowerCase();
  if (userData?.ln) pixelUserData.ln = userData.ln.trim().toLowerCase();
  if (userData?.ct) pixelUserData.ct = userData.ct.trim().toLowerCase();
  if (userData?.st) pixelUserData.st = userData.st.trim().toLowerCase();
  if (userData?.zp) pixelUserData.zp = userData.zp.trim();
  if (userData?.country) pixelUserData.country = userData.country.trim().toLowerCase();
  pixelUserData.external_id = userData?.external_id || _userId || getAnonId();
  const hash = JSON.stringify(pixelUserData);
  if (hash === _lastAdvancedMatchingHash) return;
  _lastAdvancedMatchingHash = hash;
  try {
    window.fbq("init", _pixelId, pixelUserData);
  } catch {
    // never throw from analytics
  }
}

/** Called by FacebookPixel component after init */
export function setPixelId(id: string) {
  _pixelId = id;
}

/**
 * Toggle the deferred-purchase mode. When true, `trackPurchase` skips the
 * browser pixel fire so Facebook doesn't get the event until the admin
 * confirms the order from the dashboard. Server-side CAPI is also held back
 * (the order's tracking payload is just stored to DB).
 */
export function setDeferPurchase(defer: boolean) {
  _deferPurchase = defer;
}

/** Called when user logs in — enables external_id on all events */
export function setTrackingUserId(id: string | number) {
  _userId = String(id);
  // Push fresh external_id to Pixel Advanced Matching. Dedup-aware; only
  // re-inits if value changed, so calling setTrackingUserId repeatedly
  // on the same id (e.g. AuthContext re-renders) is safe.
  setAdvancedMatching({ external_id: _userId });
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
  if (isExcludedPath()) return;

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

    // Push Advanced Matching via setAdvancedMatching (dedup-aware). Skips
    // the fbq init call when values haven't changed since the last push,
    // so Pixel Helper doesn't flag "duplicate Pixel ID" on every event.
    // Pass undefined if nothing new — external_id anon cookie is the
    // baseline and only needs to be sent once per session.
    if (Object.keys(userData).length > 0) {
      setAdvancedMatching(userData);
    }

    window.fbq("track", eventName, pixelData, { eventID: eventId });
  }

  // 2. Server-side CAPI (skip for PageView — browser handles it fine)
  if (!clientOnly) {
    const eventUrl = sourceUrl || window.location.href;
    postCollect({
      event_name: eventName,
      event_id: eventId,
      event_source_url: eventUrl,
      custom_data: dataWithCurrency,
      user_data: {
        fbp: getCookie("_fbp"),
        fbc: getFbc(),
        // external_id: prefer authenticated user id, fall back to stable anon
        // cookie so CAPI gets coverage for guests too (FB dashboard wants
        // this above 80%, was at ~27% with logged-in-only).
        external_id: _userId || getAnonId(),
        ...userData,
      },
    });
  }
}

// --------------- GA4 dataLayer ---------------

/**
 * GA4 Enhanced Ecommerce dataLayer push.
 *
 * GTM listens for these and can fan out to the GA4 Config tag, Google Ads,
 * or any other GTM-compatible destination. Event names follow the GA4
 * recommended schema so out-of-the-box GA4 reports (Monetization, Funnels)
 * work without custom mapping.
 *
 * Pixel fires on the same tick — GTM handles Google side, our analytics
 * module handles Facebook side. Single source of truth for when events
 * happen; multiple sinks.
 */
interface Ga4Item {
  item_id: string;
  item_name?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
}

function pushDataLayer(event: string, ecommerce: Record<string, unknown>, extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (isExcludedPath()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    // GA4 best practice: null out ecommerce before each push so the object
    // from the previous event doesn't leak into the current one.
    w.dataLayer.push({ ecommerce: null });
    w.dataLayer.push({ event, ecommerce, ...(extra || {}) });
  } catch {
    // never throw from analytics
  }
}

/**
 * Build GA4 items[] from our internal contents[]. `contents` entries come
 * from the cart/product page with id + quantity + optional item_price.
 * `name` is a single product name (for ViewContent/AddToCart) or order
 * context (for Purchase where we may not have per-line names yet).
 */
function toGa4Items(
  contents: { id: string | number; quantity: number; item_price?: number; name?: string; category?: string; variant?: string }[] | undefined,
  fallbackName?: string,
  fallbackCategory?: string,
): Ga4Item[] {
  if (!contents || contents.length === 0) return [];
  return contents.map((c) => ({
    item_id: String(c.id),
    item_name: c.name || fallbackName,
    item_category: c.category || fallbackCategory,
    item_variant: c.variant,
    price: c.item_price,
    quantity: c.quantity,
  }));
}

// --------------- public API ---------------

/** PageView — browser pixel + server CAPI. GA4 page_view fires natively from GTM's Config tag. */
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

  // GA4 view_item
  pushDataLayer("view_item", {
    currency: "BDT",
    value: data.value,
    items: data.content_ids.map((id) => ({
      item_id: String(id),
      item_name: data.content_name,
      item_category: data.content_category,
      price: data.value,
      quantity: 1,
    })),
  });
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

  // GA4 add_to_cart
  pushDataLayer("add_to_cart", {
    currency: "BDT",
    value: data.value,
    items: data.content_ids.map((id) => ({
      item_id: String(id),
      item_name: data.content_name,
      price: data.value / Math.max(1, data.quantity || 1),
      quantity: data.quantity || 1,
    })),
  });
}

/** Checkout page opened */
export function trackInitiateCheckout(data: {
  content_ids: (string | number)[];
  content_name?: string;
  contents?: { id: string | number; quantity: number; item_price?: number; name?: string; category?: string; variant?: string }[];
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

  // GA4 begin_checkout
  const items = data.contents
    ? toGa4Items(data.contents, data.content_name)
    : data.content_ids.map((id) => ({ item_id: String(id), item_name: data.content_name, quantity: 1 }));
  pushDataLayer("begin_checkout", {
    currency: "BDT",
    value: data.value,
    items,
  });
}

/** Order completed — currency + value REQUIRED by Facebook */
export function trackPurchase(data: {
  content_ids: (string | number)[];
  content_name?: string;
  contents?: { id: string | number; quantity: number; item_price?: number; name?: string; category?: string; variant?: string }[];
  num_items: number;
  value: number;
  order_id?: string;
  shipping?: number;
}, userData?: UserData) {
  if (typeof window === "undefined") return;
  if (isExcludedPath()) return;

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

  // Browser pixel: skip the fire when defer mode is on, so Facebook doesn't
  // hear about the Purchase until admin confirms the order. Server-side
  // /api/v1/collect still receives the payload below — it stores tracking
  // data to the order row and waits for confirm to fire CAPI.
  if (!_deferPurchase && typeof window.fbq === "function") {
    const PIXEL_KEYS = new Set([
      "content_ids", "content_type", "content_name", "content_category",
      "contents", "currency", "value", "search_string", "num_items",
    ]);
    const pixelData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(customData)) {
      if (PIXEL_KEYS.has(k) && v !== undefined) pixelData[k] = v;
    }

    // Advanced Matching — dedup-aware so Pixel Helper doesn't flag
    // "duplicate Pixel ID". Will no-op if em/ph haven't changed since
    // the same user already submitted checkout.
    if (userData && Object.keys(userData).length > 0) {
      setAdvancedMatching(userData);
    }

    window.fbq("track", "Purchase", pixelData, { eventID: eventId });
  }

  // Server CAPI — always send to collect with order_id.
  // Server decides whether to fire immediately or defer based on fb_deferred_purchase setting.
  // Uses sendBeacon so the request survives the post-checkout router.push navigation
  // that previously raced with setTimeout(0) + fetch.
  postCollect({
    event_name: "Purchase",
    event_id: eventId,
    event_source_url: window.location.href,
    custom_data: customData,
    user_data: {
      fbp: getCookie("_fbp"),
      fbc: getFbc(),
      external_id: _userId || getAnonId(),
      ...userData,
    },
    order_id: data.order_id,
  });

  // GA4 purchase. Fires on the browser regardless of FB defer mode — GA4
  // has its own reporting cycle and doesn't need to align with our admin
  // confirm workflow. Google Ads conversions also pick this up via GTM.
  const items = data.contents
    ? toGa4Items(data.contents, data.content_name)
    : data.content_ids.map((id) => ({ item_id: String(id), item_name: data.content_name, quantity: 1 }));
  pushDataLayer("purchase", {
    transaction_id: data.order_id ? String(data.order_id) : eventId,
    currency: "BDT",
    value: data.value,
    shipping: data.shipping,
    items,
  });
}

/** Search performed */
export function trackSearch(data: { search_string: string }) {
  sendEvent("Search", { search_string: data.search_string, content_type: "product" });
  pushDataLayer("search", { search_term: data.search_string });
}

/** Contact form / lead form submitted */
export function trackLead(userData?: UserData) {
  sendEvent("Lead", {}, userData);
  pushDataLayer("generate_lead", { currency: "BDT", value: 0 });
}

/** User registered */
export function trackCompleteRegistration(userData?: UserData) {
  sendEvent("CompleteRegistration", {}, userData);
  pushDataLayer("sign_up", { method: "email" });
}

/**
 * GA4 view_item_list — fire on shop/category/search result pages. Helps
 * the Products report in GA4 attribute clicks back to impressions.
 */
export function trackViewItemList(data: {
  item_list_id?: string;
  item_list_name?: string;
  items: { id: string | number; name?: string; category?: string; price?: number }[];
}) {
  if (typeof window === "undefined") return;
  if (isExcludedPath()) return;
  pushDataLayer("view_item_list", {
    item_list_id: data.item_list_id,
    item_list_name: data.item_list_name,
    items: data.items.map((it, i) => ({
      item_id: String(it.id),
      item_name: it.name,
      item_category: it.category,
      price: it.price,
      index: i,
    })),
  });
}

/**
 * GA4 select_item — fire when a user clicks a product card from a list.
 * Pairs with view_item_list for funnel analysis.
 */
export function trackSelectItem(data: {
  item_list_id?: string;
  item_list_name?: string;
  item: { id: string | number; name?: string; category?: string; price?: number };
}) {
  if (typeof window === "undefined") return;
  if (isExcludedPath()) return;
  pushDataLayer("select_item", {
    item_list_id: data.item_list_id,
    item_list_name: data.item_list_name,
    items: [{
      item_id: String(data.item.id),
      item_name: data.item.name,
      item_category: data.item.category,
      price: data.item.price,
    }],
  });
}

/**
 * GA4 remove_from_cart — fire when user removes an item in the cart drawer.
 */
export function trackRemoveFromCart(data: {
  content_ids: (string | number)[];
  content_name?: string;
  value: number;
  quantity?: number;
}) {
  if (typeof window === "undefined") return;
  if (isExcludedPath()) return;
  pushDataLayer("remove_from_cart", {
    currency: "BDT",
    value: data.value,
    items: data.content_ids.map((id) => ({
      item_id: String(id),
      item_name: data.content_name,
      price: data.value / Math.max(1, data.quantity || 1),
      quantity: data.quantity || 1,
    })),
  });
}

/**
 * GA4 add_payment_info — fire when the user selects a payment method on
 * checkout. Useful for funnel drop-off analysis between begin_checkout
 * and purchase.
 */
export function trackAddPaymentInfo(data: {
  value: number;
  payment_type: string;
  content_ids: (string | number)[];
}) {
  if (typeof window === "undefined") return;
  if (isExcludedPath()) return;
  pushDataLayer("add_payment_info", {
    currency: "BDT",
    value: data.value,
    payment_type: data.payment_type,
    items: data.content_ids.map((id) => ({ item_id: String(id), quantity: 1 })),
  });
}
