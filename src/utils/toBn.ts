const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBn(num: number | string): string {
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d)]);
}

/** Convert Bengali digits to English: "৫০০" → "500", "৳১,২৫০.৫০" → "1250.50" */
export function toEn(str: string): string {
  return str.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
}

/** Parse a string that may contain Bengali or English digits to a number */
export function parseNum(str: string): number {
  const cleaned = toEn(str).replace(/[^0-9.]/g, "");
  return Number(cleaned) || 0;
}
