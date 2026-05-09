// Mobile namespace re-export — the richer staff/admin dashboard payload used
// by the web dashboard already matches the metric set the Flutter home screen
// needs (combined status cards, courier-sent stats, daily orders, top
// products, low-stock alerts). Reusing it here keeps both admin clients on
// one source of truth instead of maintaining two drifting aggregations.
export { GET } from "@/app/api/v1/admin/dashboard/route";
