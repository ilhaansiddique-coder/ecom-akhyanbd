import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, validationError } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";

/**
 * Bulk operations on users.
 *
 * POST /api/v1/admin/users/bulk
 *   { action: "delete", ids: string[] }
 *   { action: "update_role", ids: string[], role: "customer" | "staff" | "admin" }
 *
 * The acting admin's own id is always stripped from the ids list before
 * the operation runs — so a stray select-all + delete can never lock the
 * admin out of their own account.
 */
export const POST = withAdmin(async (request, _ctx, admin) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const b = body as { action?: unknown; ids?: unknown; role?: unknown };
  const action = String(b?.action ?? "");
  const rawIds = Array.isArray(b?.ids) ? b.ids : [];
  const ids = rawIds
    .map((x: unknown) => (typeof x === "string" ? x : String(x ?? "")))
    .filter((s: string) => s.length > 0)
    .filter((s: string) => s !== admin.id);

  if (ids.length === 0) {
    return validationError({ ids: ["No valid ids provided (or only the current admin was selected)"] });
  }

  if (action === "delete") {
    const result = await prisma.user.deleteMany({ where: { id: { in: ids } } });
    return jsonResponse({ deleted: result.count });
  }

  if (action === "update_role") {
    const role = String(b?.role ?? "");
    if (!["customer", "staff", "admin"].includes(role)) {
      return validationError({ role: ["Role must be customer, staff, or admin"] });
    }
    const result = await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { role },
    });
    return jsonResponse({ updated: result.count, role });
  }

  return validationError({ action: ["Unknown action — expected 'delete' or 'update_role'"] });
});
