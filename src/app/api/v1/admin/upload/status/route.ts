/**
 * GET /api/v1/admin/upload/status
 *
 * Diagnostic endpoint — reports which storage tier the upload route will
 * use for the next request and which env vars are present (boolean only,
 * never reveals values). Hit this from the browser when uploads break to
 * pinpoint the cause without hunting through Vercel function logs.
 *
 * Examples:
 *   { activeTier: "r2", r2: { configured: true, ... } }
 *      → R2 will handle uploads. If they fail, R2 keys/permissions wrong.
 *
 *   { activeTier: "cloudinary", r2: { configured: false }, cloudinary: { configured: true } }
 *      → Cloudinary tier active. Uploads should hit Cloudinary.
 *
 *   { activeTier: "local", r2: { configured: false }, cloudinary: { configured: false } }
 *      → Neither external tier configured. Uploads write to disk
 *        (fine for local dev, broken on serverless like Vercel).
 */
import { jsonResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { isR2Configured } from "@/lib/r2";
import { isCloudinaryConfigured } from "@/lib/cloudinary";

export async function GET() {
  try { await requireStaff(); } catch (e) { return e as Response; }

  const r2 = {
    configured: isR2Configured(),
    R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: !!process.env.R2_BUCKET,
    R2_PUBLIC_URL: !!process.env.R2_PUBLIC_URL,
  };

  const cloudinary = {
    configured: isCloudinaryConfigured(),
    CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || "(default: uploads)",
  };

  const activeTier = r2.configured ? "r2" : cloudinary.configured ? "cloudinary" : "local";

  return jsonResponse({
    activeTier,
    r2,
    cloudinary,
    hint: activeTier === "local"
      ? "Local disk fallback. On Vercel/serverless, this won't persist between requests. Set R2 or Cloudinary env vars."
      : `Uploads will use ${activeTier}. If they fail, check the upload POST response body for the upstream error.`,
  });
}
