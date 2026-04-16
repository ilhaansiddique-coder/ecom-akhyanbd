import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { paginatedResponse } from "@/lib/paginate";
import { createOrderSchema } from "@/lib/validation";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";
import { sendOrderConfirmation, sendAdminOrderNotification } from "@/lib/email";
import { bumpVersion } from "@/lib/sync";
import { randomBytes } from "crypto";
import { calculateRiskScore, isValidBDPhone } from "@/lib/spamDetection";
import { getClientIp } from "@/lib/fbcapi";

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
  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] = [issue.message];
    return validationError(errors);
  }

  const data = parsed.data;
  const user = await getSessionUser();

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
        const products = await tx.product.findMany({ where: { id: { in: productIds } }, include: { variants: true } });
        const pMap = new Map<number, any>(products.map((p: any) => [p.id, p]));

        // 2. Validate stock and build server-side price items (variant-aware)
        const verifiedItems = data.items.map((item) => {
          const product = pMap.get(item.product_id);
          if (!product) throw new Error(`Product not found: ${item.product_id}`);

          const variantId = (item as any).variant_id;
          let price = product.price as number;
          let variantLabel: string | null = null;
          let stockSource = product;

          if (variantId && product.hasVariations) {
            const variant = product.variants?.find((v: any) => v.id === variantId);
            if (!variant) throw new Error(`Variant not found for ${product.name}`);
            price = variant.price;
            variantLabel = variant.label;
            stockSource = variant;
          }

          if (!stockSource.unlimitedStock && stockSource.stock < item.quantity) {
            const label = variantLabel ? `${product.name} (${variantLabel})` : product.name;
            throw new Error(`${label} এর পর্যাপ্ত স্টক নেই। বর্তমান স্টক: ${stockSource.stock}`);
          }

          return {
            productId: item.product_id,
            productName: product.name,
            variantId: variantId || null,
            variantLabel,
            price,
            quantity: item.quantity,
          };
        });

        // 3. Recalculate totals server-side
        const serverSubtotal = verifiedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const serverShipping = data.shipping_cost || 0;
        const serverDiscount = data.discount || 0;
        const serverTotal = serverSubtotal + serverShipping - serverDiscount;

        // 4. Update stock with optimistic locking
        for (const vItem of verifiedItems) {
          const prod = pMap.get(vItem.productId);
          if (!prod) continue;

          // Decrement variant stock if applicable
          if (vItem.variantId && prod.hasVariations) {
            const variant = prod.variants?.find((v: any) => v.id === vItem.variantId);
            if (variant && !variant.unlimitedStock) {
              const vResult = await tx.productVariant.updateMany({
                where: { id: vItem.variantId, version: variant.version, stock: { gte: vItem.quantity } },
                data: { stock: { decrement: vItem.quantity }, version: { increment: 1 } },
              });
              if (vResult.count === 0) throw new Error(`CONFLICT:${prod.name}`);
            }
          }

          // Update product soldCount + stock (skip stock decrement if variant handles it)
          const skipProductStock = prod.unlimitedStock || vItem.variantId;
          const updateResult = await tx.product.updateMany({
            where: {
              id: vItem.productId,
              version: prod.version,
              ...(skipProductStock ? {} : { stock: { gte: vItem.quantity } }),
            },
            data: {
              ...(skipProductStock ? {} : { stock: { decrement: vItem.quantity } }),
              soldCount: { increment: vItem.quantity },
              version: { increment: 1 },
            },
          });

          if (updateResult.count === 0) {
            throw new Error(`CONFLICT:${prod.name}`);
          }
        }

        // 5. Create order with server-verified prices
        const newOrder = await tx.order.create({
          data: {
            userId: user?.id || null,
            customerName: data.customer_name,
            customerPhone: data.customer_phone || data.phone || "",
            customerEmail: data.customer_email || data.email || null,
            customerAddress: data.customer_address || data.address || "",
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
      lastError = err?.message || "অর্ডার তৈরি করতে সমস্যা হয়েছে";

      // If it's a conflict (version mismatch), retry
      if (lastError.startsWith("CONFLICT:") && attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 50 * (attempt + 1))); // Backoff: 50ms, 100ms, 150ms
        continue;
      }

      // Stock error — don't retry, return immediately
      if (lastError.includes("স্টক নেই")) {
        return errorResponse(lastError, 422);
      }

      // Other errors — don't retry
      return errorResponse(lastError, 422);
    }
  }

  if (!order) {
    return errorResponse("সার্ভার ব্যস্ত। আবার চেষ্টা করুন।", 503);
  }

  const customerPhone = data.customer_phone || data.phone || "";
  const customerAddress = data.customer_address || data.address || "";
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

  // Save guest customer info (non-blocking) — uses random password, not phone number
  if (customerPhone && !user) {
    prisma.user.findFirst({ where: { phone: customerPhone } }).then(async (existing) => {
      if (!existing) {
        const bcrypt = await import("bcryptjs");
        // Generate random password — guest must use "forgot password" to set their own
        const randomPass = randomBytes(16).toString("hex");
        await prisma.user.create({
          data: {
            name: customerName,
            email: (data.customer_email || data.email || `${customerPhone}@guest.local`),
            password: await bcrypt.hash(randomPass, 10),
            phone: customerPhone,
            address: customerAddress || null,
            role: "customer",
          },
        }).catch(() => {}); // Silently fail if email exists
      } else {
        // Update existing guest's address + name if they placed another order
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: customerName,
            address: customerAddress || existing.address,
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
    phone: data.customer_phone || data.phone || "",
    address: data.customer_address || data.address || "",
    city: data.city || "",
    paymentMethod: data.payment_method,
    shippingCost: order.shippingCost || 0,
    orderToken: (order as any).orderToken || undefined,
    items: orderItems,
  });

  bumpVersion("orders");

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

  return jsonResponse(serialize(order), 201);
}
