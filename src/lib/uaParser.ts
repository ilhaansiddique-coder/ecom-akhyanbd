/**
 * Tiny User-Agent parser. We only need browser / OS / device family for
 * shortlink click analytics — not full version detection — so we avoid
 * adding ua-parser-js (~30 KB) and roll regex matchers for the cases
 * that actually appear in real-world traffic.
 *
 * Returned device is "mobile" | "tablet" | "desktop" so downstream
 * groupBy queries collapse cleanly.
 */
export interface ParsedUA {
  browser: string;
  os: string;
  device: "mobile" | "tablet" | "desktop";
}

export function parseUA(uaRaw: string | null | undefined): ParsedUA {
  const ua = String(uaRaw || "");

  // ── Device class ──
  // Tablet check first (iPad / Android-non-mobile tablets) so we don't
  // misclassify them as mobile by the "Mobi" keyword later.
  let device: ParsedUA["device"] = "desktop";
  if (/iPad|Android(?!.*Mobile)|Tablet|Kindle|Silk/i.test(ua)) device = "tablet";
  else if (/Mobi|iPhone|iPod|Android|Windows Phone|BlackBerry|webOS/i.test(ua)) device = "mobile";

  // ── Browser ── (in-app webviews first, then real browsers in order of
  // specificity — Edge contains "Chrome", Chrome contains "Safari", etc.)
  let browser = "Other";
  if (/FBAN|FBAV/i.test(ua)) browser = "Facebook App";
  else if (/Instagram/i.test(ua)) browser = "Instagram App";
  else if (/Line\//i.test(ua)) browser = "LINE App";
  else if (/TikTok|Musical_ly/i.test(ua)) browser = "TikTok App";
  else if (/Twitter/i.test(ua)) browser = "Twitter App";
  else if (/Snapchat/i.test(ua)) browser = "Snapchat App";
  else if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Browser";
  else if (/UCBrowser/i.test(ua)) browser = "UC Browser";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";
  else if (/MSIE|Trident/i.test(ua)) browser = "IE";

  // ── OS ──
  let os = "Other";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { browser, os, device };
}

/**
 * Truncate IP for storage — strips the last octet (IPv4) or the last 80
 * bits (IPv6). We retain enough to group by network/city but not enough
 * to identify a single household behind a NAT.
 */
export function truncateIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;
  // IPv4: a.b.c.d → a.b.c.0
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) {
    const parts = trimmed.split(".");
    parts[3] = "0";
    return parts.join(".");
  }
  // IPv6: keep first 3 hextets, zero the rest. Best-effort — not strictly
  // RFC, but adequate for /48 anonymisation in practice.
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    return parts.slice(0, 3).join(":") + "::";
  }
  return trimmed;
}

/**
 * Derive a clean "source" label (facebook, instagram, google, direct, etc.)
 * from the request's referer header + utm_source query param. UTM wins when
 * present because that's the marketer's explicit attribution.
 */
export function deriveSource(referer: string | null | undefined, utmSource: string | null | undefined): string {
  const utm = (utmSource || "").trim().toLowerCase();
  if (utm) return utm;

  const ref = (referer || "").toLowerCase();
  if (!ref) return "direct";
  // Strip protocol + path, keep host.
  const m = ref.match(/^https?:\/\/([^/?#]+)/);
  const host = (m?.[1] || ref).replace(/^www\./, "");
  if (!host) return "direct";

  // Common platform mappings.
  if (host.includes("facebook.com") || host.includes("fb.me") || host.includes("messenger.com")) return "facebook";
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("twitter.com") || host.includes("x.com") || host.includes("t.co")) return "twitter";
  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("pinterest.com")) return "pinterest";
  if (host.includes("snapchat.com")) return "snapchat";
  if (host.includes("whatsapp.com") || host.includes("wa.me")) return "whatsapp";
  if (host.includes("telegram") || host.includes("t.me")) return "telegram";
  if (host.includes("google.")) return "google";
  if (host.includes("bing.com")) return "bing";
  if (host.includes("duckduckgo.com")) return "duckduckgo";
  if (host.includes("reddit.com")) return "reddit";

  return host; // fall back to the bare host
}
