import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import sharp from "sharp";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tiff"]);
const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tiff", ".gif", ".mp4", ".webm", ".mov", ".pdf"]);
const MAX_WIDTH = 1920;
const QUALITY = 80;

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided", 422);
    }

    const bytes = await file.arrayBuffer();
    let buffer: Buffer<ArrayBuffer> = Buffer.from(bytes);

    const ext = path.extname(file.name).toLowerCase();

    // Security: reject disallowed file types (prevents HTML/JS upload XSS)
    if (!ALLOWED_EXTS.has(ext)) {
      return errorResponse(`File type ${ext} is not allowed. Allowed: ${[...ALLOWED_EXTS].join(", ")}`, 422);
    }

    const basename = path.basename(file.name, path.extname(file.name))
      .replace(/[^a-zA-Z0-9_\-\u0980-\u09FF]/g, "-")
      .replace(/-+/g, "-");

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    let finalExt = ext;

    // Compress images with sharp
    if (IMAGE_EXTS.has(ext)) {
      try {
        const img = sharp(buffer);
        const metadata = await img.metadata();

        // Resize if wider than MAX_WIDTH, maintain aspect ratio
        if (metadata.width && metadata.width > MAX_WIDTH) {
          img.resize(MAX_WIDTH, undefined, { withoutEnlargement: true });
        }

        // Convert to WebP for best compression (except if already webp/avif)
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
    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    const url = `/uploads/${uniqueName}`;

    return jsonResponse({ url, path: url }, 201);
  } catch (error) {
    return errorResponse("Failed to upload file", 500);
  }
}
