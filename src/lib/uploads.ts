import path from "path";

/**
 * Absolute filesystem dir where user-uploaded files live.
 *
 * Default: `<projectRoot>/public/uploads` — the legacy spot, served as static
 * assets in dev and standard `next start`.
 *
 * Override with `UPLOAD_DIR` env var. Use this on hosts where the standalone
 * build output (`output: "standalone"`) doesn't serve runtime-added files in
 * `public/` (e.g. Hostinger). Point it at a persistent dir outside the build
 * output, then serve files via the `/api/uploads/[...]` route (reachable at
 * the same `/uploads/*` URL via the next.config rewrite).
 *
 * Examples:
 *   UPLOAD_DIR=/home/user/persistent-uploads
 *   UPLOAD_DIR=./storage/uploads
 */
export function getUploadDir(): string {
  const fromEnv = process.env.UPLOAD_DIR;
  if (fromEnv && fromEnv.trim()) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return path.join(process.cwd(), "public", "uploads");
}

/** Mime type for a file extension. */
export function mimeForExt(ext: string): string {
  const e = ext.toLowerCase().replace(/^\./, "");
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
    gif: "image/gif",
    svg: "image/svg+xml",
    tiff: "image/tiff",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
    pdf: "application/pdf",
  };
  return map[e] || "application/octet-stream";
}
