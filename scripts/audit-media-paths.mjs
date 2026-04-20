// Full media audit: scan every DB column that could hold a /uploads/ or
// cdn.akhiyanbd.com path across all models, report broken references, and
// optionally fix them against R2 keys.
//
// Usage:
//   node scripts/audit-media-paths.mjs            (report only)
//   node scripts/audit-media-paths.mjs --fix      (apply repairs)
//
// Coverage:
//   Product.image, Product.images (JSON list)
//   ProductVariant.image
//   Category.image
//   Brand.logo
//   Banner.image
//   BlogPost.image
//   Review.image
//   User.avatar
//   LandingPage.heroImage, LandingPage.featuresImage
//   LandingPage.features, testimonials, howItWorks (JSON — scan for /uploads/)
//   SiteSetting values (logo, favicon, etc.)

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

const APPLY = process.argv.includes("--fix");
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("Missing R2 env."); process.exit(1);
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

function keyFromPath(p) {
  // Accept /uploads/foo.webp, https://cdn.../foo.webp, storage/foo.webp, bare foo.webp
  if (!p) return null;
  try {
    const s = p.trim();
    if (!s) return null;
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const u = new URL(s);
      return u.pathname.replace(/^\/+/, "");
    }
    return s.replace(/^\/+/, "").replace(/^storage\//, "").replace(/^uploads\//, "");
  } catch { return null; }
}

function findMatch(filename, keys) {
  if (!filename) return null;
  if (keys.has(filename)) return filename;
  const ext = path.extname(filename);
  if (!ext) return null;
  let base = filename.slice(0, -ext.length);

  let probe = base;
  while (/-\d+$/.test(probe)) {
    probe = probe.replace(/-\d+$/, "");
    if (keys.has(probe + ext)) return probe + ext;
  }

  const startBase = base.replace(/-\d+$/, "");
  const candidates = [];
  for (const k of keys) {
    if (k === filename || !k.endsWith(ext)) continue;
    const kBase = k.slice(0, -ext.length);
    if (kBase === base || kBase.startsWith(base + "-") || kBase === startBase || kBase.startsWith(startBase + "-")) {
      candidates.push(k);
    }
  }
  candidates.sort((a, b) => b.length - a.length || b.localeCompare(a));
  return candidates[0] || null;
}

// Replace every /uploads/... reference in a freeform string. Returns
// { out, changed } where `changed` is true if any replacement happened.
function repairText(str, keys) {
  if (!str || typeof str !== "string") return { out: str, changed: false };
  let changed = false;
  // Match bare /uploads/<name> and absolute cdn URLs
  const out = str.replace(/(\/uploads\/[A-Za-z0-9_\-\u0980-\u09FF.]+|https?:\/\/[^\s"'<>]+)/g, (raw) => {
    const key = keyFromPath(raw);
    if (!key || !key.includes(".")) return raw;
    // Only touch media-looking extensions
    if (!/\.(webp|jpe?g|png|gif|avif|tiff|svg|mp4|webm|mov|mkv)$/i.test(key)) return raw;
    if (keys.has(key)) return raw; // already fine
    const match = findMatch(key, keys);
    if (!match) return raw;
    changed = true;
    return `/uploads/${match}`;
  });
  return { out, changed };
}

const prisma = new PrismaClient();
const keys = await listAllKeys();
console.log(`R2 keys: ${keys.size}\n`);

const report = { broken: [], fixed: [], alreadyOk: 0 };

async function processField(modelName, rows, field, updateFn) {
  for (const r of rows) {
    const val = r[field];
    if (!val) continue;
    if (typeof val === "string" && (val.startsWith("/uploads/") || val.includes("cdn.akhiyanbd.com") || val.startsWith("http"))) {
      const key = keyFromPath(val);
      if (!key) continue;
      if (keys.has(key)) { report.alreadyOk++; continue; }
      const match = findMatch(key, keys);
      if (!match) {
        report.broken.push({ model: modelName, id: r.id, field, value: val });
      } else {
        const newVal = `/uploads/${match}`;
        report.fixed.push({ model: modelName, id: r.id, field, from: val, to: newVal });
        if (APPLY) await updateFn(r.id, newVal);
      }
    }
  }
}

async function processJsonField(modelName, rows, field, updateFn) {
  for (const r of rows) {
    const val = r[field];
    if (!val || typeof val !== "string") continue;
    const { out, changed } = repairText(val, keys);
    if (changed) {
      report.fixed.push({ model: modelName, id: r.id, field, from: "(json)", to: "(json-updated)" });
      if (APPLY) await updateFn(r.id, out);
    }
    // Broken JSON refs: scan for /uploads/ still in the string after repair that don't resolve
    const remaining = (out.match(/\/uploads\/[A-Za-z0-9_\-\u0980-\u09FF.]+/g) || [])
      .map(k => k.replace(/^\/uploads\//, ""))
      .filter(k => k.includes(".") && !keys.has(k) && !findMatch(k, keys));
    for (const b of remaining) {
      report.broken.push({ model: modelName, id: r.id, field, value: `/uploads/${b}` });
    }
  }
}

// --- Scan every model ---
const simpleTargets = [
  ["product", "image"],
  ["productVariant", "image"],
  ["category", "image"],
  ["brand", "logo"],
  ["banner", "image"],
  ["blogPost", "image"],
  ["review", "image"],
  ["user", "avatar"],
  ["landingPage", "heroImage"],
  ["landingPage", "featuresImage"],
];

for (const [model, field] of simpleTargets) {
  if (!prisma[model]) { console.log(`(skip ${model}.${field} — model missing)`); continue; }
  const rows = await prisma[model].findMany({ select: { id: true, [field]: true } });
  await processField(model, rows, field, async (id, newVal) => {
    await prisma[model].update({ where: { id }, data: { [field]: newVal } });
  });
}

// JSON-ish fields
const jsonTargets = [
  ["product", "images"],
  ["landingPage", "features"],
  ["landingPage", "testimonials"],
  ["landingPage", "howItWorks"],
  ["landingPage", "products"],
  ["landingPage", "faq"],
];
for (const [model, field] of jsonTargets) {
  if (!prisma[model]) continue;
  const rows = await prisma[model].findMany({ select: { id: true, [field]: true } });
  await processJsonField(model, rows, field, async (id, newVal) => {
    await prisma[model].update({ where: { id }, data: { [field]: newVal } });
  });
}

// SiteSetting (key-value pairs; fix any value containing /uploads/)
if (prisma.siteSetting) {
  const rows = await prisma.siteSetting.findMany({ select: { key: true, value: true } });
  for (const r of rows) {
    const val = r.value;
    if (!val || typeof val !== "string") continue;
    const { out, changed } = repairText(val, keys);
    if (changed) {
      report.fixed.push({ model: "siteSetting", id: r.key, field: "value", from: val, to: out });
      if (APPLY) await prisma.siteSetting.update({ where: { key: r.key }, data: { value: out } });
    }
    const key = keyFromPath(val);
    if (key && key.includes(".") && /\.(webp|jpe?g|png|gif|svg|mp4|webm)$/i.test(key) && !keys.has(key) && !findMatch(key, keys)) {
      report.broken.push({ model: "siteSetting", id: r.key, field: "value", value: val });
    }
  }
}

console.log(`Already OK: ${report.alreadyOk}`);
console.log(`\nFixed (${report.fixed.length}):`);
report.fixed.forEach(f => console.log(`  ${f.model}#${f.id} ${f.field}: ${f.from} -> ${f.to}`));
console.log(`\nBroken — no R2 match (${report.broken.length}):`);
report.broken.forEach(b => console.log(`  ${b.model}#${b.id} ${b.field}: ${b.value}`));
console.log(APPLY ? "\nApplied." : "\nReport only (run with --fix to apply).");

await prisma.$disconnect();
