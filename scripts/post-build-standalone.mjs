/**
 * Post-build helper for non-Vercel hosts (Hostinger, VPS, Docker, etc.).
 *
 * `output: "standalone"` produces .next/standalone/ but does NOT copy
 * public/ or .next/static/ into it. Without those, the server can't find
 * /fonts/*, /uploads/*, /_next/static/*. Bengali digit fonts (AnekBangla
 * TTFs) live in public/fonts and were the most-visible casualty.
 *
 * This script copies them in. Cross-platform — uses fs.cp instead of `cp -r`
 * so it works on Windows, macOS, and Linux. Vercel ignores `output:
 * "standalone"` entirely, so this script is a harmless no-op there.
 *
 * Wire into package.json `scripts.postbuild` to run automatically after
 * `npm run build`.
 */
import { existsSync, cpSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const STANDALONE = join(ROOT, ".next", "standalone");

if (!existsSync(STANDALONE)) {
  console.log("[post-build] No .next/standalone — skipping (probably Vercel/non-standalone build).");
  process.exit(0);
}

const PAIRS = [
  [join(ROOT, "public"), join(STANDALONE, "public")],
  [join(ROOT, ".next", "static"), join(STANDALONE, ".next", "static")],
];

for (const [src, dest] of PAIRS) {
  if (!existsSync(src)) {
    console.log(`[post-build] Source missing: ${src} — skipping.`);
    continue;
  }
  cpSync(src, dest, { recursive: true, force: true });
  console.log(`[post-build] Copied ${src} → ${dest}`);
}

console.log("[post-build] Standalone bundle ready.");
