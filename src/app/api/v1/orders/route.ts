import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { paginatedResponse } from "@/lib/paginate";
import { createOrderSchema } from "@/lib/validation";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";
import { sendOrderConfirmation, sendAdminOrderNotification } from "@/lib/email";
import { bumpVersion } from "@/lib/sync";
import { revalidateTag } from "next/cache";
import { randomBytes } from "crypto";
import { calculateRiskScore, isValidBDPhone, normalizePhone } from "@/lib/spamDetection";
import { getClientIp } from "@/lib/fbcapi";
import { isCustomerBlocked } from "@/lib/spamGuard";

// GET - List user's orders (auth required)
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return jsonResponse({ message: "Unauthenticated." }, 401);

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const perPage = 10;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.order.count({ where: { userId: user.id } }),
  ]);

  return jsonResponse(paginatedResponse(orders, { page, perPage, total }));
}

// POST - Create order (guest checkout OK)
export async function POST(request: NextRequest) {
  // Body parse: malformed JSON should return a clean 400, not crash to 500.
  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] = [issue.message];
    return validationError(errors);
  }

  const data = parsed.data;

  // Language for server-side error messages. Prefer explicit body field, else
  // sniff Accept-Language. Default to Bangla (primary audience).
  const acceptLang = request.headers.get("accept-language") || "";
  const lang: "en" | "bn" = data.lang
    ? data.lang
    : acceptLang.toLowerCase().startsWith("en") ? "en" : "bn";
  const t = (en: string, bn: string) => (lang === "en" ? en : bn);

  // ── Required-field hardening (server-side, schema is permissive for LP) ──
  // Phone: must be a valid BD 11-digit number after normalization.
  const rawPhone = (data.customer_phone || data.phone || "").trim();
  if (!rawPhone) {
    return errorResponse(t("Phone number is required.", "ফোন নম্বর আবশ্যক।"), 422);
  }
  if (!isValidBDPhone(rawPhone)) {
    return errorResponse(
      t("Please enter a valid Bangladeshi phone number (01XXXXXXXXX).",
        "সঠিক বাংলাদেশী ফোন নম্বর দিন (01XXXXXXXXX)।"),
      422,
    );
  }
  // ── Block-list gate ──────────────────────────────────────────────────────
  // Reject early if the incoming customer is on any blocklist (phone / IP /
  // device fingerprint). Vague generic error so the attacker can't tell
  // which dimension matched. Runs BEFORE address validation so banned
  // customers don't even get descriptive form-validation feedback.
  {
    const fpHashEarly = request.cookies.get("fpHash")?.value || "";
    const ipEarly = getClientIp(request);
    const block = await isCustomerBlocked({ phone: rawPhone, ip: ipEarly, fpHash: fpHashEarly });
    if (block.blocked) {
      console.warn("[orders] blocked", { matched: block.matched, reason: block.reason, phone: normalizePhone(rawPhone), ip: ipEarly });
      return errorResponse(
        t("We can't process this order right now. Please contact support.",
          "এখন এই অর্ডারটি প্রক্রিয়া করা যাচ্ছে না। অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।"),
        403,
      );
    }
  }

  // Address: must be at least 5 chars to avoid blank/garbage entries.
  const rawAddress = (data.customer_address || data.address || "").trim();
  if (rawAddress.length < 5) {
    return errorResponse(
      t("Please enter a complete delivery address.", "সম্পূর্ণ ডেলিভারি ঠিকানা দিন।"),
      422,
    );
  }

  const user = await getSessionUser();

  // Detect landing-page submissions so we don't override their custom
  // shipping cost with the storefront zone lookup. LP client sets
  // notes = "Landing page: <slug>" — this is the only marker we have.
  const isLandingPageOrder = (data.notes || "").startsWith("Landing page:");

  // Create order with optimistic locking + retry logic for concurrent purchases
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let productMap: Map<number, any>;
  let order: any;

  const MAX_RETRIES = 3;
  let lastError = "";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await prisma.$transaction(async (tx: any) => {
        // 1. Fetch products + variants for optimistic locking
        const productIds = data.items.map((i) => i.product_id);
        // Only consider ACTIVE + non-deleted products. Anything missing
        // from this set is treated as a stale cart line and silently
        // dropped below — the cart sync should normally have pruned them
        // already, but checkout shouldn't fail if a race slipped one
        // through (e.g. admin disabled the product mid-session).
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, isActive: true, deletedAt: null },
          include: { variants: true },
        });
        const pMap = new Map<number, any>(products.map((p: any) => [p.id, p]));

        // 2. Validate stock and build server-side price items (variant-aware).
        //    Stale references (missing product OR missing variant) are
        //    silently dropped — see comment above. We throw only when
        //    EVERY line is stale or stock is insufficient.
        const verifiedItems = data.items
          .map((item) => {
            const product = pMap.get(item.product_id);
            if (!product) return null; // stale → drop

            const variantId = (item as any).variant_id;
            let price = product.price as number;
            let variantLabel: string | null = null;
            let stockSource = product;

            // HARD GATE: variable products MUST have a variant selected.
            // Without this check, customers whose cart was populated before
            // the product was converted to variable (or via a buggy add-to-cart
            // path) ended up placing orders with variantId=null + parent
            // price (often 0). They'd write the size in `notes` as a workaround
            // and we'd ship the wrong size or the order wouldn't process.
            // Now we refuse the order outright with a clear message so the
            // customer goes back and picks a variant.
            if (product.hasVariations && (product.variants?.length || 0) > 0) {
              if (!variantId) {
                throw new Error(
                  lang === "en"
                    ? `Please select a size/option for "${product.name}" before placing the order.`
                    : `অর্ডার দেওয়ার আগে "${product.name}" এর জন্য সাইজ/অপশন নির্বাচন করুন।`
                );
              }
              const variant = product.variants?.find((v: any) => v.id === variantId);
              if (!variant) {
                throw new Error(
                  lang === "en"
                    ? `The selected option for "${product.name}" is no longer available. Please refresh and pick another.`
                    : `"${product.name}" এর নির্বাচিত অপশনটি আর পাওয়া যাচ্ছে না। রিফ্রেশ করে অন্যটি নির্বাচন করুন।`
                );
              }
              price = variant.price;
              variantLabel = variant.label;
              stockSource = variant;
            }

            if (!stockSource.unlimitedStock && stockSource.stock < item.quantity) {
              const label = variantLabel ? `${product.name} (${variantLabel})` : product.name;
              throw new Error(
                lang === "en"
                  ? `Not enough stock for ${label}. Available: ${stockSource.stock}`
                  : `${label} এর পর্যাপ্ত স্টক নেই। বর্তমান স্টক: ${stockSource.stock}`
              );
            }

            return {
              productId: item.product_id,
              productName: product.name,
              variantId: variantId || null,
              variantLabel,
              price,
              quantity: item.quantity,
            };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null);

        // If every line in the cart pointed to a stale product, refuse the
        // order with a clean message — better than silently creating an
        // empty order.
        if (verifiedItems.length === 0) {
          throw new Error(
            lang === "en"
              ? "Your cart contains no available products. Please refresh and try again."
              : "আপনার কার্টে কোনো পণ্য আর উপলভ্য নেই। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।"
          );
        }

        // 3. Recalculate totals server-side
        const serverSubtotal = verifiedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

        // ── Shipping: derive from ShippingZone by city to prevent client-side
        // manipulation. LP submissions keep their client-supplied value because
        // landing pages run their own per-page shipping rules that the zone
        // table doesn't know about. If the city doesn't match any zone (or no
        // city given), fall back to the client value as a last resort — better
        // to ship at customer's chosen rate than to fail the order. We still
        // floor at 0 so a negative value can never reduce the total.
        let serverShipping: number;
        if (isLandingPageOrder) {
          serverShipping = Math.max(0, Number(data.shipping_cost) || 0);
        } else {
          const cityRaw = (data.city || "").trim().toLowerCase();
          let zoneRate: number | null = null;
          if (cityRaw) {
            const zones = await tx.shippingZone.findMany({ where: { isActive: true } });
            for (const zone of zones) {
              try {
                const cities = JSON.parse(zone.cities) as string[];
                if (cities.some((c) => c.toLowerCase() === cityRaw)) {
                  zoneRate = Number(zone.rate);
                  break;
                }
              } catch {
                // Zone with malformed cities JSON — skip rather than crash.
              }
            }
          }
          serverShipping = zoneRate !== null
            ? zoneRate
            : Math.max(0, Number(data.shipping_cost) || 0);
        }

        // ── Coupon: re-validate server-side. Client-sent `discount` is never
        // trusted. If a `coupon_code` is given we look up the row, run all
        // gates (active, date window, max-uses, min-order), and recompute the
        // discount. If invalid, fail with 422 so the customer sees the same
        // total they'd see if they re-applied — no silent under-charge.
        let serverDiscount = 0;
        const couponCode = (data.coupon_code || "").trim();
        if (couponCode) {
          const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
          if (!coupon) {
            throw new Error(t("Coupon not found.", "কুপন পাওয়া যায়নি।"));
          }
          if (!coupon.isActive) {
            throw new Error(t("Coupon is inactive.", "কুপন নিষ্ক্রিয়।"));
          }
          const now = new Date();
          if (coupon.startsAt && now < coupon.startsAt) {
            throw new Error(t("Coupon hasn't started yet.", "কুপন এখনো শুরু হয়নি।"));
          }
          if (coupon.expiresAt && now > coupon.expiresAt) {
            throw new Error(t("Coupon has expired.", "কুপনের মেয়াদ শেষ।"));
          }
          if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            throw new Error(t("Coupon usage limit reached.", "কুপন ব্যবহারের সীমা শেষ।"));
          }
          if (serverSubtotal < Number(coupon.minOrderAmount)) {
            throw new Error(
              t(
                `Minimum order ৳${coupon.minOrderAmount} required for this coupon.`,
                `এই কুপনের জন্য সর্বনিম্ন অর্ডার ৳${coupon.minOrderAmount} হতে হবে।`,
              ),
            );
          }
          if (coupon.type === "percentage") {
            serverDiscount = (serverSubtotal * Number(coupon.value)) / 100;
          } else {
            serverDiscount = Number(coupon.value);
          }
          // Cap at subtotal so total can never go below shipping.
          serverDiscount = Math.min(serverDiscount, serverSubtotal);
          // Bump usage counter atomically inside the same tx.
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }

        const serverTotal = Math.max(0, serverSubtotal + serverShipping - serverDiscount);

        // 4. Update stock with optimistic locking
        //
        // IMPORTANT: a cart can contain the same productId multiple times
        // (different variants — e.g. T-shirt size M + size L). We must touch
        // each product row exactly once, otherwise the second pass's
        // `version: prod.version` check sees the row already bumped by the
        // first pass and updateMany returns count=0 → spurious CONFLICT.
        // Variant rows are still updated per-variantId (those are unique).

        // Variant-stock writes — keyed by variantId, no aggregation needed
        // beyond summing quantities for the same variantId (defensive; cart
        // dedupes already but be safe).
        const variantTotals = new Map<number, { qty: number; prodName: string }>();
        for (const vItem of verifiedItems) {
          if (!vItem.variantId) continue;
          const prod = pMap.get(vItem.productId);
          if (!prod?.hasVariations) continue;
          const cur = variantTotals.get(vItem.variantId);
          variantTotals.set(vItem.variantId, {
            qty: (cur?.qty || 0) + vItem.quantity,
            prodName: prod.name,
          });
        }
        for (const [variantId, { qty, prodName }] of variantTotals) {
          const prod = [...pMap.values()].find((p: any) => p.variants?.some((v: any) => v.id === variantId));
          const variant = prod?.variants?.find((v: any) => v.id === variantId);
          if (!variant) throw new Error(`Variant gone: ${prodName}`);
          if (variant.unlimitedStock) continue;
          const vResult = await tx.productVariant.updateMany({
            where: { id: variantId, version: variant.version, stock: { gte: qty } },
            data: { stock: { decrement: qty }, version: { increment: 1 } },
          });
          if (vResult.count === 0) throw new Error(`CONFLICT:${prodName}`);
        }

        // Aggregate per-product totals. `varQty` = qty that came from variant
        // line-items (skips product.stock decrement). `bareQty` = qty for
        // simple-product line-items (decrements product.stock).
        const productTotals = new Map<number, { varQty: number; bareQty: number }>();
        for (const vItem of verifiedItems) {
          const cur = productTotals.get(vItem.productId) || { varQty: 0, bareQty: 0 };
          if (vItem.variantId) cur.varQty += vItem.quantity;
          else cur.bareQty += vItem.quantity;
          productTotals.set(vItem.productId, cur);
        }
        for (const [productId, { varQty, bareQty }] of productTotals) {
          const prod = pMap.get(productId);
          if (!prod) continue;
          const totalQty = varQty + bareQty;
          // Skip product.stock decrement if product is unlimited OR every
          // line-item for this product was variant-keyed (variant rows
          // already handled the stock).
          const skipProductStock = prod.unlimitedStock || bareQty === 0;
          const updateResult = await tx.product.updateMany({
            where: {
              id: productId,
              version: prod.version,
              ...(skipProductStock ? {} : { stock: { gte: bareQty } }),
            },
            data: {
              ...(skipProductStock ? {} : { stock: { decrement: bareQty } }),
              soldCount: { increment: totalQty },
              version: { increment: 1 },
            },
          });
          if (updateResult.count === 0) throw new Error(`CONFLICT:${prod.name}`);
        }

        // 5. Create order with server-verified prices
        const newOrder = await tx.order.create({
          data: {
            userId: user?.id || null,
            customerName: data.customer_name,
            customerPhone: rawPhone,
            customerEmail: data.customer_email || data.email || null,
            customerAddress: rawAddress,
            city: data.city,
            zipCode: data.zip_code || null,
            subtotal: serverSubtotal,
            shippingCost: serverShipping,
            total: serverTotal,
            paymentMethod: data.payment_method,
            transactionId: data.transaction_id || null,
            orderToken: randomBytes(16).toString("hex"),
            notes: data.notes || null,
            items: {
              create: verifiedItems,
            },
          },
          include: { items: true },
        });

        return { order: newOrder, productMap: pMap };
      }, { timeout: 10000 }); // 10s transaction timeout

      order = result.order;
      productMap = result.productMap;
      break; // Success — exit retry loop

    } catch (err: any) {
      lastError = err?.message || t("Failed to create order.", "অর্ডার তৈরি করতে সমস্যা হয়েছে");

      // If it's a conflict (version mismatch), retry
      if (lastError.startsWith("CONFLICT:") && attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 50 * (attempt + 1))); // Backoff: 50ms, 100ms, 150ms
        continue;
      }

      // Stock / coupon / shipping / address-not-found — don't retry, surface
      // the message as-is so the customer sees the actual reason. Strip the
      // internal "CONFLICT:" prefix on the final attempt so the customer
      // doesn't see jargon.
      if (lastError.startsWith("CONFLICT:")) {
        const name = lastError.slice(9);
        return errorResponse(
          t(`Stock conflict for ${name}. Please try again.`, `${name} এর জন্য স্টক দ্বন্দ্ব। আবার চেষ্টা করুন।`),
          409,
        );
      }
      return errorResponse(lastError, 422);
    }
  }

  if (!order) {
    return errorResponse(t("Server busy. Please try again.", "সার্ভার ব্যস্ত। আবার চেষ্টা করুন।"), 503);
  }

  // Use the normalized values resolved at the top of the handler so downstream
  // consumers (address save, guest user create, FB CAPI, spam scoring) all see
  // the same trimmed/validated phone + address that was stored on the order.
  // Always store the canonical 01XXXXXXXXX form. Incomplete-orders + courier
  // both key off this exact format; storing user-typed "+880-1700-123456"
  // would silently break the convert-on-place flow.
  const customerPhone = normalizePhone(rawPhone);
  const customerAddress = rawAddress;
  const customerCity = data.city || "";
  const customerZip = data.zip_code || null;
  const customerName = data.customer_name;

  // Save / update address for logged-in users (non-blocking)
  if (user && customerAddress) {
    prisma.address.findFirst({ where: { userId: user.id, isDefault: true } }).then(async (existing) => {
      if (existing) {
        await prisma.address.update({
          where: { id: existing.id },
          data: { name: customerName, phone: customerPhone, address: customerAddress, city: customerCity, zipCode: customerZip },
        });
      } else {
        await prisma.address.create({
          data: { userId: user.id, label: "Default", name: customerName, phone: customerPhone, address: customerAddress, city: customerCity, zipCode: customerZip, isDefault: true },
        });
      }
    }).catch(() => {});
  }

  // Save guest customer info (non-blocking) — phone is the primary identifier.
  // Email is optional; we never inject a dummy `@guest.local` because that
  // would (a) pollute the User table with fake data and (b) leak into any
  // future tracking/email flow that reads user.email. Phone-only users still
  // get a row so the merchant can see them in customers list; they just
  // can't log in via email until they set one through password-reset.
  if (customerPhone && !user) {
    prisma.user.findFirst({ where: { phone: customerPhone } }).then(async (existing) => {
      if (!existing) {
        const bcrypt = await import("bcryptjs");
        // Random password — guest must use "forgot password" to set their own
        const randomPass = randomBytes(16).toString("hex");
        const customerEmail = (data.customer_email || data.email || "").trim();
        // User.email is required + unique. Skip user creation when guest didn't
        // supply one — phone-only guests are tracked via Order.customerPhone.
        if (customerEmail) {
          await prisma.user.create({
            data: {
              fullName: customerName,
              email: customerEmail,
              passwordHash: await bcrypt.hash(randomPass, 10),
              phone: customerPhone,
              address: customerAddress || null,
              role: "customer",
            },
          }).catch(() => {}); // Silently fail on unique-email collision
        }
      } else {
        // Update existing guest's address + name if they placed another order.
        // Backfill email if previously null and they supplied one this time.
        const newEmail = (data.customer_email || data.email || "").trim();
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            fullName: customerName,
            address: customerAddress || existing.address,
            ...(newEmail && !existing.email ? { email: newEmail } : {}),
          },
        }).catch(() => {});
      }
    }).catch(() => {});
  }

  // Build verified items from order (server-side prices, not client)
  const orderItems = (order.items || []).map((i: any) => ({
    productName: i.productName || i.product_name || "",
    quantity: i.quantity,
    price: i.price,
  }));

  // Send customer confirmation email (non-blocking, server-verified prices)
  const orderEmail = data.customer_email || data.email;
  if (orderEmail) {
    sendOrderConfirmation(orderEmail, {
      customerName: data.customer_name,
      orderId: order.id,
      total: order.total,
      items: orderItems,
    });
  }

  // Send admin notification email (non-blocking, server-verified prices)
  sendAdminOrderNotification({
    customerName: data.customer_name,
    orderId: order.id,
    total: order.total,
    phone: rawPhone,
    address: rawAddress,
    city: data.city || "",
    paymentMethod: data.payment_method,
    shippingCost: order.shippingCost || 0,
    orderToken: (order as any).orderToken || undefined,
    items: orderItems,
  });

  bumpVersion("orders");
  // Bust the dashboard products cache so live sales counts refresh immediately
  revalidateTag("products", "max");

  // Mark any in-progress incomplete-order row for this phone as converted.
  // Non-blocking; never fail the order on this.
  if (customerPhone) {
    prisma.incompleteOrder.updateMany({
      where: { phone: customerPhone, convertedAt: null },
      data: { convertedAt: new Date() },
    }).catch(() => {});
  }

  // ── Spam detection: attach fingerprint + risk score (non-blocking) ──
  const fpHash = request.cookies.get("fpHash")?.value;
  const fpBehavioral = body.fp_behavioral;
  const clientIp = getClientIp(request);

  (async () => {
    try {
      // Calculate risk score
      const behavioral = fpBehavioral || {};
      const { score, flags } = calculateRiskScore(behavioral, {}, {
        phoneValid: isValidBDPhone(customerPhone),
        addressLength: customerAddress.trim().length,
        nameLength: customerName.trim().length,
        recentOrdersFromFp: 0,
      });

      // Check order velocity from this fingerprint
      let finalScore = score;
      let finalFlags = flags;
      let deviceId: number | null = null;

      if (fpHash) {
        const device = await prisma.deviceFingerprint.findUnique({
          where: { fpHash },
          select: { id: true },
        });
        deviceId = device?.id || null;

        if (deviceId) {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const recentCount = await prisma.orderFingerprint.count({
            where: { deviceFingerprintId: deviceId, createdAt: { gte: oneHourAgo } },
          });
          const rescored = calculateRiskScore(behavioral, {}, {
            phoneValid: isValidBDPhone(customerPhone),
            addressLength: customerAddress.trim().length,
            nameLength: customerName.trim().length,
            recentOrdersFromFp: recentCount,
          });
          finalScore = rescored.score;
          finalFlags = rescored.flags;
        }
      }

      // Update order with risk score + fpHash
      await prisma.order.update({
        where: { id: order.id },
        data: { riskScore: finalScore, fpHash: fpHash || null },
      });

      // Create OrderFingerprint record
      await prisma.orderFingerprint.create({
        data: {
          orderId: order.id,
          fpHash: fpHash || null,
          ipAddress: clientIp,
          deviceFingerprintId: deviceId,
          fillDurationMs: behavioral.fillDurationMs || null,
          mouseMovements: behavioral.mouseMovements || null,
          pasteDetected: behavioral.pasteDetected || false,
          honeypotTriggered: behavioral.honeypotTriggered || false,
          tabSwitches: behavioral.tabSwitches || null,
          riskScore: finalScore,
          riskFlags: finalFlags.join(","),
        },
      });

      // Update device fingerprint risk score if exists
      if (fpHash && deviceId) {
        await prisma.deviceFingerprint.update({
          where: { fpHash },
          data: {
            riskScore: finalScore,
            seenCount: { increment: 1 },
            lastSeenAt: new Date(),
            lastIp: clientIp,
          },
        });
      }
    } catch (e) {
      console.error("[Spam] Fingerprint attach error:", e);
    }
  })();

  // ── Resolve real city via Pathao address parser ──
  // FIRE-AND-FORGET so the checkout response isn't blocked by Pathao's
  // latency. The parsed district (e.g. "Dhaka", "Chittagong") gets written
  // to the order row a few seconds later. /api/v1/collect (which fires FB
  // CAPI via sendBeacon AFTER the redirect) reads order.parsedCity and
  // overrides the user_data.ct field so Facebook gets a real city instead
  // of the shipping-zone label.
  //
  // Why this design instead of awaiting the parse:
  //   - Zero added latency on checkout response
  //   - sendBeacon /collect call happens 100-300ms after this returns; the
  //     parse usually finishes in 500-2000ms, well before the deferred
  //     Purchase fires (defer ON case) and even fast enough for the
  //     immediate fire to catch most orders
  //   - Worst case: parsedCity is still null when /collect runs → CAPI
  //     uses the form city (today's behaviour) → no regression
  // Zone-label fallback: ONLY for "Inside Dhaka" zones. Outside-Dhaka
  // customers shouldn't be tagged as Dhaka — Pathao result (or raw form
  // value) is more accurate. Detection logic:
  //   - "outside" indicator present (ভিতরে নয়, বাহিরে/বাইরে/outside)
  //     → return null (don't fake)
  //   - any "Dhaka" mention without an outside indicator → "Dhaka"
  //   - everything else → null
  const guessCityFromZone = (city: string): string | null => {
    const c = (city || "").toLowerCase();
    if (!c) return null;
    // Outside indicators short-circuit. Bangla "বাহিরে"/"বাইরে" + English
    // "outside". Catches "ঢাকার বাহিরে", "Outside Dhaka", etc.
    if (/বাহিরে|বাইরে|outside/i.test(c)) return null;
    // Has any Dhaka mention (BN/EN/dhakar variant) → safe to default.
    if (/ঢাকা|dhaka|dhakar/i.test(c)) return "Dhaka";
    return null;
  };

  void (async () => {
    try {
      const { parsePathaoAddress } = await import("@/lib/pathao");
      if (!isValidBDPhone(rawPhone)) {
        // Even with a bad phone, try to surface a sane city for FB matching.
        const fallback = guessCityFromZone(data.city || "");
        if (fallback) {
          await prisma.order.update({
            where: { id: order.id },
            data: { parsedCity: fallback },
          });
        }
        return;
      }
      const r = await parsePathaoAddress(rawAddress, rawPhone);
      const district = r?.district_name?.trim();
      // Resolve in priority order: Pathao district → zone-label heuristic.
      // Only writes when we have SOMETHING usable; null preserved otherwise
      // so /collect knows to leave the form city untouched.
      const resolved = district || guessCityFromZone(data.city || "");
      if (!resolved) return;
      await prisma.order.update({
        where: { id: order.id },
        data: { parsedCity: resolved },
      });
    } catch (e) {
      console.error("[Order parsedCity] background error:", e instanceof Error ? e.message : e);
      // Best-effort fallback even on hard failure.
      try {
        const fallback = guessCityFromZone(data.city || "");
        if (fallback) {
          await prisma.order.update({
            where: { id: order.id },
            data: { parsedCity: fallback },
          });
        }
      } catch {}
    }
  })();

  return jsonResponse(serialize(order), 201);
}
