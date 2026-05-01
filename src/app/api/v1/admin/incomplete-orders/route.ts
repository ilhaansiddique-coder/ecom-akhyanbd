import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";

// Lazy auto-purge: drop unconverted rows older than 10 days on every list call.
// Cheap because phone is unique + indexed; this stays bounded.
async function purgeOld() {
  const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  try {
    await prisma.incompleteOrder.deleteMany({
      where: { convertedAt: null, createdAt: { lt: cutoff } },
    });
  } catch (e) {
    console.error("[IncompleteOrder] purge error:", e);
  }
}

export async function GET(request: NextRequest) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  await purgeOld();

  const { searchParams } = request.nextUrl;
  const includeConverted = searchParams.get("include_converted") === "1";

  try {
    const rows = await prisma.incompleteOrder.findMany({
      where: includeConverted ? {} : { convertedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    // Belt-and-suspenders: even with `convertedAt = null`, a row can linger
    // when the order was placed under a slightly different phone format
    // (typed "+880…", dashes, leading zero variants) before the canonical-
    // phone fix landed. Sweep the matching Orders table once and hide any
    // incomplete row whose phone shows up there. Skip when admin explicitly
    // asks for converted rows (debug view).
    let filtered = rows;
    if (!includeConverted && rows.length > 0) {
      const phones = Array.from(new Set(rows.map((r) => r.phone).filter(Boolean)));
      if (phones.length > 0) {
        const matched = await prisma.order.findMany({
          where: { customerPhone: { in: phones }, status: { not: "trashed" } },
          select: { customerPhone: true },
        });
        const placedSet = new Set(matched.map((o) => o.customerPhone));
        if (placedSet.size > 0) {
          // Mark them converted in DB so subsequent reads + the stat card
          // counters are consistent without re-running this sweep.
          const now = new Date();
          await prisma.incompleteOrder.updateMany({
            where: { phone: { in: Array.from(placedSet) }, convertedAt: null },
            data: { convertedAt: now },
          }).catch(() => {});
          filtered = rows.filter((r) => !placedSet.has(r.phone));
        }
      }
    }

    return jsonResponse({ data: filtered.map(serialize) });
  } catch (e) {
    console.error("[IncompleteOrder] list error:", e);
    return errorResponse("Failed to fetch incomplete orders", 500);
  }
}
