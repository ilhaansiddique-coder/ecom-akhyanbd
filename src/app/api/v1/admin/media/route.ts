import { NextRequest } from "next/server";
import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

/**
 * GET /api/v1/admin/media — List all uploaded files from public/uploads
 */
export async function GET(_request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const files = await readdir(uploadsDir).catch(() => []);

    const media = await Promise.all(
      files
        .filter((f) => !f.startsWith("."))
        .map(async (filename) => {
          try {
            const filePath = path.join(uploadsDir, filename);
            const stats = await stat(filePath);
            const ext = path.extname(filename).toLowerCase();
            const isVideo = [".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext);
            const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"].includes(ext);

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
}

/**
 * DELETE /api/v1/admin/media — Delete an uploaded file
 */
export async function DELETE(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const { filename } = await request.json();
    if (!filename || typeof filename !== "string") {
      return errorResponse("Filename required", 400);
    }

    // Prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.join(process.cwd(), "public", "uploads", safeName);

    await unlink(filePath);
    return jsonResponse({ message: "File deleted" });
  } catch {
    return errorResponse("Failed to delete file", 500);
  }
}
