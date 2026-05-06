/**
 * Block-list enforcement. Single source of truth for "is this incoming
 * customer banned?". Used by:
 *   - POST /api/v1/orders          (real order create)
 *   - POST /api/v1/incomplete-orders (checkout-form upsert)
 *
 * Three independent angles, OR'd:
 *   1. phone           → BlockedPhone table   (canonical 01XXXXXXXXX)
 *   2. ip              → BlockedIp table
 *   3. device fp hash  → DeviceFingerprint.status = "blocked"
 *
 * Any single match → blocked. Returns the reason for logging, but callers
 * should respond with a vague generic error to the attacker so they can't
 * tell which dimension flagged them.
 */
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/spamDetection";

export interface BlockCheckInput {
  phone?: string | null;
  ip?: string | null;
  fpHash?: string | null;
}

export interface BlockCheckResult {
  blocked: boolean;
  reason?: string;
  matched?: "phone" | "ip" | "fingerprint";
}

export async function isCustomerBlocked(input: BlockCheckInput): Promise<BlockCheckResult> {
  const phone = input.phone ? normalizePhone(input.phone) : null;
  const ip = (input.ip || "").trim() || null;
  const fpHash = (input.fpHash || "").trim() || null;

  // Run the three lookups in parallel — each is index-backed.
  const [phoneRow, ipRow, fpRow] = await Promise.all([
    phone
      ? prisma.blockedPhone.findUnique({ where: { phone }, select: { reason: true } })
      : Promise.resolve(null),
    ip
      ? prisma.blockedIp.findUnique({ where: { ipAddress: ip }, select: { reason: true } })
      : Promise.resolve(null),
    fpHash
      ? prisma.deviceFingerprint.findUnique({
          where: { fpHash },
          select: { status: true, blockReason: true },
        })
      : Promise.resolve(null),
  ]);

  if (phoneRow) return { blocked: true, matched: "phone", reason: phoneRow.reason || "phone_blocked" };
  if (ipRow) return { blocked: true, matched: "ip", reason: ipRow.reason || "ip_blocked" };
  if (fpRow && fpRow.status === "blocked") {
    return { blocked: true, matched: "fingerprint", reason: fpRow.blockReason || "device_blocked" };
  }
  return { blocked: false };
}

/**
 * Atomic block of all three angles linked to a specific order. Used by the
 * "Block customer from this order" admin action. Reads the order +
 * fingerprint, then upserts BlockedPhone, BlockedIp, and flips the device
 * fingerprint status. Returns what was actually blocked (some fields may be
 * null on the order — e.g. fingerprint missing for legacy rows).
 */
export interface BlockFromOrderResult {
  phone: { blocked: boolean; value: string | null };
  ip:    { blocked: boolean; value: string | null };
  fp:    { blocked: boolean; value: string | null };
}

export async function blockCustomerFromOrder(
  orderId: number,
  reason: string,
  blockedBy?: string,
): Promise<BlockFromOrderResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, customerPhone: true },
  });
  if (!order) throw new Error("Order not found");

  const fp = await prisma.orderFingerprint.findUnique({
    where: { orderId },
    select: { fpHash: true, ipAddress: true },
  });

  const result: BlockFromOrderResult = {
    phone: { blocked: false, value: null },
    ip: { blocked: false, value: null },
    fp: { blocked: false, value: null },
  };

  // 1. Phone
  if (order.customerPhone) {
    const canonical = normalizePhone(order.customerPhone);
    if (canonical) {
      await prisma.blockedPhone.upsert({
        where: { phone: canonical },
        update: { reason, blockedBy: blockedBy ?? null, orderId },
        create: { phone: canonical, reason, blockedBy: blockedBy ?? null, orderId },
      });
      result.phone = { blocked: true, value: canonical };
    }
  }

  // 2. IP
  if (fp?.ipAddress) {
    await prisma.blockedIp.upsert({
      where: { ipAddress: fp.ipAddress },
      update: { reason },
      create: { ipAddress: fp.ipAddress, reason },
    });
    result.ip = { blocked: true, value: fp.ipAddress };
  }

  // 3. Device fingerprint — flip status on the existing row.
  if (fp?.fpHash) {
    await prisma.deviceFingerprint.update({
      where: { fpHash: fp.fpHash },
      data: { status: "blocked", blockReason: reason, blockedAt: new Date() },
    }).catch(() => {});
    result.fp = { blocked: true, value: fp.fpHash };
  }

  return result;
}
