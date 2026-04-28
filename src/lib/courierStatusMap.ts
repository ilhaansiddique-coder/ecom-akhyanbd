/**
 * Map a raw courier delivery status string to one of our internal Order
 * statuses. Used by the check-status routes for Steadfast + Pathao so that
 * when a parcel is marked delivered or returned/cancelled by the courier,
 * the matching Order row flips automatically without requiring the admin
 * to also update status manually.
 *
 * Returns `null` when the courier status doesn't warrant an order-status
 * change (e.g. "in_transit", "picked", "pending"). Caller should NOT
 * touch order.status in that case.
 *
 * Returns "delivered" only on confirmed delivery.
 * Returns "cancelled" on any return/refused/cancel-style status.
 *
 * Both Steadfast and Pathao return arbitrary casing/snake_case strings
 * (e.g. "delivered", "Delivered", "Returned", "paid_return", "Customer_Refused").
 * We normalise to lower + underscore-collapsed before matching keywords so
 * a single helper covers both providers and any future variants.
 */
export type DerivedOrderStatus = "shipped" | "delivered" | "cancelled" | null;

export function mapCourierStatusToOrderStatus(raw: string | null | undefined): DerivedOrderStatus {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/[\s-]+/g, "_");

  // Cancellation-style first — "paid_return" contains "return", and we want
  // it routed to cancelled even though "paid" might suggest otherwise.
  // Steadfast: "cancelled", "partial_delivered" (we treat as cancelled?
  // No — partial means SOME delivered, leave it alone for admin to decide).
  // Pathao: "Returned", "Cancelled", "Customer_Refused", "Pickup_Cancelled".
  if (s.includes("return")) return "cancelled";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("refused")) return "cancelled";

  // Delivery — must be the final delivered state, NOT
  // "delivered_approval_pending" (Steadfast intermediate) which still
  // has "delivered" in the name. Match strict equality on the keyword
  // segment OR the exact "delivered" string.
  if (s === "delivered") return "delivered";

  // Courier-sent states — parcel is with the courier, awaiting/in pickup.
  // Steadfast: "pending", "in_review".
  // Pathao: "Pending", "Pickup_Requested", "At_Warehouse".
  // Mapping these to "shipped" keeps the order status in sync with the
  // courier dispatch event, which is used as the anchor for daily sales
  // analytics (courierSentAt column).
  if (s === "pending") return "shipped";
  if (s.includes("pickup")) return "shipped";
  if (s.includes("warehouse")) return "shipped";
  if (s.includes("in_review")) return "shipped";

  return null;
}
