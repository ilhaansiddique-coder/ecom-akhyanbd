/**
 * Pathao Courier (Aladdin) API Integration
 *
 * Docs: https://github.com/codeboxrcodehub/pathao-courier
 * Pathao Merchant Portal: https://merchant.pathao.com
 *
 * Auth model: OAuth2 password grant. Issue access_token (lives ~1h) +
 * refresh_token. We cache the token in DB across requests so we don't burn
 * a token-issue call on every order.
 *
 * Settings keys (siteSetting table):
 *   pathao_enabled            "true" | "false"
 *   pathao_environment        "sandbox" | "production"
 *   pathao_client_id          OAuth client id
 *   pathao_client_secret      OAuth client secret (sensitive)
 *   pathao_username           Merchant email
 *   pathao_password           Merchant password (sensitive)
 *   pathao_store_id           Default store id
 *   pathao_default_city_id    Fallback city id when order has no override
 *   pathao_default_zone_id    Fallback zone id
 *   pathao_default_area_id    Fallback area id (optional)
 *   pathao_default_delivery_type  "48" (normal) or "12" (on-demand)
 *   pathao_default_item_type      "1" (document) or "2" (parcel)
 *   pathao_auto_send          Auto-send on checkout
 *   pathao_include_notes      Include order notes in shipment
 *
 * Internal cache keys (also in siteSetting — cheap to reuse the table):
 *   pathao_access_token
 *   pathao_refresh_token
 *   pathao_token_expires_at   Epoch ms
 */

import { prisma } from "./prisma";

const SANDBOX_BASE = "https://courier-api-sandbox.pathao.com";
const PROD_BASE = "https://api-hermes.pathao.com";

// ─── Settings cache (5 min TTL) ───
interface PathaoCreds {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId: string;
  defaultCityId: string;
  defaultZoneId: string;
  defaultAreaId: string;
  defaultDeliveryType: string; // "48" | "12"
  defaultItemType: string;     // "1" | "2"
}

let cachedCreds: PathaoCreds | null = null;
let credsExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000;

const KEYS = [
  "pathao_environment",
  "pathao_client_id",
  "pathao_client_secret",
  "pathao_username",
  "pathao_password",
  "pathao_store_id",
  "pathao_default_city_id",
  "pathao_default_zone_id",
  "pathao_default_area_id",
  "pathao_default_delivery_type",
  "pathao_default_item_type",
];

async function getCreds(): Promise<PathaoCreds> {
  if (cachedCreds && Date.now() < credsExpiry) return cachedCreds;
  try {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: KEYS } } });
    const map: Record<string, string> = {};
    for (const r of rows) if (r.value) map[r.key] = r.value;

    const env = map.pathao_environment || "production";
    const baseUrl = env === "sandbox" ? SANDBOX_BASE : PROD_BASE;

    cachedCreds = {
      baseUrl,
      clientId: map.pathao_client_id || process.env.PATHAO_CLIENT_ID || "",
      clientSecret: map.pathao_client_secret || process.env.PATHAO_CLIENT_SECRET || "",
      username: map.pathao_username || process.env.PATHAO_USERNAME || "",
      password: map.pathao_password || process.env.PATHAO_PASSWORD || "",
      storeId: map.pathao_store_id || "",
      defaultCityId: map.pathao_default_city_id || "",
      defaultZoneId: map.pathao_default_zone_id || "",
      defaultAreaId: map.pathao_default_area_id || "",
      defaultDeliveryType: map.pathao_default_delivery_type || "48",
      defaultItemType: map.pathao_default_item_type || "2",
    };
    credsExpiry = Date.now() + CACHE_TTL;
    return cachedCreds;
  } catch {
    return {
      baseUrl: PROD_BASE,
      clientId: "",
      clientSecret: "",
      username: "",
      password: "",
      storeId: "",
      defaultCityId: "",
      defaultZoneId: "",
      defaultAreaId: "",
      defaultDeliveryType: "48",
      defaultItemType: "2",
    };
  }
}

export function clearPathaoCache() {
  cachedCreds = null;
  credsExpiry = 0;
}

/** Auth-only check — credentials needed to talk to Pathao at all. */
export async function hasPathaoAuth(): Promise<boolean> {
  const c = await getCreds();
  return !!(c.clientId && c.clientSecret && c.username && c.password);
}

/** Full check — also needs a store selected (required for sending orders). */
export async function isPathaoConfigured(): Promise<boolean> {
  const c = await getCreds();
  return !!(c.clientId && c.clientSecret && c.username && c.password && c.storeId);
}

export async function isPathaoEnabled(): Promise<boolean> {
  try {
    const s = await prisma.siteSetting.findUnique({ where: { key: "pathao_enabled" } });
    if (s?.value === "false" || s?.value === "0") return false;
    return await isPathaoConfigured();
  } catch { return false; }
}

export async function isPathaoAutoSendEnabled(): Promise<boolean> {
  try {
    const s = await prisma.siteSetting.findUnique({ where: { key: "pathao_auto_send" } });
    return s?.value === "true" || s?.value === "1";
  } catch { return false; }
}

// ─── Token management ───

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  message?: string;
}

async function fetchToken(useRefresh = false): Promise<string> {
  const c = await getCreds();
  if (!c.clientId || !c.clientSecret || !c.username || !c.password) {
    throw new Error("Pathao credentials missing");
  }

  let body: Record<string, string>;
  if (useRefresh) {
    const refreshRow = await prisma.siteSetting.findUnique({ where: { key: "pathao_refresh_token" } });
    const refreshToken = refreshRow?.value;
    if (!refreshToken) return fetchToken(false);
    body = {
      client_id: c.clientId,
      client_secret: c.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };
  } else {
    body = {
      client_id: c.clientId,
      client_secret: c.clientSecret,
      username: c.username,
      password: c.password,
      grant_type: "password",
    };
  }

  const res = await fetch(`${c.baseUrl}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: TokenResponse & { errors?: Record<string, string[]> };
  try { data = JSON.parse(text); } catch { data = { message: `HTTP ${res.status}: ${text.slice(0, 200)}` }; }
  if (!data.access_token) {
    if (useRefresh) return fetchToken(false); // refresh failed → reissue from password
    const errStr = data.errors ? Object.values(data.errors).flat().join(", ") : "";
    const msg = [data.message, errStr].filter(Boolean).join(" — ") || `Pathao token issue failed (HTTP ${res.status})`;
    console.error("Pathao token error:", { status: res.status, body: data });
    throw new Error(msg);
  }

  // Persist tokens to DB so other server processes can reuse them.
  const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000; // 1-min safety margin
  await Promise.all([
    prisma.siteSetting.upsert({
      where: { key: "pathao_access_token" },
      update: { value: data.access_token },
      create: { key: "pathao_access_token", value: data.access_token },
    }),
    data.refresh_token
      ? prisma.siteSetting.upsert({
          where: { key: "pathao_refresh_token" },
          update: { value: data.refresh_token },
          create: { key: "pathao_refresh_token", value: data.refresh_token },
        })
      : Promise.resolve(),
    prisma.siteSetting.upsert({
      where: { key: "pathao_token_expires_at" },
      update: { value: String(expiresAt) },
      create: { key: "pathao_token_expires_at", value: String(expiresAt) },
    }),
  ]);

  return data.access_token;
}

async function getAccessToken(): Promise<string> {
  const [tokenRow, expRow] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "pathao_access_token" } }),
    prisma.siteSetting.findUnique({ where: { key: "pathao_token_expires_at" } }),
  ]);
  const token = tokenRow?.value;
  const expires = Number(expRow?.value || 0);
  if (token && Date.now() < expires) return token;
  // Try refresh first; falls back to password grant inside.
  return fetchToken(true);
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const c = await getCreds();
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...((init.headers as Record<string, string>) || {}),
  };
  let res = await fetch(`${c.baseUrl}${path}`, { ...init, headers });
  if (res.status === 401) {
    // Token may have been invalidated server-side; force reissue.
    const fresh = await fetchToken(false);
    headers.Authorization = `Bearer ${fresh}`;
    res = await fetch(`${c.baseUrl}${path}`, { ...init, headers });
  }
  return res;
}

// ─── Public API ───

export interface PathaoOrder {
  /** Merchant-side order id (becomes merchant_order_id). */
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  /** City/zone/area defaults will be used if these are missing. */
  recipient_city?: number;
  recipient_zone?: number;
  recipient_area?: number;
  /** "48" = normal, "12" = on-demand. */
  delivery_type?: number;
  /** 1 = document, 2 = parcel. */
  item_type?: number;
  item_quantity: number;
  /** kg, e.g. 0.5 */
  item_weight: number;
  amount_to_collect: number;
  item_description?: string;
  special_instruction?: string;
}

export interface PathaoCreateResponse {
  type?: string;
  code?: number;
  message?: string;
  data?: {
    consignment_id: string;
    merchant_order_id: string;
    order_status: string;
    delivery_fee?: number;
  };
  errors?: Record<string, string[]>;
}

export async function sendToPathao(order: PathaoOrder): Promise<PathaoCreateResponse> {
  const c = await getCreds();
  if (!c.storeId) return { code: 422, message: "Pathao store_id not configured" };

  const body = {
    store_id: Number(c.storeId),
    merchant_order_id: order.merchant_order_id,
    recipient_name: order.recipient_name,
    recipient_phone: order.recipient_phone,
    recipient_address: order.recipient_address,
    recipient_city: order.recipient_city ?? Number(c.defaultCityId || 0),
    recipient_zone: order.recipient_zone ?? Number(c.defaultZoneId || 0),
    recipient_area: order.recipient_area ?? (c.defaultAreaId ? Number(c.defaultAreaId) : undefined),
    delivery_type: order.delivery_type ?? Number(c.defaultDeliveryType || 48),
    item_type: order.item_type ?? Number(c.defaultItemType || 2),
    special_instruction: order.special_instruction || "",
    item_quantity: order.item_quantity,
    item_weight: order.item_weight,
    amount_to_collect: Math.round(order.amount_to_collect),
    item_description: order.item_description || "",
  };

  const res = await authedFetch("/aladdin/api/v1/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

export interface PathaoBulkResponse {
  type?: string;
  code?: number;
  message?: string;
  data?: Array<{
    merchant_order_id: string;
    consignment_id?: string;
    order_status?: string;
    errors?: Record<string, string[]>;
  }>;
}

export async function sendBulkToPathao(orders: PathaoOrder[]): Promise<PathaoBulkResponse> {
  const c = await getCreds();
  const storeId = Number(c.storeId);
  const payload = {
    orders: orders.map((o) => ({
      store_id: storeId,
      merchant_order_id: o.merchant_order_id,
      recipient_name: o.recipient_name,
      recipient_phone: o.recipient_phone,
      recipient_address: o.recipient_address,
      recipient_city: o.recipient_city ?? Number(c.defaultCityId || 0),
      recipient_zone: o.recipient_zone ?? Number(c.defaultZoneId || 0),
      recipient_area: o.recipient_area ?? (c.defaultAreaId ? Number(c.defaultAreaId) : undefined),
      delivery_type: o.delivery_type ?? Number(c.defaultDeliveryType || 48),
      item_type: o.item_type ?? Number(c.defaultItemType || 2),
      special_instruction: o.special_instruction || "",
      item_quantity: o.item_quantity,
      item_weight: o.item_weight,
      amount_to_collect: Math.round(o.amount_to_collect),
      item_description: o.item_description || "",
    })),
  };

  const res = await authedFetch("/aladdin/api/v1/orders/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export interface PathaoStatusResponse {
  type?: string;
  code?: number;
  data?: {
    consignment_id: string;
    order_status: string;
    invoice_id?: string;
    updated_at?: string;
  };
  message?: string;
}

export async function checkPathaoStatus(consignmentId: string): Promise<PathaoStatusResponse> {
  const res = await authedFetch(`/aladdin/api/v1/orders/${consignmentId}/info`, { method: "GET" });
  return res.json();
}

/**
 * Pathao doesn't expose a "balance" endpoint like Steadfast — the closest is
 * the price-plan endpoint which returns the merchant's current pricing tier.
 * Use it as a connectivity probe + tier display.
 */
export interface PathaoBalanceResponse {
  type?: string;
  code?: number;
  data?: unknown;
  message?: string;
}

export async function checkPathaoBalance(): Promise<PathaoBalanceResponse> {
  // /stores is a guaranteed authed endpoint — use it as a connectivity probe.
  const res = await authedFetch("/aladdin/api/v1/stores", { method: "GET" });
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return { code: res.status, data: j?.data, message: j?.message };
  } catch {
    return { code: res.status, message: `HTTP ${res.status}: ${text.slice(0, 200)}` };
  }
}

// ─── Geo lookups (city/zone/area pickers in admin) ───

export interface PathaoListItem {
  city_id?: number;
  city_name?: string;
  zone_id?: number;
  zone_name?: string;
  area_id?: number;
  area_name?: string;
  home_delivery_available?: boolean;
  pickup_available?: boolean;
}

export async function listPathaoCities(): Promise<PathaoListItem[]> {
  // Pathao city-list is country-scoped (Bangladesh = 1). The plain /city-list
  // path returns 404 on production.
  const res = await authedFetch("/aladdin/api/v1/countries/1/city-list", { method: "GET" });
  const j = await res.json();
  return j?.data?.data || [];
}

export async function listPathaoZones(cityId: number): Promise<PathaoListItem[]> {
  const res = await authedFetch(`/aladdin/api/v1/cities/${cityId}/zone-list`, { method: "GET" });
  const j = await res.json();
  return j?.data?.data || [];
}

export async function listPathaoAreas(zoneId: number): Promise<PathaoListItem[]> {
  const res = await authedFetch(`/aladdin/api/v1/zones/${zoneId}/area-list`, { method: "GET" });
  const j = await res.json();
  return j?.data?.data || [];
}

export interface PathaoStore {
  store_id: number;
  store_name: string;
  is_active: number;
  city_id?: number;
  zone_id?: number;
}

export async function listPathaoStores(): Promise<PathaoStore[]> {
  const res = await authedFetch("/aladdin/api/v1/stores", { method: "GET" });
  const j = await res.json();
  return j?.data?.data || [];
}

// ─── Address parser (uses merchant panel session token) ───

export interface PathaoParsedAddress {
  district_id?: number;   // = recipient_city in Aladdin order API
  district_name?: string;
  zone_id?: number;
  zone_name?: string;
  area_id?: number | null;
  area_name?: string | null;
  hub_id?: number;
  hub_name?: string;
  score?: number;
  source?: string;
  is_implicit?: boolean;
}

/**
 * Parse a free-text Bangladesh address into Pathao city/zone/area IDs by
 * proxying merchant.pathao.com/api/v1/address-parser. Requires the merchant
 * panel session token (settings: pathao_web_token) — the OAuth2 Aladdin
 * token doesn't work on this endpoint.
 *
 * Returns null when token is missing, upstream errors, or the address
 * can't be matched to a district+zone.
 */
export async function parsePathaoAddress(address: string, phone: string): Promise<PathaoParsedAddress | null> {
  if (!address.trim()) return null;
  // Token resolution (auto-refresh first, manual paste as last resort) lives
  // in pathaoMerchantAuth.ts. Importing dynamically to avoid a circular dep
  // on the tx layer.
  const { getMerchantPanelToken, clearMerchantPanelTokenCache } = await import("./pathaoMerchantAuth");
  const token = await getMerchantPanelToken();
  if (!token) return null;

  // One-shot retry: if the cached token is stale (returns 401/403),
  // bust the cache and try once more so the next attempt forces a
  // fresh login.
  const callOnce = async (jwt: string) => {
    return fetch("https://merchant.pathao.com/api/v1/address-parser", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://merchant.pathao.com",
        "Referer": "https://merchant.pathao.com/courier/orders/create",
      },
      body: JSON.stringify({ address: address.trim(), recipient_identifier: phone.trim() }),
      signal: AbortSignal.timeout(15000),
    });
  };

  try {
    let res = await callOnce(token);
    if (res.status === 401 || res.status === 403) {
      // Stale token — clear cache + DB rows so the next fetch forces a fresh login.
      clearMerchantPanelTokenCache();
      try {
        await prisma.siteSetting.deleteMany({
          where: { key: { in: ["pathao_web_token_auto", "pathao_web_token_auto_exp"] } },
        });
      } catch {}
      const fresh = await getMerchantPanelToken();
      if (!fresh || fresh === token) return null;
      res = await callOnce(fresh);
    }
    if (!res.ok) return null;
    const j = await res.json();
    const d = j?.data as PathaoParsedAddress | undefined;
    if (!d?.district_id || !d?.zone_id) return null;

    // Re-score: Pathao sometimes picks a generic area (e.g. "Bazar") when
    // a more specific one is actually mentioned ("Chowdhuri Market area").
    // Pull the full area list for the matched zone + run our local fuzzy
    // scorer; override Pathao's pick only if our top match clearly wins.
    try {
      const { rescoreArea } = await import("./pathaoAreaRescore");
      const areas = await listPathaoAreas(d.zone_id).catch(() => []);
      const refined = rescoreArea(address.trim(), d, areas);
      return refined;
    } catch {
      return d;
    }
  } catch {
    return null;
  }
}

// ─── Helpers (re-exported from steadfast for parity) ───

export function generatePathaoMerchantOrderId(orderId: number): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${orderId}`;
}
