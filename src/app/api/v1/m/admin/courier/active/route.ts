// Mobile wrapper — list of enabled+configured couriers (Pathao/Steadfast).
// Drives the courier-filter dropdown on the Flutter Courier Monitor screen.
import type { NextRequest } from "next/server";
import { GET as adminGET } from "@/app/api/v1/admin/courier/active/route";

export const GET = (req: NextRequest) => adminGET(req);