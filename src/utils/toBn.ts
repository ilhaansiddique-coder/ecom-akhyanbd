const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

// Global language state — set by LanguageContext, read by toBn.
//
// Default is "en" so SSR (which renders before any client-side context can
// run) always emits English digits. LanguageContext then calls
// setNumberLang("bn") on mount when the user's saved preference is Bangla,
// at which point a re-render flips digits to Bengali. Defaulting to "bn"
// caused a flash of Bengali numerals on hard reload even in English mode.
let currentLang: string = "en";

export function setNumberLang(lang: string) {
  currentLang = lang;
}

/**
 * Convert number to localized digits.
 * Returns Bengali digits when language is "bn", English otherwise.
 */
export function toBn(num: number | string): string {
  const str = String(num);
  if (currentLang !== "bn") return str;
  return str.replace(/[0-9]/g, (d) => bnDigits[parseInt(d)]);
}

/** Convert Bengali digits to English: "৫০০" → "500" */
export function toEn(str: string): string {
  return str.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
}

/** Parse a string that may contain Bengali or English digits to a number */
export function parseNum(str: string): number {
  const cleaned = toEn(str).replace(/[^0-9.]/g, "");
  return Number(cleaned) || 0;
}
