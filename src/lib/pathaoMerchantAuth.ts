import { prisma } from "@/lib/prisma";

/**
 * Auto-fetches Pathao's merchant-panel JWT (the one that powers the
 * undocumented `/api/v1/address-parser` endpoint used by parsePathaoAddress).
 *
 * The JWT lives 1-2 days then dies. Manually pasting it every time is
 * painful, so we log into merchant.pathao.com programmatically using the
 * same email + password the admin already saved for OAuth (pathao_username
 * + pathao_password) and cache the resulting JWT until its real `exp`
 * timestamp passes.
 *
 * IMPORTANT NOTES:
 *  - This hits an undocumented endpoint and may break if Pathao changes
 *    their auth flow. We log everything loudly so failures are diagnosable.
 *  - Falls back to the manually-pasted `pathao_web_token` if auto-fetch
 *    fails — admins can still patch over a broken auto-flow without
 *    redeploying.
 *  - The stored credentials are reused; no separate "merchant panel
 *    password" needed.
 */

interface CachedToken {
  token: string;
  expiresAt: number; // Unix ms
}

let memoryCache: CachedToken | null = null;

const STORAGE_KEY_TOKEN = "pathao_web_token_auto";
const STORAGE_KEY_EXP = "pathao_web_token_auto_exp";
// Skew applied to JWT exp so we refresh BEFORE Pathao actually invalidates.
const REFRESH_SKEW_MS = 30 * 60 * 1000; // 30 min

/**
 * Decode a JWT's `exp` claim (seconds since epoch) → ms timestamp.
 * Returns null if the token isn't a JWT or has no exp.
 */
function jwtExpiryMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Standard JWT base64url (URL-safe) → swap chars + pad to 4-multiple.
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(
      typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf-8")
        : atob(padded)
    );
    if (typeof payload?.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

/**
 * Pull the email + password the admin saved for OAuth — same creds work
 * for the merchant panel login.
 */
async function loadStoredCreds(): Promise<{ email: string; password: string } | null> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: ["pathao_username", "pathao_password"] } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) if (r.value) map[r.key] = r.value;
  const email = map.pathao_username || process.env.PATHAO_USERNAME || "";
  const password = map.pathao_password || process.env.PATHAO_PASSWORD || "";
  if (!email || !password) return null;
  return { email, password };
}

/**
 * Try to obtain a fresh JWT by logging into Pathao's merchant panel API.
 * Returns null on any failure (logged loudly).
 *
 * The endpoint isn't officially documented; the most common Laravel API
 * convention for Pathao is /api/v1/login or /api/v1/auth/login. We try
 * both in sequence and keep the first one that returns a JWT.
 */
async function fetchFreshToken(): Promise<string | null> {
  const creds = await loadStoredCreds();
  if (!creds) {
    console.warn("[PathaoMerchantAuth] No stored email/password — skipping auto-refresh");
    return null;
  }

  // Try the most likely endpoints in order. Each accepts JSON and returns
  // either { access_token } or { data: { access_token } }.
  const candidates = [
    "https://merchant.pathao.com/api/v1/login",
    "https://merchant.pathao.com/api/v1/auth/login",
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          // Some Laravel apps require these to bypass CSRF/CORS guards on the
          // public login endpoint.
          "Origin": "https://merchant.pathao.com",
          "Referer": "https://merchant.pathao.com/login",
          "User-Agent": "Mozilla/5.0 (compatible; AkhiyanBot/1.0)",
        },
        body: JSON.stringify({
          email: creds.email,
          password: creds.password,
          // Some flavors require these; harmless if ignored.
          remember: true,
          username: creds.email,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn(`[PathaoMerchantAuth] ${url} → HTTP ${res.status}: ${body.slice(0, 200)}`);
        continue;
      }

      const json = await res.json().catch(() => null);
      // Walk all common token field names.
      const token: string | undefined =
        json?.access_token ||
        json?.token ||
        json?.data?.access_token ||
        json?.data?.token ||
        json?.data?.api_token ||
        json?.api_token;

      if (typeof token === "string" && token.length > 20) {
        console.log(`[PathaoMerchantAuth] Refreshed JWT via ${url}`);
        return token;
      }

      console.warn(`[PathaoMerchantAuth] ${url} returned 200 but no token in body. Keys:`, json ? Object.keys(json) : "null");
    } catch (e) {
      console.warn(`[PathaoMerchantAuth] ${url} threw:`, e instanceof Error ? e.message : e);
    }
  }

  return null;
}

/**
 * Public API. Returns a usable merchant-panel JWT or null.
 *
 * Resolution order:
 *   1. In-memory cache (still within JWT exp).
 *   2. DB-stored auto-token (still within saved exp).
 *   3. Fresh login (re-auths against merchant.pathao.com).
 *   4. Manually-pasted `pathao_web_token` (last-resort safety net).
 */
export async function getMerchantPanelToken(): Promise<string | null> {
  // 1. Memory cache.
  if (memoryCache && Date.now() < memoryCache.expiresAt - REFRESH_SKEW_MS) {
    return memoryCache.token;
  }

  // 2. DB cache (survives server restart).
  try {
    const tokenRow = await prisma.siteSetting.findUnique({ where: { key: STORAGE_KEY_TOKEN } });
    const expRow = await prisma.siteSetting.findUnique({ where: { key: STORAGE_KEY_EXP } });
    const stored = tokenRow?.value?.trim();
    const exp = Number(expRow?.value || 0);
    if (stored && exp && Date.now() < exp - REFRESH_SKEW_MS) {
      memoryCache = { token: stored, expiresAt: exp };
      return stored;
    }
  } catch {}

  // 3. Fresh login.
  const fresh = await fetchFreshToken();
  if (fresh) {
    const exp = jwtExpiryMs(fresh) || (Date.now() + 23 * 60 * 60 * 1000); // fallback 23h
    memoryCache = { token: fresh, expiresAt: exp };
    // Persist to DB so other instances + restarts don't re-login on every cold start.
    try {
      await Promise.all([
        prisma.siteSetting.upsert({
          where: { key: STORAGE_KEY_TOKEN },
          create: { key: STORAGE_KEY_TOKEN, value: fresh },
          update: { value: fresh },
        }),
        prisma.siteSetting.upsert({
          where: { key: STORAGE_KEY_EXP },
          create: { key: STORAGE_KEY_EXP, value: String(exp) },
          update: { value: String(exp) },
        }),
      ]);
    } catch (e) {
      console.warn("[PathaoMerchantAuth] Couldn't persist auto-token:", e instanceof Error ? e.message : e);
    }
    return fresh;
  }

  // 4. Manual fallback.
  try {
    const manual = await prisma.siteSetting.findUnique({ where: { key: "pathao_web_token" } });
    const v = manual?.value?.trim();
    if (v) return v;
  } catch {}

  return null;
}

/** Force-clear the cached token; useful if the address parser is failing. */
export function clearMerchantPanelTokenCache() {
  memoryCache = null;
}
