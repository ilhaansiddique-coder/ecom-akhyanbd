// Mobile wrapper — list reviews with moderation status filter.
import type { NextRequest } from "next/server";
import { GET as adminGET } from "@/app/api/v1/admin/reviews/route";

export const GET = (req: NextRequest) => adminGET(req);