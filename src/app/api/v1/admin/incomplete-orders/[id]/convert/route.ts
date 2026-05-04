import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { sendOrderConfirmation, sendAdminOrderNotification } from "@/lib/email";
import { bumpVersion } from "@/lib/sync";
import { revalidateTag } from "next/cache";
import { buildHashedUserData, sendToFacebookCAPI, getClientIp } from "@/lib/fbcapi";
import { isValidBDPhone } from "@/lib/spamDetection";
import { getSettings } from "@/lib/settingsCache";

// POST /api/v1/admin/incomplete-orders/[id]/convert
//
// Turns a captured incomplete-order row into a real Order, mirroring the
// public /api/v1/orders POST flow but trusting the totals already stored
// on the row (they were computed at capture time with the same client-side
// pricing the customer saw). Skips the spam-scoring + guest-user upsert
// because the admin has already triaged the lead — those side effects are
// only needed for organic checkout traffic.
//
// Fires the Purchase event respecting fb_deferred_purchase:
//   defer ON  → store the eventData on order.trackingData. The status
//               route already fires it when admin flips status to
//               "confirmed", so the convert flow stays consistent with
//               normal checkout-deferred behavior.
//   defer OFF → fire CAPI immediately. No browser pixel because this is
//               an admin action — there is no end-user browser involved.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try { await requireStaff(); } catch (e) { return e as Response; }
  try {
    const { id } = await params;
    const idNum = Number(id);
    if (!idNum) return notFound("Invalid id");

    const incomplete = await prisma.incompleteOrder.findUnique({ where: { id: idNum } });
    if (!incomplete) return notFound("Incomplete order not found");
    if (incomplete.convertedAt) {
      return errorResponse("This incomplete order is already converted.", 409);
    }

    // Validate phone (may have changed shape since capture).
    if (!isValidBDPhone(incomplete.phone)) {
      return errorResponse("Stored phone is not a valid BD number.", 422);
    }

    // Parse the captured cart. Stored as a JSON string in the DB.
    type CartItem = {
      product_id?: number;
      variant_id?: number | null;
      variant_label?: string | null;
      name?: string;
      price?: number;
      quantity?: number;
    };
    let cart: CartItem[] = [];
    try {
      const parsed = JSON.parse(incomplete.cartItems);
      if (Array.isArray(parsed)) cart = parsed;
    } catch {
      return errorResponse("Stored cart could not be parsed.", 422);
    }
    if (cart.length === 0) return errorResponse("Captured cart is empty.", 422);

    // Validate every line-item has a product_id + quantity.
    for (const it of cart) {
      if (!it.product_id || !it.quantity || it.quantity < 1) {
        return errorResponse("Cart contains invalid line items.", 422);
      }
    }

    // ── Run the order in a transaction so stock decrements + version bumps
    // never half-apply. Same per-product aggregation pattern as the public
    // route so a cart with the same product in two variants doesn't trigger
    // the optimistic-lock CONFLICT path.
    const orderToken = randomBytes(16).toString("hex");
    // Order plus its items relation. We use a permissive type because the
    // Prisma `create` return narrows to "no includes" without a generic
    // arg, but the body really does include items via `include: { items }`.
    type OrderWithItems = {
      id: number;
      total: number;
      shippingCost: number;
      items: Array<{ id: number; productId: number | null; productName: string; quantity: number; price: number }>;
    };
    let createdOrder: OrderWithItems | null = null;

    const MAX_RETRIES = 3;
    let lastErr = "";
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await prisma.$transaction(async (tx: any) => {
          const productIds = cart.map((c) => c.product_id!);
          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
            include: { variants: true },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pMap = new Map<number, any>(products.map((p: any) => [p.id, p]));

          // Build verified items (server-side prices + stock check).
          const verifiedItems = cart.map((it) => {
            const prod = pMap.get(it.product_id!);
            if (!prod) throw new Error(`Product not found: ${it.product_id}`);
            let price = prod.price as number;
            let variantLabel: string | null = null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let stockSrc: any = prod;
            if (it.variant_id && prod.hasVariations) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const v = prod.variants?.find((v: any) => v.id === it.variant_id);
              if (!v) throw new Error(`Variant gone for ${prod.name}`);
              price = v.price;
              variantLabel = v.label;
              stockSrc = v;
            }
            if (!stockSrc.unlimitedStock && stockSrc.stock < it.quantity!) {
              const label = variantLabel ? `${prod.name} (${variantLabel})` : prod.name;
              throw new Error(`Out of stock: ${label} (have ${stockSrc.stock})`);
            }
            return {
              productId: it.product_id!,
              productName: prod.name,
              variantId: it.variant_id || null,
              variantLabel,
              price,
              quantity: it.quantity!,
            };
          });

          const subtotal = verifiedItems.reduce((s, i) => s + i.price * i.quantity, 0);
          const shipping = Math.max(0, Number(incomplete.shippingCost) || 0);
          const total = Math.max(0, subtotal + shipping);

          // Variant stock — aggregate by variantId so duplicate cart entries
          // don't trip the optimistic version check.
          const variantTotals = new Map<number, { qty: number; name: string }>();
          for (const v of verifiedItems) {
            if (!v.variantId) continue;
            const cur = variantTotals.get(v.variantId);
            variantTotals.set(v.variantId, {
              qty: (cur?.qty || 0) + v.quantity,
              name: v.productName,
            });
          }
          for (const [vid, { qty, name }] of variantTotals) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prod = [...pMap.values()].find((p: any) => p.variants?.some((v: any) => v.id === vid));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const variant = prod?.variants?.find((v: any) => v.id === vid);
            if (!variant) throw new Error(`Variant gone: ${name}`);
            if (variant.unlimitedStock) continue;
            const r = await tx.productVariant.updateMany({
              where: { id: vid, version: variant.version, stock: { gte: qty } },
              data: { stock: { decrement: qty }, version: { increment: 1 } },
            });
            if (r.count === 0) throw new Error(`CONFLICT:${name}`);
          }

          // Product stock + sold count — aggregate per productId.
          const productTotals = new Map<number, { varQty: number; bareQty: number }>();
          for (const v of verifiedItems) {
            const cur = productTotals.get(v.productId) || { varQty: 0, bareQty: 0 };
            if (v.variantId) cur.varQty += v.quantity; else cur.bareQty += v.quantity;
            productTotals.set(v.productId, cur);
          }
          for (const [pid, { varQty, bareQty }] of productTotals) {
            const prod = pMap.get(pid);
            if (!prod) continue;
            const totalQty = varQty + bareQty;
            const skipStock = prod.unlimitedStock || bareQty === 0;
            const r = await tx.product.updateMany({
              where: {
                id: pid,
                version: prod.version,
                ...(skipStock ? {} : { stock: { gte: bareQty } }),
              },
              data: {
                ...(skipStock ? {} : { stock: { decrement: bareQty } }),
                soldCount: { increment: totalQty },
                version: { increment: 1 },
              },
            });
            if (r.count === 0) throw new Error(`CONFLICT:${prod.name}`);
          }

          const newOrder = await tx.order.create({
            data: {
              userId: incomplete.userId || null,
              customerName: incomplete.name || "—",
              customerPhone: incomplete.phone,
              customerEmail: incomplete.email || null,
              customerAddress: incomplete.address || "—",
              city: incomplete.city || null,
              zipCode: incomplete.zipCode || null,
              subtotal,
              shippingCost: shipping,
              total,
              paymentMethod: "cod",
              orderToken,
              notes: (incomplete.notes ? incomplete.notes + " | " : "") + `Converted from incomplete #${incomplete.id}`,
              items: { create: verifiedItems },
            },
            include: { items: true },
          });

          // Mark the source incomplete-order row as converted in the same tx
          // so the dashboard view updates atomically with the new order.
          await tx.incompleteOrder.update({
            where: { id: incomplete.id },
            data: { convertedAt: new Date() },
          });

          return newOrder;
        }, { timeout: 10000 });
        createdOrder = result as unknown as OrderWithItems;
        break;
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lastErr = (e as any)?.message || "Order creation failed";
        if (lastErr.startsWith("CONFLICT:") && attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
          continue;
        }
        if (lastErr.startsWith("CONFLICT:")) {
          return errorResponse("Stock conflict — please retry.", 409);
        }
        return errorResponse(lastErr, 422);
      }
    }
    if (!createdOrder) return errorResponse("Server busy. Try again.", 503);

    // Bump caches so the orders list / dashboard widgets refresh.
    bumpVersion("orders");
    revalidateTag("products", "max");

    // ── Customer email confirmation (non-blocking) ──
    if (incomplete.email) {
      sendOrderConfirmation(incomplete.email, {
        customerName: incomplete.name || "—",
        orderId: createdOrder.id,
        total: Number(createdOrder.total),
        items: createdOrder.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          price: Number(i.price),
        })),
      });
    }

    // ── Admin notification email (non-blocking) ──
    sendAdminOrderNotification({
      customerName: incomplete.name || "—",
      orderId: createdOrder.id,
      total: Number(createdOrder.total),
      phone: incomplete.phone,
      address: incomplete.address || "—",
      city: incomplete.city || "",
      paymentMethod: "cod",
      shippingCost: Number(createdOrder.shippingCost),
      orderToken,
      items: createdOrder.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        price: Number(i.price),
      })),
    });

    // ── Facebook Purchase event (defer-aware, server-side only) ──
    // Builds the same eventData shape the public /api/v1/collect route would
    // build for an organic checkout. When defer is ON we store it on the
    // order and let the admin's "confirmed" status change fire it (same as
    // organic deferred). When defer is OFF we fire CAPI immediately.
    void (async () => {
      try {
        // Cached settings — same pattern as the status + collect routes.
        const settings = await getSettings(["fb_pixel_id", "fb_capi_access_token", "fb_test_event_code", "fb_deferred_purchase"]);
        const pixelId = settings.fb_pixel_id || "";
        const accessToken = settings.fb_capi_access_token || "";
        if (!pixelId || !accessToken || !createdOrder) return;
        const isDeferred = settings.fb_deferred_purchase === "true";

        const clientIp = getClientIp(request);
        const clientUa = request.headers.get("user-agent") || undefined;
        const nameParts = (incomplete.name || "").trim().split(/\s+/);
        const firstName = nameParts[0] || undefined;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;
        const hashedUser = buildHashedUserData({
          em: incomplete.email || undefined,
          ph: incomplete.phone,
          fn: firstName,
          ln: lastName,
          ct: incomplete.city || undefined,
          zp: incomplete.zipCode || undefined,
          country: "bd",
          external_id: incomplete.userId ? String(incomplete.userId) : `incomplete-${incomplete.id}`,
        }, clientIp, clientUa);

        const eventId = `convert-${createdOrder.id}-${Date.now()}`;
        const eventData: Record<string, unknown> = {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: "website",
          user_data: hashedUser,
          custom_data: {
            content_ids: createdOrder.items.map((i) => String(i.productId)),
            content_name: createdOrder.items.map((i) => i.productName).join(", "),
            content_type: "product",
            contents: createdOrder.items.map((i) => ({
              id: String(i.productId),
              quantity: i.quantity,
              item_price: Number(i.price),
            })),
            num_items: createdOrder.items.reduce((s, i) => s + i.quantity, 0),
            value: Number(createdOrder.total),
            currency: "BDT",
            order_id: String(createdOrder.id),
          },
        };

        if (isDeferred) {
          // Stash on the order — status route fires it on admin "confirmed".
          await prisma.order.update({
            where: { id: createdOrder.id },
            data: {
              trackingData: JSON.stringify({
                eventData,
                pixelId,
                testEventCode: settings.fb_test_event_code || null,
              }),
            },
          });
        } else {
          await sendToFacebookCAPI(pixelId, accessToken, eventData, settings.fb_test_event_code);
        }
      } catch (e) {
        console.error("[Convert] CAPI dispatch error:", e);
      }
    })();

    return jsonResponse({
      ok: true,
      data: {
        order_id: createdOrder.id,
        order_token: orderToken,
      },
    });
  } catch (e) {
    console.error("[IncompleteOrder] convert error:", e);
    return errorResponse("Failed to convert", 500);
  }
}
