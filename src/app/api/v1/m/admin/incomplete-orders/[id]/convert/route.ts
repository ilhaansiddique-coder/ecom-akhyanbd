// Mobile wrapper. POST = convert this abandoned checkout into a real
// order (decrements stock, optionally fires FB CAPI Purchase).
import type { NextRequest } from "next/server";
import { POST as adminPOST } from "@/app/api/v1/admin/incomplete-orders/[id]/convert/route";

type Ctx = { params: Promise<{ id: string }> };

export const POST = (req: NextRequest, ctx: Ctx) => adminPOST(req, ctx);