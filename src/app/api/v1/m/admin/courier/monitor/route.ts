// Mobile wrapper — live courier parcel status + aggregate stats. Same
// handler as the dashboard admin route; the Flutter Courier Monitor screen
// hits this from the /m/* namespace.
import type { NextRequest } from "next/server";
import { GET as adminGET } from "@/app/api/v1/admin/courier/monitor/route";

export const GET = (req: NextRequest) => adminGET(req);