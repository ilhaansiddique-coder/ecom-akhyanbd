import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { normalizePhone, isValidBDPhone } from "@/lib/spamDetection";

export async function GET() {
  try { await requireStaff(); } catch (e) { return e as Response; }
  const rows = await prisma.blockedPhone.findMany({ orderBy: { createdAt: "desc" } });
  return jsonResponse(rows.map(serialize));
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireStaff(); } catch (e) { return e as Response; }

  const body = await request.json();
  const rawPhone: string = body.phone || body.phone_number || "";
  if (!rawPhone.trim()) return validationError({ phone: ["Phone is required"] });
  if (!isValidBDPhone(rawPhone)) return validationError({ phone: ["Invalid BD phone number"] });

  const phone = normalizePhone(rawPhone);
  const reason: string = body.reason?.trim() || "manual_block";
  const orderId = Number(body.order_id) || null;

  const blocked = await prisma.blockedPhone.upsert({
    where: { phone },
    update: { reason, blockedBy: admin.id, orderId },
    create: { phone, reason, blockedBy: admin.id, orderId },
  });

  return jsonResponse(serialize(blocked), 201);
}
