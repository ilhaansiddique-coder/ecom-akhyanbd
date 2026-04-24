import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

// Public endpoint: capture in-progress checkout state.
// Upserted by phone (BD 11-digit). Throttled implicitly because we only call
// it on field blur from the checkout form, and the same phone overwrites the
// previous row instead of stacking. Skip if user has already placed an order
// with this phone today (those are real orders, not incomplete).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Invalid body", 400);

    const phoneRaw = String(body.phone || "").replace(/\D/g, "");
    if (!/^01[3-9]\d{8}$/.test(phoneRaw)) {
      // Silently accept — don't error on partial input. Just skip persistence.
      return jsonResponse({ skipped: true });
    }

    const cartItems = Array.isArray(body.cart_items) ? body.cart_items : [];
    if (cartItems.length === 0) return jsonResponse({ skipped: true });

    // Don't capture if a real order with this phone exists in the last 5 minutes —
    // means user already converted.
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentOrder = await prisma.order.findFirst({
      where: { customerPhone: phoneRaw, createdAt: { gte: fiveMinAgo } },
      select: { id: true },
    });
    if (recentOrder) return jsonResponse({ skipped: true, reason: "already_ordered" });

    const user = await getSessionUser().catch(() => null);

    const data = {
      phone: phoneRaw,
      name: body.name ? String(body.name).slice(0, 200) : null,
      email: body.email ? String(body.email).slice(0, 200) : null,
      address: body.address ? String(body.address).slice(0, 1000) : null,
      city: body.city ? String(body.city).slice(0, 200) : null,
      zipCode: body.zip_code ? String(body.zip_code).slice(0, 20) : null,
      notes: body.notes ? String(body.notes).slice(0, 1000) : null,
      cartItems: JSON.stringify(cartItems).slice(0, 50000),
      subtotal: Number(body.subtotal) || 0,
      shippingCost: Number(body.shipping_cost) || 0,
      total: Number(body.total) || 0,
      userId: user?.id || null,
      source: body.source ? String(body.source).slice(0, 64) : "checkout",
    };

    await prisma.incompleteOrder.upsert({
      where: { phone: phoneRaw },
      // Re-open the row if user comes back after we marked it converted
      // (means they're starting another order — track again).
      update: { ...data, convertedAt: null },
      create: data,
    });

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("[IncompleteOrder] capture error:", e);
    return jsonResponse({ ok: false }, 200); // never break checkout flow
  }
}
