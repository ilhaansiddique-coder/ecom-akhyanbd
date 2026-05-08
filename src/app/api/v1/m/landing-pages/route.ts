// Mobile-namespace re-export of the admin landing-pages endpoint. The Dart
// client at /api/v1/m/* expects this shape; reusing the admin handler
// keeps the auth/validation/bumpVersion logic in one place.
export { GET, POST } from "@/app/api/v1/admin/landing-pages/route";
