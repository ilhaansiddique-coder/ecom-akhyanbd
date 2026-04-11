import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { paginatedResponse } from "@/lib/paginate";
import { createOrderSchema } from "@/lib/validation";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";
import { sendOrderConfirmation } from "@/lib/email";
import { bumpVersion } from "@/lib/sync";

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

  // Validate stock
  const productIds = data.items.map((i) => i.product_id);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productMap = new Map<number, any>(products.map((p: any) => [p.id, p]));

  for (const item of data.items) {
    const product = productMap.get(item.product_id);
    if (!product) return errorResponse(`Product not found: ${item.product_id}`, 422);
    if (product.stock < item.quantity) {
      return errorResponse(`${product.name} এর পর্যাপ্ত স্টক নেই। বর্তমান স্টক: ${product.stock}`, 422);
    }
  }

  // Create order in transaction
  const order = // eslint-disable-next-line @typescript-eslint/no-explicit-any
await prisma.$transaction(async (tx: any) => {
    const newOrder = await tx.order.create({
      data: {
        userId: user?.id || null,
        customerName: data.customer_name,
        customerPhone: data.customer_phone || data.phone || "",
        customerEmail: data.customer_email || data.email || null,
        customerAddress: data.customer_address || data.address || "",
        city: data.city,
        zipCode: data.zip_code || null,
        subtotal: data.subtotal,
        shippingCost: data.shipping_cost || 0,
        total: data.total,
        paymentMethod: data.payment_method,
        notes: data.notes || null,
        items: {
          create: data.items.map((item) => ({
            productId: item.product_id,
            productName: item.product_name || productMap.get(item.product_id)?.name || "",
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // Update stock
    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.product_id },
        data: {
          stock: { decrement: item.quantity },
          soldCount: { increment: item.quantity },
        },
      });
    }

    return newOrder;
  });

  // Auto-save guest customer to users table (non-blocking)
  const customerPhone = data.customer_phone || data.phone || "";
  if (customerPhone && !user) {
    prisma.user.findFirst({ where: { phone: customerPhone } }).then(async (existing) => {
      if (!existing) {
        const bcrypt = await import("bcryptjs");
        await prisma.user.create({
          data: {
            name: data.customer_name,
            email: (data.customer_email || data.email || `${customerPhone}@guest.local`),
            password: await bcrypt.hash(customerPhone, 10),
            phone: customerPhone,
            role: "customer",
          },
        }).catch(() => {}); // Silently fail if email exists
      }
    }).catch(() => {});
  }

  // Send confirmation email (non-blocking)
  const orderEmail = data.customer_email || data.email;
  if (orderEmail) {
    sendOrderConfirmation(orderEmail, {
      customerName: data.customer_name,
      orderId: order.id,
      total: data.total,
      items: data.items.map((i) => ({
        productName: i.product_name || productMap.get(i.product_id)?.name || "",
        quantity: i.quantity,
        price: i.price,
      })),
    });
  }

  bumpVersion("orders");
  return jsonResponse(serialize(order), 201);
}
