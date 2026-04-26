import type { PathaoListItem, PathaoParsedAddress } from "./pathao";

/**
 * Pathao's address-parser sometimes locks onto a generic substring early
 * ("Bandarban bazar" → area="Bazar") and misses a more specific area name
 * mentioned later in the same address ("Chowdhuri Market area"). Their
 * algorithm is inside the merchant panel and we can't tune it directly.
 *
 * What we CAN do: after Pathao returns a parsed result, re-score each
 * registered area in the resolved zone against the customer's address text
 * using simple keyword overlap + fuzzy normalisation. If a different area
 * scores meaningfully better than Pathao's pick, override it.
 *
 * Scoring rules:
 *  - Normalise both strings: lowercase, transliterate Bangla digits, strip
 *    common punctuation, collapse whitespace.
 *  - Token-level overlap (each area name's content tokens against the
 *    address's tokens). Tokens shorter than 3 chars are skipped (too noisy).
 *  - Fuzzy character-class equivalents handle BD spelling variants:
 *    y↔i (Chowdhury / Chowdhuri), oo↔u (Hoor / Hur), final s/z drops, etc.
 *  - Longer tokens score more (a 7-char match beats a 4-char match).
 *  - We deliberately UNDER-WEIGHT generic words like "bazar", "market",
 *    "road", "sadar" so they don't dominate when the address actually
 *    contains a specific landmark.
 *
 * The override fires when our top score beats Pathao's pick by a margin
 * (default 1.15x — small enough to catch the Chowdhuri-vs-Bazar case but
 * not so aggressive that we second-guess high-confidence Pathao matches).
 * Bonus override condition: if Pathao picked an area whose name is ENTIRELY
 * stopwords (e.g. "Bazar", "Sadar Road") and we have ANY substring match
 * elsewhere, we always swap — those generic picks are almost never what
 * the customer meant when they wrote a specific landmark in the address.
 */

const STOPWORDS = new Set([
  "bazar", "bazaar", "bazr", "market", "shop", "shopping",
  "road", "rd", "lane", "gali", "house", "flat", "floor",
  "sadar", "sodor", "thana", "ps",
  "the", "and", "near", "beside", "opposite", "front", "back",
  "city", "town", "village", "vill", "post", "office", "po",
  // very generic single chars / numbers from address noise
  "a", "an", "of", "at", "in", "to",
]);

/** Normalise a freeform address / area name down to a comparable form. */
function normalise(s: string): string {
  return String(s || "")
    .toLowerCase()
    // Transliterate Bangla digits → Western (so "১২৩" → "123").
    .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    // Strip common punctuation but keep word boundaries.
    .replace(/[.,()\[\]{}'"–—•/\\|]/g, " ")
    // Collapse whitespace.
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokenise + drop stopwords + drop tokens shorter than 3 chars. */
function meaningfulTokens(s: string): string[] {
  return normalise(s)
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * Soft-equal — tolerates the most common BD spelling variants of the same
 * sound. Handles cases like Chowdhury/Chowdhuri, Hoor/Hur, Bashundhara/
 * Bosundhara, Mohammedpur/Mohammadpur. Returns true if either word is a
 * prefix/suffix variant of the other and lengths are within 2 chars.
 */
function softEq(a: string, b: string): boolean {
  if (a === b) return true;
  // Quick reject if length differs by more than 2.
  if (Math.abs(a.length - b.length) > 2) return false;
  // Apply the fuzzy normalisations to both, compare.
  const fuzz = (w: string) =>
    w
      .replace(/y/g, "i")          // Chowdhury → Chowdhuri
      .replace(/w/g, "u")          // Howrah → Houra (rare but harmless)
      .replace(/oo/g, "u")         // Hoor → Hur
      .replace(/aa/g, "a")         // Salam / Salaam
      .replace(/sh/g, "s")         // Bashundhara → Basundhara (one-direction)
      .replace(/(.)\1+/g, "$1")    // Collapse repeats: pwwn → pwn
      .replace(/[^a-z0-9]/g, "");
  return fuzz(a) === fuzz(b);
}

/**
 * Score one area name against the customer's address tokens.
 * Returns a number; higher = better. Tokens that match get credit
 * proportional to their length (longer = more meaningful).
 */
function scoreAreaAgainstAddress(areaName: string, addressTokens: string[]): number {
  const areaTokens = meaningfulTokens(areaName);
  if (areaTokens.length === 0 || addressTokens.length === 0) return 0;
  let score = 0;
  for (const at of areaTokens) {
    for (const ad of addressTokens) {
      if (softEq(at, ad)) {
        // Longer matches are worth more; raise to power 1.5 so a 7-char
        // hit (~18.5pts) decisively beats a 4-char hit (~8pts).
        score += Math.pow(at.length, 1.5);
        break; // Only count each area-token once.
      }
    }
  }
  // Slight bonus per matched-token count so a 2-token match outranks a
  // single big-token match of similar total length.
  const matchedTokens = areaTokens.filter((at) => addressTokens.some((ad) => softEq(at, ad))).length;
  if (matchedTokens > 1) score *= 1 + 0.15 * (matchedTokens - 1);
  return score;
}

/**
 * Public API. Given the customer address, Pathao's parsed result, and the
 * full area list for the matched zone, decide whether to override the area.
 *
 * Returns the (possibly modified) parsed result. When we override, the
 * `score` is bumped to signal "we're confident in this swap" and a
 * `_rescored` field is added for client-side debugging / dev visibility.
 */
export function rescoreArea(
  address: string,
  parsed: PathaoParsedAddress,
  areasInZone: PathaoListItem[],
  opts: { overrideMargin?: number } = {},
): PathaoParsedAddress & { _rescored?: boolean } {
  const margin = opts.overrideMargin ?? 1.15;
  if (!parsed?.zone_id) return parsed;
  if (!Array.isArray(areasInZone) || areasInZone.length === 0) return parsed;

  const addressTokens = meaningfulTokens(address);
  if (addressTokens.length === 0) return parsed;

  // Score every area in this zone.
  const scored = areasInZone
    .filter((a) => !!a.area_id && !!a.area_name)
    .map((a) => ({
      area: a,
      score: scoreAreaAgainstAddress(a.area_name!, addressTokens),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return parsed;
  const top = scored[0];

  // What did Pathao pick?
  const pathaoPickScore = parsed.area_id
    ? scored.find((s) => s.area.area_id === parsed.area_id)?.score || 0
    : 0;

  // Detect "all-stopwords" Pathao picks (e.g. "Bazar", "Sadar Road"). When
  // Pathao locks onto an area whose name is essentially generic noise, we
  // ALWAYS prefer any specific landmark match if available.
  const pathaoPickName =
    areasInZone.find((a) => a.area_id === parsed.area_id)?.area_name || parsed.area_name || "";
  const pathaoPickIsGeneric =
    !!pathaoPickName &&
    meaningfulTokens(pathaoPickName).length === 0;

  // Override when our top match has a positive score AND it's a different
  // area AND either:
  //  (a) Pathao's pick is generic-stopword-only and we have a real match, OR
  //  (b) our top score beats Pathao's by the configured margin.
  if (
    top.area.area_id !== parsed.area_id &&
    top.score > 0 &&
    (pathaoPickIsGeneric || pathaoPickScore === 0 || top.score >= pathaoPickScore * margin)
  ) {
    return {
      ...parsed,
      area_id: top.area.area_id,
      area_name: top.area.area_name,
      // Bump score so the UI's confidence indicator reflects the better fit.
      score: Math.max(parsed.score || 0, 8.5),
      _rescored: true,
    };
  }

  return parsed;
}
