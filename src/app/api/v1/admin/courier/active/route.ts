import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { isSteadfastEnabled } from "@/lib/steadfast";
import { isPathaoEnabled } from "@/lib/pathao";

/**
 * GET /api/v1/admin/courier/active
 * Return list of couriers that are both enabled (admin toggle) AND configured (creds present).
 * Drives the dynamic courier picker on the orders page.
 */
export async function GET(_req: NextRequest) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  const [steadfast, pathao] = await Promise.all([
    isSteadfastEnabled(),
    isPathaoEnabled(),
  ]);

  const couriers: { id: "steadfast" | "pathao"; label: string }[] = [];
  if (steadfast) couriers.push({ id: "steadfast", label: "Steadfast" });
  if (pathao) couriers.push({ id: "pathao", label: "Pathao" });

  return jsonResponse({ couriers });
}
