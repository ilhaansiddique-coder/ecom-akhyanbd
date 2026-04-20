// Migrate local public/uploads/* to Cloudflare R2.
//
// Usage:
//   node scripts/migrate-to-r2.mjs [--dir <path>] [--dry-run]
//
// Env vars required (put in .env.local or export):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//
// Keys are written as the plain filename (no `uploads/` prefix) so the
// existing `/uploads/<name>` URLs work after the next.config rewrite
// sends them to R2.

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Env loader — read .env.local then .env (first match wins), tiny KEY=value parser.
for (const name of [".env.local", ".env"]) {
  try {
    const txt = await readFile(path.join(projectRoot, name), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      if (process.env[m[1]]) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  } catch { /* missing file — try next */ }
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dirFlag = args.indexOf("--dir");
const srcDir = dirFlag >= 0 ? path.resolve(args[dirFlag + 1]) : path.join(projectRoot, "public", "uploads");

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("Missing R2 env vars. Need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.");
  process.exit(1);
}

const MIME = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif",
  ".tiff": "image/tiff", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".pdf": "application/pdf",
};

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function exists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch { return false; }
}

async function main() {
  console.log(`Source: ${srcDir}`);
  console.log(`Bucket: ${R2_BUCKET}`);
  console.log(`Dry run: ${dryRun}`);

  const files = await readdir(srcDir).catch(() => []);
  if (!files.length) { console.log("No files to upload."); return; }

  let uploaded = 0, skipped = 0, failed = 0;
  for (const name of files) {
    if (name.startsWith(".")) continue;
    const full = path.join(srcDir, name);
    const s = await stat(full).catch(() => null);
    if (!s?.isFile()) continue;

    const ext = path.extname(name).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";

    if (await exists(name)) {
      skipped++;
      console.log(`SKIP  ${name} (already in R2)`);
      continue;
    }

    if (dryRun) {
      console.log(`DRY   ${name} (${s.size} bytes, ${contentType})`);
      continue;
    }

    try {
      const body = await readFile(full);
      await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: name,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }));
      uploaded++;
      console.log(`UP    ${name}`);
    } catch (err) {
      failed++;
      console.error(`FAIL  ${name}: ${err.message}`);
    }
  }

  console.log(`\nDone. uploaded=${uploaded} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
