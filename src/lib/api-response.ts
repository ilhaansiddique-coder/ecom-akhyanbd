import { NextResponse } from "next/server";

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * JSON response with a Cache-Control header attached.
 *
 * Use on `/m/*` GET endpoints so the Flutter HTTP layer (and any proxy in
 * between) can serve repeat hits within the freshness window without
 * re-executing the Prisma query. Default scope is `private` because every
 * `/m/*` route runs through `withAdmin` and the response is therefore
 * per-user — set `scope: "public"` for shareable endpoints like /m/theme.
 *
 * `sMaxAge` is the freshness window (seconds). `swr` is how long stale
 * content can be served while a background refresh runs. Bumps from
 * `bumpVersion(channel)` are still the source-of-truth for "data changed"
 * — the cache window just bounds how stale the worst-case staleness gets.
 */
export function cachedJsonResponse(
  data: unknown,
  opts: { sMaxAge: number; swr?: number; scope?: "private" | "public"; status?: number } = { sMaxAge: 30 },
) {
  const { sMaxAge, swr = sMaxAge * 4, scope = "private", status = 200 } = opts;
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": `${scope}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    },
  });
}

export function errorResponse(message: string, status = 400, errors?: Record<string, string[]>) {
  return NextResponse.json({ message, ...(errors ? { errors } : {}) }, { status });
}

export function validationError(errors: Record<string, string[]>) {
  const firstMessage = Object.values(errors)[0]?.[0] || "Validation failed";
  return NextResponse.json({ message: firstMessage, errors }, { status: 422 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ message }, { status: 404 });
}

export function unauthorized(message = "Unauthenticated.") {
  return NextResponse.json({ message }, { status: 401 });
}

export function forbidden(message = "Forbidden.") {
  return NextResponse.json({ message }, { status: 403 });
}
