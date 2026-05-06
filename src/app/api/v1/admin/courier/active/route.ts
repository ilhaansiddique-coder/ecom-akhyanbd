import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-response";
import { withStaff } from "@/lib/auth-helpers";
import { isSteadfastEnabled } from "@/lib/steadfast";
import { isPathaoEnabled } from "@/lib/pathao";

/**
 * GET /api/v1/admin/courier/active
 * Return list of couriers that are both enabled (admin toggle) AND configured (creds present).
 * Drives the dynamic courier picker on the orders page.
 */
export const GET = withStaff(async (_req) => {
  const [steadfast, pathao] = await Promise.all([
    isSteadfastEnabled(),
    isPathaoEnabled(),
  ]);

  const couriers: { id: "steadfast" | "pathao"; label: string }[] = [];
  if (steadfast) couriers.push({ id: "steadfast", label: "Steadfast" });
  if (pathao) couriers.push({ id: "pathao", label: "Pathao" });

  return jsonResponse({ couriers });
});
