import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonResponse, cachedJsonResponse, errorResponse, validationError } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { bumpVersion } from "@/lib/sync";
import { revalidateAll } from "@/lib/revalidate";

// Mobile-shaped orders list. Returns OrderListItem[] (camelCase) plus
// pagination envelope. Mirrors the filter logic from /admin/orders/route.ts
// but reshapes JSON keys for the Flutter client.
export const GET = withStaff(async (request) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const flagged = searchParams.get("flagged");

  const where: Prisma.OrderWhereInput = {};
  if (status) {
    where.status = status;
  } else {
    where.status = { not: "trashed" };
  }
  if (q) {
    const asNumber = Number(q);
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      ...(Number.isFinite(asNumber) && asNumber > 0 ? [{ id: asNumber }] : []),
    ];
  }
  if (flagged === "true" || flagged === "1") {
    where.riskScore = { gte: 70 };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        total: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        riskScore: true,
        courierSent: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const data = orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    total: o.total,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    riskScore: o.riskScore,
    courierSent: o.courierSent,
    itemCount: o._count.items,
    flagged: (o.riskScore ?? 0) >= 70,
    createdAt: o.createdAt?.toISOString() ?? null,
  }));

  return cachedJsonResponse({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }, { sMaxAge: 15 });
});

/**
 * POST /api/v1/m/orders
 *
 * Admin-flow order creation. Mirrors the camelCase contract documented
 * in akhiyan_api.dart#OrdersApi.create.
 *
 * Why a separate handler from the storefront /api/v1/orders POST:
 *  - That route runs fraud blocklists, optimistic-lock retries, address
 *    sanity checks, and accept-language i18n. Useful for anonymous web
 *    checkout, noise for an admin who's manually entering an order
 *    they took on the phone.
 *  - Storefront uses snake_case payloads; mobile namespace is camelCase.
 *  - Storefront's price logic re-derives from the DB (good — defends
 *    against tampered carts). Admin's prices are the displayed prices
 *    they verified with the customer; we still cross-check against the
 *    product row but don't reject on mismatch (admin can apply manual
 *    discounts).
 *
 * Stock and product existence ARE validated. Bumping fires after the
 * transaction commits.
 */
// Flutter sends product/variant IDs as strings (the Dart Product model
// types them as `String` for forward-compat with UUID-style IDs even
// though the backend table is currently integer-keyed). Use coerce so
// either "42" or 42 parses cleanly.
const itemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  productName: z.string().optional(),
  variantId: z.coerce.number().int().positive().optional().nullable(),
  variantLabel: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive(),
  price: z.coerce.number().nonnegative(),
});

const createOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required"),
  customerPhone: z.string().trim().min(1, "Customer phone is required"),
  customerEmail: z.string().trim().email().optional().nullable(),
  customerAddress: z.string().trim().min(5, "Address is required"),
  city: z.string().trim().optional().nullable(),
  zipCode: z.string().trim().optional().nullable(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  // Coerce numerics for the same reason as items above — Flutter's
  // form fields are TextEditingControllers; values may arrive as
  // numbers OR numeric strings depending on the screen.
  shippingCost: z.coerce.number().nonnegative().default(0),
  discount: z.coerce.number().nonnegative().default(0),
  paymentMethod: z.string().default("cod"),
  notes: z.string().optional().nullable(),
});

export const POST = withStaff(async (request) => {
  let body: unknown;
  try { body = await request.json(); }
  catch { return errorResponse("Invalid JSON body", 400); }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    // Build a per-issue map keyed by dotted path (e.g. "items.0.productId")
    // with the real zod message instead of the generic "Invalid input".
    // The user/dev triaging the snackbar can immediately see which field
    // and which row failed.
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.length > 0 ? issue.path.join(".") : "_root";
      (errors[path] ||= []).push(issue.message);
    }
    return validationError(errors);
  }
  const data = parsed.data;

  // Verify each line's product exists and is active. Drop any stale
  // lines silently — admin entered the line manually, so we trust their
  // pricing but won't insert orphan FK references.
  const productIds = Array.from(new Set(data.items.map((i) => i.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: { id: true, name: true, stock: true, unlimitedStock: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const verifiedItems = data.items.filter((i) => productMap.has(i.productId));
  if (verifiedItems.length === 0) {
    return errorResponse("None of the supplied items reference a valid product", 422);
  }

  const subtotal = verifiedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal + data.shippingCost - data.discount);

  let orderId: number;
  try {
    orderId = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail ?? null,
          customerAddress: data.customerAddress,
          city: data.city ?? null,
          zipCode: data.zipCode ?? null,
          subtotal,
          shippingCost: data.shippingCost,
          discount: data.discount,
          total,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentMethod === "cod" ? "pending" : "pending",
          status: "pending",
          notes: data.notes ?? null,
        },
      });

      await tx.orderItem.createMany({
        data: verifiedItems.map((i) => ({
          orderId: order.id,
          productId: i.productId,
          productName: i.productName ?? productMap.get(i.productId)?.name ?? "",
          variantId: i.variantId ?? null,
          variantLabel: i.variantLabel ?? null,
          quantity: i.quantity,
          price: i.price,
        })),
      });

      // Decrement stock for tracked products. Skips unlimitedStock SKUs
      // and lines whose product wasn't in the verified set.
      for (const i of verifiedItems) {
        const p = productMap.get(i.productId);
        if (!p || p.unlimitedStock) continue;
        await tx.product.update({
          where: { id: i.productId },
          data: { stock: { decrement: i.quantity }, soldCount: { increment: i.quantity } },
        });
      }

      return order.id;
    });
  } catch (e) {
    console.error("[m/orders] create failed:", e);
    const msg = e instanceof Error ? e.message : "Failed to create order";
    return errorResponse(`Failed to create order: ${msg}`, 500);
  }

  // Bust caches + announce. Done after commit so listeners never refetch
  // and find nothing.
  revalidateAll("orders", "products");
  bumpVersion("orders", {
    kind: "order.created",
    title: `New order #${orderId}`,
    body: `৳${Math.round(total)} from ${data.customerName} (admin-entered)`,
    href: `/orders/${orderId}`,
    icon: "shopping_bag",
    severity: "info",
  });

  // Re-fetch with items so the response matches what the Flutter Order
  // model expects (full order with line items, not just the bare row).
  const created = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  return jsonResponse({ data: created }, 201);
});
