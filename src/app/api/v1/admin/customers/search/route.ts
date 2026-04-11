import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

/**
 * GET /api/v1/admin/customers/search?q=01700
 * Search customers by name, phone, or email.
 * Returns from both users table AND unique customers from orders.
 */
export async function GET(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const q = request.nextUrl.searchParams.get("q") || "";
  if (q.length < 2) return jsonResponse([]);

  // Search registered users
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ],
    },
    select: { id: true, name: true, email: true, phone: true },
    take: 5,
  });

  // Search from past orders (for guest customers not in users table)
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { customerName: { contains: q } },
        { customerPhone: { contains: q } },
        { customerEmail: { contains: q } },
      ],
    },
    select: {
      customerName: true, customerPhone: true, customerEmail: true,
      customerAddress: true, city: true, zipCode: true,
    },
    distinct: ["customerPhone"],
    take: 5,
  });

  // Merge — users first, then unique order customers
  const results: {
    id?: number;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    zip_code?: string;
    source: "registered" | "guest";
  }[] = [];

  for (const u of users) {
    results.push({
      id: u.id,
      name: u.name,
      phone: u.phone || "",
      email: u.email,
      source: "registered",
    });
  }

  const userPhones = new Set(users.map((u) => u.phone).filter(Boolean));

  for (const o of orders) {
    if (!userPhones.has(o.customerPhone)) {
      results.push({
        name: o.customerName,
        phone: o.customerPhone,
        email: o.customerEmail || undefined,
        address: o.customerAddress || undefined,
        city: o.city || undefined,
        zip_code: o.zipCode || undefined,
        source: "guest",
      });
    }
  }

  return jsonResponse(results.slice(0, 8));
}
