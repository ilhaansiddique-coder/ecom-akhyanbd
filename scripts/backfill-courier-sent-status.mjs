/**
 * Backfill: flip status → "shipped" for orders that have a consignmentId
 * but were never auto-promoted (e.g. admin pasted the consignment manually
 * before the auto-promote logic existed in the order PUT handler).
 *
 * Also stamps courierSentAt where missing so dashboard daily-dispatch
 * analytics include these historical orders.
 *
 * Run: node scripts/backfill-courier-sent-status.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const PRE_COURIER = ["pending", "confirmed", "processing"];

  // Stale orders: have a consignment ID, but status is still pre-courier.
  const stale = await prisma.order.findMany({
    where: {
      consignmentId: { not: null },
      status: { in: PRE_COURIER },
    },
    select: { id: true, status: true, consignmentId: true, courierSent: true, courierSentAt: true, createdAt: true },
  });

  console.log(`Found ${stale.length} order(s) needing status fix.`);
  if (stale.length === 0) {
    await prisma.$disconnect();
    return;
  }

  let fixed = 0;
  for (const o of stale) {
    await prisma.order.update({
      where: { id: o.id },
      data: {
        status: "shipped",
        courierSent: true,
        courierSentAt: o.courierSentAt ?? o.createdAt ?? new Date(),
      },
    });
    fixed++;
    if (fixed % 50 === 0) console.log(`  …updated ${fixed}/${stale.length}`);
  }

  console.log(`Done. Updated ${fixed} order(s) to status="shipped".`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
