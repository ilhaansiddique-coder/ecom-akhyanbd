// Mobile wrapper — update/delete a shipping zone.
import type { NextRequest } from "next/server";
import {
  PUT as adminPUT,
  DELETE as adminDELETE,
} from "@/app/api/v1/admin/shipping/[id]/route";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = (req: NextRequest, ctx: Ctx) => adminPUT(req, ctx);
export const DELETE = (req: NextRequest, ctx: Ctx) => adminDELETE(req, ctx);