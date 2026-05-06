// Mobile namespace re-export — /api/v1/m/auth/login is identical to
// /api/v1/auth/login. Centralising the actual handler in one file means
// the JWT/cookie/role contract stays in sync between Next.js dashboard
// callers and Flutter clients without duplicate logic.
export { POST } from "@/app/api/v1/auth/login/route";
