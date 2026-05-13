// Mobile wrapper for /admin/courier — proxies the action=test query (and
// any future GET-only actions) so the Flutter app's Courier Settings screen
// can run a Steadfast connection test from the /m/* namespace. POST/etc are
// intentionally not forwarded; mobile only needs read/test today.
import type { NextRequest } from "next/server";
import { GET as adminGET } from "@/app/api/v1/admin/courier/route";

export const GET = (req: NextRequest) => adminGET(req);