import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, validationError } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";
import { usersBulkSchema } from "@/lib/validation";
import { bumpVersion } from "@/lib/sync";

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

  const parsed = usersBulkSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const { action, ids: rawIds = [], role } = parsed.data;
  const ids = rawIds
    .map((x) => Number(typeof x === "string" ? x : String(x ?? "")))
    .filter((n: number) => !isNaN(n) && n > 0)
    .filter((n: number) => n !== admin.id);

  if (ids.length === 0) {
    return validationError({ ids: ["No valid ids provided (or only the current admin was selected)"] });
  }

  if (action === "delete") {
    const result = await prisma.user.deleteMany({ where: { id: { in: ids } } });
    // Bulk could touch both staff and customer rows — bump both channels
    // once each rather than per-row. The clients refetch and figure out
    // what actually disappeared.
    bumpVersion("staff", { kind: "staff.bulk_deleted", title: "Users deleted", body: `${result.count} users removed`, severity: "warn" });
    bumpVersion("customers");
    return jsonResponse({ deleted: result.count });
  }

  if (action === "update_role") {
    if (!role) {
      return validationError({ role: ["Role must be customer, staff, or admin"] });
    }
    const result = await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { role },
    });
    bumpVersion("staff", { kind: "staff.bulk_role_changed", title: "Roles updated", body: `${result.count} → ${role}`, severity: "info" });
    bumpVersion("customers");
    return jsonResponse({ updated: result.count, role });
  }

  return validationError({ action: ["Unknown action — expected 'delete' or 'update_role'"] });
});
