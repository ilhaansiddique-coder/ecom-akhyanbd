// Mobile wrapper. Flutter's incompleteOrdersProvider lists abandoned
// checkouts from this endpoint; admin handler already auth-gates.
import type { NextRequest } from "next/server";
import { GET as adminGET } from "@/app/api/v1/admin/incomplete-orders/route";

export const GET = (req: NextRequest) => adminGET(req);