// Mobile wrapper — list & create blog posts.
import type { NextRequest } from "next/server";
import {
  GET as adminGET,
  POST as adminPOST,
} from "@/app/api/v1/admin/blog/route";

export const GET = (req: NextRequest) => adminGET(req);
export const POST = (req: NextRequest) => adminPOST(req);