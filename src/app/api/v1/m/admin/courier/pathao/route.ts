// Mobile wrapper for /admin/courier/pathao — proxies the GET actions used
// by the Flutter Courier Settings screen: test, stores, cities, zones,
// areas. Same handler as the dashboard; auth/permission checks are upstream.
import type { NextRequest } from "next/server";
import { GET as adminGET } from "@/app/api/v1/admin/courier/pathao/route";

export const GET = (req: NextRequest) => adminGET(req);