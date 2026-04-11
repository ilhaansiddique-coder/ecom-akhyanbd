/**
 * Convert camelCase keys to snake_case and handle SQLite JSON strings.
 * This ensures API responses match the Laravel JSON format
 * that the frontend expects (e.g. category_id, created_at).
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function isDecimal(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    "toNumber" in (value as Record<string, unknown>) &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  );
}

// Fields stored as JSON strings in SQLite that should be parsed back to arrays/objects
const JSON_STRING_FIELDS = new Set(["images", "cities"]);

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (isDecimal(obj)) return (obj as { toNumber: () => number }).toNumber();

  if (obj instanceof Date) return obj.toISOString();

  if (Array.isArray(obj)) return obj.map(serialize);

  if (typeof obj === "bigint") return Number(obj);

  if (typeof obj === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip Prisma internal fields
      if (key.startsWith("_")) continue;
      const snakeKey = camelToSnake(key);
      // Parse JSON string fields back to arrays/objects for API output
      if (JSON_STRING_FIELDS.has(key) && typeof value === "string") {
        result[snakeKey] = tryParseJson(value);
      } else {
        result[snakeKey] = serialize(value);
      }
    }
    return result;
  }

  return obj;
}
