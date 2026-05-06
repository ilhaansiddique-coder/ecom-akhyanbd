import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { getUploadDir } from "@/lib/uploads";
import { isR2Configured, r2Upload } from "@/lib/r2";
import { isCloudinaryConfigured, cloudinaryUpload } from "@/lib/cloudinary";
import sharp from "sharp";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tiff"]);
const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tiff", ".gif", ".mp4", ".webm", ".mov", ".pdf"]);
const MAX_WIDTH = 1920;
const QUALITY = 80;

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif",
  ".tiff": "image/tiff", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".pdf": "application/pdf",
};

export const POST = withStaff(async (request) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided", 422);
    }

    const bytes = await file.arrayBuffer();
    let buffer: Buffer<ArrayBuffer> = Buffer.from(bytes);

    const ext = path.extname(file.name).toLowerCase();

    if (!ALLOWED_EXTS.has(ext)) {
      return errorResponse(`File type ${ext} is not allowed. Allowed: ${[...ALLOWED_EXTS].join(", ")}`, 422);
    }

    const basename = path.basename(file.name, path.extname(file.name))
      .replace(/[^a-zA-Z0-9_\-\u0980-\u09FF]/g, "-")
      .replace(/-+/g, "-");

    let finalExt = ext;

    // Compress images with sharp
    if (IMAGE_EXTS.has(ext)) {
      try {
        const img = sharp(buffer);
        const metadata = await img.metadata();

        if (metadata.width && metadata.width > MAX_WIDTH) {
          img.resize(MAX_WIDTH, undefined, { withoutEnlargement: true });
        }

        if (ext !== ".webp" && ext !== ".avif") {
          buffer = await img.webp({ quality: QUALITY }).toBuffer() as Buffer<ArrayBuffer>;
          finalExt = ".webp";
        } else if (ext === ".webp") {
          buffer = await img.webp({ quality: QUALITY }).toBuffer() as Buffer<ArrayBuffer>;
        } else {
          buffer = await img.avif({ quality: QUALITY }).toBuffer() as Buffer<ArrayBuffer>;
        }
      } catch {
        // If sharp fails, save original
      }
    }

    const uniqueName = `${basename}-${Date.now()}${finalExt}`;
    const contentType = MIME[finalExt] || "application/octet-stream";

    // Storage tier order is controlled by STORAGE_PRIMARY env var:
    //   "cloudinary" → Cloudinary first, R2 fallback. Use this when the CDN
    //                  in front of R2 (cdn.akhiyanbd.com) doesn't send CORS
    //                  headers, since Flutter web XHRs images and breaks.
    //   anything else (default) → R2 first, Cloudinary fallback.
    // Local disk is always the final fallback so dev keeps working.
    const primary = (process.env.STORAGE_PRIMARY || "r2").toLowerCase();
    const tiers: Array<{ name: string; ready: () => boolean; upload: () => Promise<string> }> = [];
    const r2 = { name: "r2", ready: isR2Configured, upload: () => r2Upload(uniqueName, buffer, contentType) };
    const cl = { name: "cloudinary", ready: isCloudinaryConfigured, upload: () => cloudinaryUpload(uniqueName, buffer, contentType) };
    if (primary === "cloudinary") tiers.push(cl, r2);
    else tiers.push(r2, cl);

    for (const tier of tiers) {
      if (!tier.ready()) continue;
      try {
        const url = await tier.upload();
        return jsonResponse({ url, path: url, tier: tier.name }, 201);
      } catch (e) {
        const msg = e instanceof Error ? e.message : `${tier.name} upload failed`;
        console.error(`[upload] ${tier.name} failed:`, msg);
        // Fall through to next tier — don't 500 yet; try the backup.
      }
    }

    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);
    const url = `/uploads/${uniqueName}`;
    return jsonResponse({ url, path: url, tier: "local" }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[upload] handler error:", msg);
    return errorResponse(`Failed to upload file: ${msg}`, 500);
  }
});
