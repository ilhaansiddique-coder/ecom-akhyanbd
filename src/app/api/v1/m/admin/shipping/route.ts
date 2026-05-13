// Mobile wrapper — list & create shipping zones.
import type { NextRequest } from "next/server";
import {
  GET as adminGET,
  POST as adminPOST,
} from "@/app/api/v1/admin/shipping/route";

export const GET = (req: NextRequest) => adminGET(req);
export const POST = (req: NextRequest) => adminPOST(req);