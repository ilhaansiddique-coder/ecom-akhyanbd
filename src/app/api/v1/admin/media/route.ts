import { NextRequest } from "next/server";
import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { jsonResponse, errorResponse, validationError } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { getUploadDir } from "@/lib/uploads";
import { isR2Configured, r2List, r2Delete, r2PublicUrl } from "@/lib/r2";
import { isCloudinaryConfigured, cloudinaryList, cloudinaryDelete, cloudinaryPublicIdFromUrl } from "@/lib/cloudinary";
import { mediaDeleteSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"];
const VIDEO_EXTS = [".mp4", ".webm", ".mov", ".avi", ".mkv"];

/**
 * GET /api/v1/admin/media — List all uploaded files.
 * Prefers R2 when configured, falls back to local uploads dir.
 */
export const GET = withStaff(async (_request) => {
  try {
    if (isR2Configured()) {
      const objects = await r2List();
      const media = objects
        .map((o) => {
          const ext = path.extname(o.key).toLowerCase();
          const isVideo = VIDEO_EXTS.includes(ext);
          const isImage = IMAGE_EXTS.includes(ext);
          if (!isVideo && !isImage) return null;
          return {
            filename: o.key,
            url: r2PublicUrl(o.key),
            size: o.size,
            type: isVideo ? "video" : "image",
            modified: o.modified,
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b!.modified).getTime() - new Date(a!.modified).getTime());
      return jsonResponse(media);
    }

    // Cloudinary fallback. Lists images via the Admin API (HTTP Basic auth)
    // so the gallery widget shows previously-uploaded assets when R2 isn't
    // configured. Only images are returned — Cloudinary's free tier doesn't
    // support video listing the same way and storefront doesn't use video.
    if (isCloudinaryConfigured()) {
      const objects = await cloudinaryList();
      const media = objects
        .map((o) => ({
          // url is the canonical Cloudinary delivery URL — what gets stored
          // in product image fields; pass it as filename too so DELETE can
          // round-trip via cloudinaryPublicIdFromUrl.
          filename: o.url,
          url: o.url,
          size: o.size,
          type: "image" as const,
          modified: o.modified,
        }))
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
      return jsonResponse(media);
    }

    const uploadsDir = getUploadDir();
    const files = await readdir(uploadsDir).catch(() => []);

    const media = await Promise.all(
      files
        .filter((f) => !f.startsWith("."))
        .map(async (filename) => {
          try {
            const filePath = path.join(uploadsDir, filename);
            const stats = await stat(filePath);
            const ext = path.extname(filename).toLowerCase();
            const isVideo = VIDEO_EXTS.includes(ext);
            const isImage = IMAGE_EXTS.includes(ext);

            return {
              filename,
              url: `/uploads/${filename}`,
              size: stats.size,
              type: isVideo ? "video" : isImage ? "image" : "other",
              modified: stats.mtime.toISOString(),
            };
          } catch {
            return null;
          }
        })
    );

    const sorted = media
      .filter(Boolean)
      .filter((m) => m!.type !== "other")
      .sort((a, b) => new Date(b!.modified).getTime() - new Date(a!.modified).getTime());

    return jsonResponse(sorted);
  } catch {
    return errorResponse("Failed to list media", 500);
  }
});

/**
 * DELETE /api/v1/admin/media — Delete an uploaded file.
 * Accepts either a bare filename (legacy local) or an R2 key.
 */
export const DELETE = withStaff(async (request) => {
  try {
    const body = await request.json();
    const parsed = mediaDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const { filename } = parsed.data;

    if (isR2Configured()) {
      // Accept keys that may have a leading slash or path prefix
      const key = filename.replace(/^\/+/, "").replace(/^uploads\//, "");
      const ok = await r2Delete(key);
      if (!ok) return errorResponse("Failed to delete file", 500);
      bumpVersion("media");
      return jsonResponse({ message: "File deleted" });
    }
    // Cloudinary fallback. The "filename" passed in is typically a delivery
    // URL stored on a product; extract its public_id to issue the destroy
    // call. If the URL doesn't match Cloudinary's pattern, fall through to
    // the local disk path below.
    if (isCloudinaryConfigured()) {
      const publicId = cloudinaryPublicIdFromUrl(filename) || filename.replace(/\.[^/.]+$/, "");
      const ok = await cloudinaryDelete(publicId, "image");
      if (ok) return jsonResponse({ message: "File deleted" });
      // If delete failed but URL clearly was Cloudinary, surface the error
      // so admin sees the failure instead of silently nuking nothing.
      if (filename.includes("cloudinary.com")) {
        return errorResponse("Failed to delete Cloudinary asset", 500);
      }
      // Otherwise fall through to local disk delete (legacy file).
    }

    const safeName = path.basename(filename);
    const filePath = path.join(getUploadDir(), safeName);
    await unlink(filePath);
    return jsonResponse({ message: "File deleted" });
  } catch {
    return errorResponse("Failed to delete file", 500);
  }
});
