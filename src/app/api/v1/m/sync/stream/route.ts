// Mobile namespace re-export — see /m/auth/login/route.ts for rationale.
// SSE feed for live cache invalidation in the Flutter admin app.
//
// `runtime` and `dynamic` must be declared inline (not re-exported) — Next.js
// reads them statically at compile time and refuses to follow re-export
// chains. The handler itself is delegated to the canonical implementation.
export { GET } from "@/app/api/v1/sync/stream/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
