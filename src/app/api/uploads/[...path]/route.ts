import { NextRequest } from "next/server";
import { stat, readFile } from "fs/promises";
import path from "path";
import { getUploadDir, mimeForExt } from "@/lib/uploads";

/**
 * GET /api/uploads/<filename>
 *
 * Streams files from `getUploadDir()` (env-configurable) so that runtime-added
 * uploads work even when Next's standalone build doesn't serve `public/`. The
 * legacy `/uploads/<filename>` URL is rewritten to here in `next.config.ts`,
 * so existing image URLs keep working without any DB migration.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: parts } = await params;
    if (!parts || parts.length === 0) return new Response("Not found", { status: 404 });

    // Strip any traversal — basename each segment, rejoin.
    const safeRel = parts.map((p) => path.basename(p)).join("/");
    const abs = path.join(getUploadDir(), safeRel);

    // Confirm it's actually under the upload dir (defense-in-depth).
    const root = path.resolve(getUploadDir());
    if (!path.resolve(abs).startsWith(root + path.sep) && path.resolve(abs) !== root) {
      return new Response("Forbidden", { status: 403 });
    }

    const stats = await stat(abs).catch(() => null);
    if (!stats || !stats.isFile()) return new Response("Not found", { status: 404 });

    const data = await readFile(abs);
    const mime = mimeForExt(path.extname(abs));

    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(stats.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Server error", { status: 500 });
  }
}
