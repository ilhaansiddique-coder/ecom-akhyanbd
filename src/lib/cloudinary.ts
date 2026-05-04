/**
 * Cloudinary fallback storage — used when Cloudflare R2 is not configured.
 *
 * Env vars (all required to enable):
 *   CLOUDINARY_CLOUD_NAME    — your cloud name (e.g. "akhiyan")
 *   CLOUDINARY_API_KEY       — public API key
 *   CLOUDINARY_API_SECRET    — secret (used to sign uploads server-side only)
 *   CLOUDINARY_FOLDER        — optional, prefix folder for uploads (default "uploads")
 *
 * Uses signed uploads via the REST API. No SDK needed — keeps the dependency
 * surface small. All signing happens server-side; the secret never reaches
 * the browser.
 */
import crypto from "crypto";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const FOLDER = process.env.CLOUDINARY_FOLDER || "uploads";

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

/**
 * Build the upload signature Cloudinary expects.
 * Algorithm: sort params alphabetically by key, join as `k1=v1&k2=v2`,
 * append API_SECRET, take SHA1 hex digest.
 */
function sign(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(sorted + API_SECRET).digest("hex");
}

/**
 * Upload a buffer to Cloudinary. Returns the secure (https) URL.
 *
 * `key` is treated as a public_id (Cloudinary's filename). It's stripped of
 * the file extension because Cloudinary stores format separately and adds
 * the extension automatically when generating delivery URLs.
 */
export async function cloudinaryUpload(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary not configured");
  }

  // Auto-detect resource type from content type. Images go through optimization
  // pipeline; everything else (video, pdf, etc.) goes through "raw" or "video".
  const resourceType = contentType.startsWith("video/")
    ? "video"
    : contentType.startsWith("image/")
      ? "image"
      : "raw";

  // Strip extension — Cloudinary appends one based on stored format.
  const publicId = key.replace(/\.[^/.]+$/, "");
  const timestamp = Math.floor(Date.now() / 1000);

  const signParams: Record<string, string> = {
    folder: FOLDER,
    public_id: publicId,
    timestamp: String(timestamp),
  };
  const signature = sign(signParams);

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(body)], { type: contentType }), publicId);
  form.append("api_key", API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", FOLDER);
  form.append("public_id", publicId);
  form.append("signature", signature);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json() as { secure_url?: string; url?: string };
  const finalUrl = data.secure_url || data.url;
  if (!finalUrl) throw new Error("Cloudinary returned no URL");
  return finalUrl;
}

/**
 * Delete an asset by its public_id. Cloudinary's destroy endpoint also
 * needs a signature.
 */
export async function cloudinaryDelete(publicId: string, resourceType: "image" | "video" | "raw" = "image"): Promise<boolean> {
  if (!isCloudinaryConfigured()) return false;
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signParams: Record<string, string> = {
      public_id: publicId,
      timestamp: String(timestamp),
    };
    const signature = sign(signParams);

    const form = new FormData();
    form.append("public_id", publicId);
    form.append("api_key", API_KEY);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`;
    const res = await fetch(url, { method: "POST", body: form });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * List uploaded assets in the configured folder. Used by the admin media
 * gallery widget to render a grid of all previously-uploaded images so the
 * admin can re-pick instead of re-uploading.
 *
 * Cloudinary Admin API uses HTTP Basic auth (api_key:api_secret) — different
 * from the signed POST flow used by uploads. Server-side only; never call
 * from the browser.
 *
 * Returns a flat list of {key, url, size, modified, format}. Pagination via
 * `next_cursor` — first call returns up to `max_results` (default 500). For
 * stores with > 500 images, callers should re-call passing the cursor; this
 * helper auto-paginates up to 5 pages (= 2500 images) which covers all
 * reasonable BD merchant catalogs.
 */
export async function cloudinaryList(prefix?: string): Promise<Array<{ key: string; url: string; size: number; modified: string; format: string }>> {
  if (!isCloudinaryConfigured()) return [];
  const baseUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image`;
  const auth = "Basic " + Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
  const out: Array<{ key: string; url: string; size: number; modified: string; format: string }> = [];
  let cursor: string | null = null;
  const folder = prefix !== undefined ? prefix : FOLDER;
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({ max_results: "500", type: "upload" });
    if (folder) params.set("prefix", folder);
    if (cursor) params.set("next_cursor", cursor);
    const res = await fetch(`${baseUrl}?${params}`, { headers: { Authorization: auth } });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[Cloudinary list] HTTP ${res.status}: ${text.slice(0, 200)}`);
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as { resources?: any[]; next_cursor?: string };
    for (const r of data.resources || []) {
      out.push({
        key: r.public_id,
        url: r.secure_url || r.url,
        size: r.bytes || 0,
        modified: r.created_at || new Date().toISOString(),
        format: r.format || "",
      });
    }
    if (!data.next_cursor) break;
    cursor = data.next_cursor;
  }
  return out;
}

/**
 * Extract the public_id from a Cloudinary delivery URL so callers that only
 * have the URL stored (e.g. a product image field) can still issue deletes.
 * Returns null when the URL doesn't match Cloudinary's pattern.
 *
 * Example:
 *   https://res.cloudinary.com/akhiyan/image/upload/v1234/uploads/foo.webp
 *     → "uploads/foo"
 */
export function cloudinaryPublicIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("cloudinary.com")) return null;
    // Path pattern: /<cloud_name>/<resource>/upload/[v123/]<public_id>.<ext>
    const m = u.pathname.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return m?.[1] || null;
  } catch {
    return null;
  }
}
