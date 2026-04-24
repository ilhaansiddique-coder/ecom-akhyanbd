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
    return jsonResponse({ data: rows.map(serialize) });
  } catch (e) {
    console.error("[IncompleteOrder] list error:", e);
    return errorResponse("Failed to fetch incomplete orders", 500);
  }
}
