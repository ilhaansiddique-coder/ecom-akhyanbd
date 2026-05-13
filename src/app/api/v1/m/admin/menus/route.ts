// Mobile wrapper — header / footer navigation menu CRUD.
import type { NextRequest } from "next/server";
import {
  GET as adminGET,
  POST as adminPOST,
} from "@/app/api/v1/admin/menus/route";

export const GET = (req: NextRequest) => adminGET(req);
export const POST = (req: NextRequest) => adminPOST(req);