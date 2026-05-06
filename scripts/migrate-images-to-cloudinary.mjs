#!/usr/bin/env node
/**
 * Migrate all image URLs in the database from cdn.akhiyanbd.com (or any
 * non-Cloudinary host) to Cloudinary. Re-uploads each asset to Cloudinary,
 * then rewrites the DB column to point at the new secure URL.
 *
 * Usage:
 *   node scripts/migrate-images-to-cloudinary.mjs --dry-run   # preview only
 *   node scripts/migrate-images-to-cloudinary.mjs             # do it
 *   node scripts/migrate-images-to-cloudinary.mjs --only Product   # one model
 *
 * Idempotent: URLs already on res.cloudinary.com are skipped.
 * Resilient: per-row failures are logged but don't abort the run.
 *
 * Tables migrated (column → JSON-array? notes):
 *   User.image, Category.image, Brand.logo, Product.image, Product.images[],
 *   Review.image, Banner.image, BlogPost.image, BlogPost.og_image,
 *   ProductVariant.image, OrderReturn.images[]
 */
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import path from "path";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const ONLY = (() => {
  const i = args.indexOf("--only");
  return i >= 0 ? args[i + 1] : null;
})();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const FOLDER = process.env.CLOUDINARY_FOLDER || "uploads";

if (!DRY && (!CLOUD_NAME || !API_KEY || !API_SECRET)) {
  console.error("Missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in env. Aborting.");
  process.exit(1);
}

const prisma = new PrismaClient();

function isCloudinary(url) {
  return typeof url === "string" && url.includes("res.cloudinary.com");
}
function looksLikeUrl(s) {
  return typeof s === "string" && /^https?:\/\//.test(s);
}

function sign(params) {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(sorted + API_SECRET).digest("hex");
}

async function uploadToCloudinary(sourceUrl) {
  // Cloudinary supports fetching from a URL directly, no need to download bytes ourselves.
  const filename = path.basename(new URL(sourceUrl).pathname).replace(/\.[^/.]+$/, "");
  const publicId = filename || `migrated-${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signParams = {
    folder: FOLDER,
    public_id: publicId,
    timestamp: String(timestamp),
  };
  const signature = sign(signParams);

  const form = new FormData();
  form.append("file", sourceUrl); // remote URL — Cloudinary fetches it
  form.append("api_key", API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", FOLDER);
  form.append("public_id", publicId);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const finalUrl = data.secure_url || data.url;
  if (!finalUrl) throw new Error("Cloudinary returned no URL");
  return finalUrl;
}

const stats = { scanned: 0, alreadyCloudinary: 0, migrated: 0, failed: 0, skipped: 0 };

async function migrateScalar(modelName, where, idField, fieldName, originalUrl) {
  stats.scanned++;
  if (!looksLikeUrl(originalUrl)) { stats.skipped++; return; }
  if (isCloudinary(originalUrl)) { stats.alreadyCloudinary++; return; }

  if (DRY) {
    console.log(`[DRY] ${modelName}#${where[idField]}.${fieldName}  ${originalUrl}`);
    stats.migrated++;
    return;
  }

  try {
    const newUrl = await uploadToCloudinary(originalUrl);
    await prisma[modelName].update({ where, data: { [fieldName]: newUrl } });
    console.log(`✓ ${modelName}#${where[idField]}.${fieldName}\n   ${originalUrl}\n → ${newUrl}`);
    stats.migrated++;
  } catch (e) {
    console.error(`✗ ${modelName}#${where[idField]}.${fieldName}: ${e.message}`);
    stats.failed++;
  }
}

async function migrateJsonArray(modelName, where, idField, fieldName, raw) {
  if (!raw) { stats.skipped++; return; }
  let arr;
  try { arr = JSON.parse(raw); } catch { stats.skipped++; return; }
  if (!Array.isArray(arr) || arr.length === 0) { stats.skipped++; return; }

  let changed = false;
  const out = [];
  for (const item of arr) {
    if (!looksLikeUrl(item)) { out.push(item); continue; }
    if (isCloudinary(item)) { out.push(item); stats.alreadyCloudinary++; continue; }
    stats.scanned++;
    if (DRY) {
      console.log(`[DRY] ${modelName}#${where[idField]}.${fieldName}[]  ${item}`);
      stats.migrated++;
      out.push(item); // dry run keeps original
      continue;
    }
    try {
      const newUrl = await uploadToCloudinary(item);
      out.push(newUrl);
      changed = true;
      stats.migrated++;
      console.log(`✓ ${modelName}#${where[idField]}.${fieldName}[] ${item} → ${newUrl}`);
    } catch (e) {
      console.error(`✗ ${modelName}#${where[idField]}.${fieldName}[]: ${e.message}`);
      out.push(item); // keep old URL on failure
      stats.failed++;
    }
  }
  if (changed && !DRY) {
    await prisma[modelName].update({ where, data: { [fieldName]: JSON.stringify(out) } });
  }
}

const TASKS = [
  { model: "user", id: "id", scalar: ["image"] },
  { model: "category", id: "id", scalar: ["image"] },
  { model: "brand", id: "id", scalar: ["logo"] },
  { model: "product", id: "id", scalar: ["image"], jsonArray: ["images"] },
  { model: "review", id: "id", scalar: ["image"] },
  { model: "banner", id: "id", scalar: ["image"] },
  { model: "blogPost", id: "id", scalar: ["image", "ogImage"] },
  { model: "productVariant", id: "id", scalar: ["image"] },
  { model: "orderReturn", id: "id", jsonArray: ["images"] },
];

async function run() {
  console.log(DRY ? "── DRY RUN — no changes will be written ──" : "── LIVE MIGRATION ──");
  if (ONLY) console.log(`Filter: only model "${ONLY}"`);

  for (const task of TASKS) {
    if (ONLY && task.model.toLowerCase() !== ONLY.toLowerCase()) continue;
    const fields = [...(task.scalar || []), ...(task.jsonArray || [])];
    const select = { [task.id]: true };
    for (const f of fields) select[f] = true;
    const rows = await prisma[task.model].findMany({ select });
    console.log(`\n=== ${task.model} (${rows.length} rows) ===`);
    for (const row of rows) {
      const where = { [task.id]: row[task.id] };
      for (const f of task.scalar || []) {
        await migrateScalar(task.model, where, task.id, f, row[f]);
      }
      for (const f of task.jsonArray || []) {
        await migrateJsonArray(task.model, where, task.id, f, row[f]);
      }
    }
  }

  console.log("\n── Summary ──");
  console.log(`Scanned URLs:        ${stats.scanned}`);
  console.log(`Already Cloudinary:  ${stats.alreadyCloudinary}`);
  console.log(`Migrated:            ${stats.migrated}${DRY ? " (would migrate)" : ""}`);
  console.log(`Failed:              ${stats.failed}`);
  console.log(`Skipped (not a URL): ${stats.skipped}`);
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
