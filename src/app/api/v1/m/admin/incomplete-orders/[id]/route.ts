// Mobile wrapper. DELETE = drop a single abandoned-checkout row.
import type { NextRequest } from "next/server";
import { DELETE as adminDELETE } from "@/app/api/v1/admin/incomplete-orders/[id]/route";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = (req: NextRequest, ctx: Ctx) => adminDELETE(req, ctx);