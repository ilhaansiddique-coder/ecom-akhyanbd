const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

// Global language state — set by LanguageContext, read by toBn
let currentLang: string = "bn";

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
