/**
 * Spam Detection — Risk Scoring Engine
 * Pure functions: no DB, no side effects. Import and use anywhere.
 */

export interface BehavioralSignals {
  fillDurationMs?: number | null;
  mouseMovements?: number | null;
  pasteDetected?: boolean;
  honeypotTriggered?: boolean;
  tabSwitches?: number | null;
}

export interface FingerprintSignals {
  canvasHash?: string | null;
  webglHash?: string | null;
  audioHash?: string | null;
  screenResolution?: string | null;
  platform?: string | null;
  timezone?: string | null;
  languages?: string | null;
  cpuCores?: number | null;
  memoryGb?: number | null;
  touchPoints?: number | null;
}

export interface OrderPatternSignals {
  phoneValid?: boolean;
  addressLength?: number;
  nameLength?: number;
  recentOrdersFromFp?: number; // orders in last 1h from same fp
}

export interface RiskResult {
  score: number;
  flags: string[];
}

/**
 * Calculate risk score (0-100) from all available signals.
 */
export function calculateRiskScore(
  behavioral: BehavioralSignals,
  fingerprint: FingerprintSignals,
  orderPattern: OrderPatternSignals,
): RiskResult {
  let score = 0;
  const flags: string[] = [];

  // ── Behavioral ──
  if (behavioral.honeypotTriggered) {
    score += 60;
    flags.push("honeypot");
  }

  if (behavioral.fillDurationMs != null) {
    if (behavioral.fillDurationMs < 1500) {
      score += 40;
      flags.push("very_fast_fill");
    } else if (behavioral.fillDurationMs < 3000) {
      score += 25;
      flags.push("fast_fill");
    } else if (behavioral.fillDurationMs < 5000) {
      score += 10;
      flags.push("quick_fill");
    }
  }

  if (behavioral.mouseMovements != null && behavioral.mouseMovements < 3) {
    score += 15;
    flags.push("no_mouse");
  }

  if (behavioral.pasteDetected) {
    score += 10;
    flags.push("paste");
  }

  // ── Fingerprint quality ──
  if (!fingerprint.canvasHash && !fingerprint.webglHash && !fingerprint.audioHash) {
    score += 30;
    flags.push("no_fingerprint");
  } else {
    if (!fingerprint.canvasHash) { score += 5; }
    if (!fingerprint.webglHash) { score += 5; }
  }

  // ── Order pattern ──
  if (orderPattern.phoneValid === false) {
    score += 20;
    flags.push("invalid_phone");
  }

  if (orderPattern.addressLength != null && orderPattern.addressLength < 5) {
    score += 35;
    flags.push("short_address");
  }

  if (orderPattern.nameLength != null && orderPattern.nameLength < 2) {
    score += 25;
    flags.push("short_name");
  }

  if (orderPattern.recentOrdersFromFp != null) {
    if (orderPattern.recentOrdersFromFp >= 5) {
      score += 40;
      flags.push("spam_velocity");
    } else if (orderPattern.recentOrdersFromFp >= 3) {
      score += 25;
      flags.push("high_velocity");
    }
  }

  return { score: Math.min(score, 100), flags };
}

/**
 * Normalize a BD phone number into canonical 01XXXXXXXXX form. Strips
 * whitespace/dashes/plus, drops the +880 prefix. Returns the digits-only
 * normalized string regardless of validity (caller validates separately
 * with isValidBDPhone). Centralized here so order-create + incomplete-order
 * upsert + courier dispatch all hash the same canonical phone — without
 * this, "01700-123456" and "01700123456" wrote to different rows and the
 * incomplete-orders page never marked them as converted.
 */
export function normalizePhone(phone: string): string {
  const clean = String(phone || "").replace(/[\s\-+()]/g, "");
  return clean.startsWith("880") ? "0" + clean.slice(3) : clean;
}

/**
 * Validate BD phone number — must be 01XXXXXXXXX (11 digits starting with 01)
 */
export function isValidBDPhone(phone: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizePhone(phone));
}

/**
 * Detect keyboard-smash / gibberish names
 */
export function isGibberishName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2) return true;
  // Check for repeated chars like "aaaa" or "asdf"
  if (/^(.)\1{3,}$/.test(trimmed)) return true;
  // Check for common test patterns
  if (/^(test|asdf|qwer|zxcv|fake|abc|xyz|aaa|bbb|zzz)/i.test(trimmed)) return true;
  return false;
}

/**
 * Generate risk flag labels for display
 */
export const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  honeypot: { label: "🍯 Honeypot", color: "bg-red-100 text-red-800" },
  very_fast_fill: { label: "⚡ Very Fast", color: "bg-red-100 text-red-800" },
  fast_fill: { label: "⚡ Fast Fill", color: "bg-orange-100 text-orange-800" },
  quick_fill: { label: "⏱️ Quick", color: "bg-yellow-100 text-yellow-800" },
  no_mouse: { label: "🖱️ No Mouse", color: "bg-orange-100 text-orange-800" },
  paste: { label: "📋 Pasted", color: "bg-yellow-100 text-yellow-800" },
  no_fingerprint: { label: "👻 No FP", color: "bg-red-100 text-red-800" },
  invalid_phone: { label: "📱 Bad Phone", color: "bg-orange-100 text-orange-800" },
  short_address: { label: "📍 Short Addr", color: "bg-red-100 text-red-800" },
  short_name: { label: "👤 Short Name", color: "bg-orange-100 text-orange-800" },
  spam_velocity: { label: "🔥 Spam Flood", color: "bg-red-100 text-red-800" },
  high_velocity: { label: "📈 High Volume", color: "bg-orange-100 text-orange-800" },
};
