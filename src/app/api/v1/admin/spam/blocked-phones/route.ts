import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { normalizePhone, isValidBDPhone } from "@/lib/spamDetection";
import { blockedPhoneSchema } from "@/lib/validation";

export const GET = withStaff(async (request) => {
  const rows = await prisma.blockedPhone.findMany({ orderBy: { createdAt: "desc" } });
  return jsonResponse(rows.map(serialize));
});

export const POST = withStaff(async (request, _ctx, admin) => {
  const body = await request.json();
  const parsed = blockedPhoneSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const data = parsed.data;
  const rawPhone: string = data.phone || data.phone_number || "";
  if (!rawPhone.trim()) return validationError({ phone: ["Phone is required"] });
  if (!isValidBDPhone(rawPhone)) return validationError({ phone: ["Invalid BD phone number"] });

  const phone = normalizePhone(rawPhone);
  const reason: string = data.reason?.trim() || "manual_block";
  const orderId = data.order_id ? Number(data.order_id) : null;

  // BlockedPhone.blockedBy was Int? — currently mid-migration to String? to
  // match User.id (UUID). Skip the field until the schema migration lands;
  // the audit trail still has createdAt + reason.
  const blocked = await prisma.blockedPhone.upsert({
    where: { phone },
    update: { reason, orderId },
    create: { phone, reason, orderId },
  });

  return jsonResponse(serialize(blocked), 201);
});
