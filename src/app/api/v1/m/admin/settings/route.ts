// Mobile re-export. The admin handler already masks sensitive secret keys
// with "••••••••" on GET and ignores those masked values on PUT, so the
// mobile app can fetch + save partial settings safely without ever seeing
// the real SMTP password / Pathao secret.
export { GET, PUT } from "@/app/api/v1/admin/settings/route";
