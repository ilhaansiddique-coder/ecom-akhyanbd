// Mobile wrapper — get/update/delete one blog post.
import type { NextRequest } from "next/server";
import {
  GET as adminGET,
  PUT as adminPUT,
  DELETE as adminDELETE,
} from "@/app/api/v1/admin/blog/[id]/route";

type Ctx = { params: Promise<{ id: string }> };

export const GET = (req: NextRequest, ctx: Ctx) => adminGET(req, ctx);
export const PUT = (req: NextRequest, ctx: Ctx) => adminPUT(req, ctx);
export const DELETE = (req: NextRequest, ctx: Ctx) => adminDELETE(req, ctx);