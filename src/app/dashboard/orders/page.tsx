import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import OrdersClient from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user || !isStaffOrAdmin(user.role)) redirect("/cdlogin");

  try {
    const [data, total, zonesData] = await Promise.all([
      prisma.order.findMany({
        include: { items: { include: { product: { select: { image: true } } } } },
        orderBy: { createdAt: "desc" },
        // Match the API's per-page (admin/orders/route.ts → perPage = 100) so
        // the SSR-seeded page 1 lines up exactly with what the client sees
        // when it clicks "Next" — no overlap, no skipped rows.
        take: 100,
        where: { status: { not: "trashed" } },
      }),
      prisma.order.count({ where: { status: { not: "trashed" } } }),
      prisma.shippingZone.findMany({ orderBy: { id: "asc" } }),
    ]);

    // Batched variant-image lookup (no Prisma relation declared on OrderItem.variantId)
    const variantIds = Array.from(
      new Set(
        data.flatMap((o) => o.items.map((i) => i.variantId).filter((v): v is number => !!v))
      )
    );
    const variantImageMap = new Map<number, string>();
    if (variantIds.length > 0) {
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, image: true },
      });
      for (const v of variants) {
        if (v.image) variantImageMap.set(v.id, v.image);
      }
    }

    const items = data.map((o) => ({
      id: o.id,
      customer_name: o.customerName,
      customer_phone: o.customerPhone ?? undefined,
      customer_email: o.customerEmail ?? undefined,
      customer_address: o.customerAddress ?? undefined,
      city: o.city ?? undefined,
      zip_code: o.zipCode ?? undefined,
      phone: o.customerPhone ?? undefined,
      subtotal: Number(o.subtotal),
      shipping_cost: Number(o.shippingCost),
      total: Number(o.total),
      status: o.status,
      payment_status: o.paymentStatus,
      payment_method: o.paymentMethod,
      transaction_id: o.transactionId ?? undefined,
      notes: o.notes ?? undefined,
      courier_sent: o.courierSent ?? undefined,
      consignment_id: o.consignmentId ?? undefined,
      courier_status: o.courierStatus ?? undefined,
      courier_score: o.courierScore ?? undefined,
      created_at: o.createdAt?.toISOString() ?? "",
      items: o.items.map((i) => ({
        id: i.id,
        product_id: i.productId ?? undefined,
        product_name: i.productName,
        variant_id: i.variantId ?? undefined,
        variant_label: i.variantLabel ?? undefined,
        variant_image: i.variantId ? variantImageMap.get(i.variantId) ?? null : null,
        price: Number(i.price),
        quantity: i.quantity,
        product: i.product?.image ? { image: i.product.image } : null,
      })),
    }));

    const shippingZones = zonesData.map((z) => ({
      id: z.id,
      name: z.name,
      rate: Number(z.rate),
    }));

    return <OrdersClient initialData={{ items, total, shippingZones }} />;
  } catch {
    return <OrdersClient initialData={{ items: [], total: 0, shippingZones: [] }} />;
  }
}
