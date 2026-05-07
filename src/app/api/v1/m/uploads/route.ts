/**
 * POST /api/v1/m/uploads
 *
 * Mobile-namespace image upload. Wraps the existing `/admin/upload` logic
 * (sharp compression → R2 → Cloudinary → local disk fallback) but returns
 * the contract the Flutter product form expects:
 *
 *   200 OK   { "data": { "url": "https://..." } }
 *   401      { "message": "Unauthorized" }     (returns to login)
 *   413      { "message": "File too large (max 5 MB)" }
 *   415      { "message": "Only image uploads are accepted" }
 *   422      { "message": "No file provided" }
 *   500      { "message": "Failed to upload image" }
 *
 * Why a separate route instead of re-exporting /admin/upload:
 *  - That route accepts videos and PDFs; mobile is image-only.
 *  - Mobile clients want a 5 MB cap (matches 4G upload patience); admin
 *    accepts larger originals.
 *  - The response shape there is `{ url, path, tier }`; Flutter wants
 *    the standard `{ data: { url } }` envelope used everywhere else in
 *    /api/v1/m/*.
 *
 * Storage tier order (host-agnostic — works the same on Coolify, Vercel,
 * Hostinger, anywhere):
 *   1. Cloudflare R2  if R2_* env vars are set
 *   2. Cloudinary     if CLOUDINARY_* env vars are set
 *   3. Local disk     `<getUploadDir()>/<uniqueName>` — last-resort
 *      fallback for dev. On read-only containers this throws and the
 *      404 lands at the storage stage rather than the route layer.
 *
 * No bumpVersion fired here — uploading a file doesn't change a tracked
 * resource. The product save route that consumes this URL bumps
 * "products" itself.
 */
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { getUploadDir } from "@/lib/uploads";
import { isR2Configured, r2Upload } from "@/lib/r2";
import { isCloudinaryConfigured, cloudinaryUpload } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 5 MB matches the contract documented in REALTIME_SYNC_CHECKLIST.md.
// Flutter pre-compresses to ~88% quality at 2048px, so typical product
// photos land 200–500 KB; 5 MB is plenty of headroom for 4K DSLR shots.
const MAX_BYTES = 5 * 1024 * 1024;

// Image MIME prefix is the only acceptance criterion — the contract
// promises image uploads only. Sharp will refuse anything it can't parse,
// so a wrong extension on a real image still works; a non-image file with
// an image extension fails at sharp.metadata().
const ALLOWED_PREFIX = "image/";

export const POST = withStaff(async (request) => {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Invalid multipart body", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("No file provided", 422);
  }

  if (file.size > MAX_BYTES) {
    return errorResponse("File too large (max 5 MB)", 413);
  }

  // Check declared MIME first — cheap reject for obvious wrong types
  // before we read the bytes.
  if (file.type && !file.type.startsWith(ALLOWED_PREFIX)) {
    return errorResponse("Only image uploads are accepted", 415);
  }

  const bytes = await file.arrayBuffer();
  let buffer: Buffer = Buffer.from(bytes);

  // Compress + size-cap with sharp. Throws if the file isn't a real
  // image (catches the "renamed .pdf to .jpg" trick).
  try {
    const img = sharp(buffer);
    const meta = await img.metadata();
    if (!meta.width || !meta.height) {
      return errorResponse("File is not a valid image", 415);
    }
    // Flutter already downscales to 2048px — we cap at 1920 for the
    // stored copy to keep the CDN payload reasonable.
    if (meta.width > 1920) {
      img.resize(1920, undefined, { withoutEnlargement: true });
    }
    // Convert to webp regardless of input format — best size/quality on
    // modern browsers and the Flutter Image widget. iOS HEIC photos are
    // automatically transcoded.
    buffer = (await img.webp({ quality: 82 }).toBuffer()) as Buffer;
  } catch {
    return errorResponse("Failed to process image", 415);
  }

  // Sanitise filename — keep ASCII + Bangla letters, collapse other
  // chars to '-'. Add a 6-char random suffix so two uploads from the
  // same form don't collide.
  const baseRaw = path.basename(file.name, path.extname(file.name));
  const base = (baseRaw || "upload")
    .replace(/[^a-zA-Z0-9_\-ঀ-৿]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  const rand = Math.random().toString(36).slice(2, 8);
  const uniqueName = `products/${Date.now()}-${rand}-${base}.webp`;

  try {
    if (isR2Configured()) {
      const url = await r2Upload(uniqueName, buffer, "image/webp");
      return jsonResponse({ data: { url } }, 201);
    }

    if (isCloudinaryConfigured()) {
      const url = await cloudinaryUpload(uniqueName, buffer, "image/webp");
      return jsonResponse({ data: { url } }, 201);
    }

    // Local-disk fallback. On Coolify the container can write to its own
    // filesystem but it's ephemeral — a redeploy wipes it. Useful for
    // dev only; production should always have R2 or Cloudinary set.
    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });
    const filename = path.basename(uniqueName);
    await writeFile(path.join(uploadDir, filename), buffer);
    return jsonResponse({ data: { url: `/uploads/${filename}` } }, 201);
  } catch (e) {
    console.error("[m/uploads] storage error:", e);
    const msg = e instanceof Error ? e.message : "Failed to upload image";
    return errorResponse(`Failed to upload image: ${msg}`, 500);
  }
});
