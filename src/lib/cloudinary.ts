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
