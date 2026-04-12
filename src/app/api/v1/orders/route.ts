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
        // 1. Fetch products with version for optimistic locking
        const productIds = data.items.map((i) => i.product_id);
        const products = await tx.product.findMany({ where: { id: { in: productIds } } });
        const pMap = new Map<number, any>(products.map((p: any) => [p.id, p]));

        // 2. Validate stock and build server-side price items
        const verifiedItems = data.items.map((item) => {
          const product = pMap.get(item.product_id);
          if (!product) throw new Error(`Product not found: ${item.product_id}`);
          if (!product.unlimitedStock && product.stock < item.quantity) {
            throw new Error(`${product.name} এর পর্যাপ্ত স্টক নেই। বর্তমান স্টক: ${product.stock}`);
          }
          return {
            productId: item.product_id,
            productName: product.name,
            price: product.price as number,
            quantity: item.quantity,
          };
        });

        // 3. Recalculate totals server-side
        const serverSubtotal = verifiedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const serverShipping = data.shipping_cost || 0;
        const serverDiscount = data.discount || 0;
        const serverTotal = serverSubtotal + serverShipping - serverDiscount;

        // 4. Update stock with optimistic locking (version check prevents overselling)
        for (const item of data.items) {
          const prod = pMap.get(item.product_id);
          if (!prod) continue;

          const updateResult = await tx.product.updateMany({
            where: {
              id: item.product_id,
              version: prod.version, // Only succeeds if version hasn't changed
              ...(prod.unlimitedStock ? {} : { stock: { gte: item.quantity } }), // Double-check stock
            },
            data: {
              ...(prod.unlimitedStock ? {} : { stock: { decrement: item.quantity } }),
              soldCount: { increment: item.quantity },
              version: { increment: 1 }, // Bump version
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

  // Save guest customer info (non-blocking) — uses random password, not phone number
  const customerPhone = data.customer_phone || data.phone || "";
  if (customerPhone && !user) {
    prisma.user.findFirst({ where: { phone: customerPhone } }).then(async (existing) => {
      if (!existing) {
        const bcrypt = await import("bcryptjs");
        // Generate random password — guest must use "forgot password" to set their own
        const randomPass = randomBytes(16).toString("hex");
        await prisma.user.create({
          data: {
            name: data.customer_name,
            email: (data.customer_email || data.email || `${customerPhone}@guest.local`),
            password: await bcrypt.hash(randomPass, 10),
            phone: customerPhone,
            role: "customer",
          },
        }).catch(() => {}); // Silently fail if email exists
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
  return jsonResponse(serialize(order), 201);
}
