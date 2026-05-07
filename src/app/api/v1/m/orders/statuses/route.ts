/**
 * GET /api/v1/m/orders/statuses
 *
 * Returns the canonical list of order statuses the Flutter orders screen
 * uses for filter chips. Source of truth lives here so adding a new
 * status (e.g. "returned", "refunded") on the backend rolls out to the
 * app without a release.
 *
 * Response shape (matches contract in akhiyan_api.dart#OrdersApi.statuses):
 *   { "data": [ { "key": "pending", "label": "Pending" }, ... ] }
 *
 * Why a dedicated route file instead of a query-param branch on the
 * orders list route: Next.js App Router prefers exact static segments
 * over dynamic ones, so `statuses/route.ts` will catch this URL before
 * `[id]/route.ts` interprets "statuses" as an order id and crashes when
 * Number("statuses") becomes NaN downstream.
 */
import { jsonResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const STATUSES = [
  { key: "pending",    label: "Pending" },
  { key: "confirmed",  label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped",    label: "Shipped" },
  { key: "delivered",  label: "Delivered" },
  { key: "cancelled",  label: "Cancelled" },
  { key: "returned",   label: "Returned" },
  { key: "trashed",    label: "Trashed" },
];

export const GET = withStaff(async () => {
  return jsonResponse({ data: STATUSES });
});
