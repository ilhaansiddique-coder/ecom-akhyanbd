// Strip trailing `-TIMESTAMP` from product image paths when the shorter
// version exists in R2. Handles the case where the same image was
// re-uploaded with a new timestamp suffix (DB points to double-timestamp
// name, R2 only has the single-timestamp original).
//
// Usage:
//   node scripts/fix-db-image-paths.mjs --dry-run   (preview)
//   node scripts/fix-db-image-paths.mjs             (apply)

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

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
  } catch {}
}

const dryRun = process.argv.includes("--dry-run");
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("Missing R2 env vars.");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function listAllKeys() {
  const keys = new Set();
  let ContinuationToken;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken }));
    for (const o of res.Contents || []) if (o.Key) keys.add(o.Key);
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return keys;
}

// Given a DB filename, find the best matching R2 key. The same source image
// may appear in R2 with a different number of `-<timestamp>` suffixes (each
// re-upload appends a new timestamp). Strategy:
//   1. Exact match — done.
//   2. Strip trailing `-<digits>` from the DB name until something matches.
//   3. Failing that, look for any R2 key whose name STARTS with the stripped
//      DB base (DB shorter than R2). Pick the longest such key (latest).
function findMatch(filename, keys) {
  if (keys.has(filename)) return filename;
  const ext = path.extname(filename);
  let base = filename.slice(0, -ext.length);

  // Step 2 — DB longer than R2. Strip suffixes.
  let probe = base;
  while (/-\d+$/.test(probe)) {
    probe = probe.replace(/-\d+$/, "");
    if (keys.has(probe + ext)) return probe + ext;
  }

  // Step 3 — DB shorter than R2. Find any key starting with stripped base.
  const startBase = base.replace(/-\d+$/, ""); // strip just the most recent ts
  const candidates = [];
  for (const k of keys) {
    if (k === filename) continue;
    if (!k.endsWith(ext)) continue;
    const kBase = k.slice(0, -ext.length);
    if (kBase === base || kBase.startsWith(base + "-") || kBase.startsWith(startBase + "-") || kBase === startBase) {
      candidates.push(k);
    }
  }
  if (candidates.length) {
    // Prefer longest (most recent re-upload), then lexicographically latest.
    candidates.sort((a, b) => b.length - a.length || b.localeCompare(a));
    return candidates[0];
  }
  return null;
}

const prisma = new PrismaClient();

async function main() {
  const keys = await listAllKeys();
  console.log(`R2 keys: ${keys.size}`);

  // Products
  const products = await prisma.product.findMany({ select: { id: true, image: true } });
  const productUpdates = [];
  for (const p of products) {
    if (!p.image) continue;
    const name = p.image.replace(/^\/+uploads\//, "").replace(/^\/+/, "");
    if (keys.has(name)) continue; // already correct
    const match = findMatch(name, keys);
    if (match) {
      productUpdates.push({ id: p.id, from: p.image, to: `/uploads/${match}` });
    } else {
      console.log(`NO MATCH product ${p.id}: ${p.image}`);
    }
  }

  // ProductImage (gallery)
  let imageUpdates = [];
  try {
    const images = await prisma.productImage.findMany({ select: { id: true, url: true } });
    for (const img of images) {
      if (!img.url) continue;
      const name = img.url.replace(/^\/+uploads\//, "").replace(/^\/+/, "");
      if (!name.includes(".")) continue;
      if (keys.has(name)) continue;
      const match = findMatch(name, keys);
      if (match) {
        imageUpdates.push({ id: img.id, from: img.url, to: `/uploads/${match}` });
      } else {
        console.log(`NO MATCH productImage ${img.id}: ${img.url}`);
      }
    }
  } catch (e) {
    console.log("(skipping ProductImage:", e.message, ")");
  }

  console.log(`\nProducts to update: ${productUpdates.length}`);
  productUpdates.slice(0, 20).forEach((u) => console.log(`  ${u.id}: ${u.from} -> ${u.to}`));
  console.log(`\nProductImages to update: ${imageUpdates.length}`);
  imageUpdates.slice(0, 20).forEach((u) => console.log(`  ${u.id}: ${u.from} -> ${u.to}`));

  if (dryRun) {
    console.log("\nDRY RUN — no writes.");
    await prisma.$disconnect();
    return;
  }

  for (const u of productUpdates) {
    await prisma.product.update({ where: { id: u.id }, data: { image: u.to } });
  }
  for (const u of imageUpdates) {
    await prisma.productImage.update({ where: { id: u.id }, data: { url: u.to } });
  }
  console.log("\nApplied.");
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
