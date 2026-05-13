// Mobile wrapper — list contact / form submissions.
import type { NextRequest } from "next/server";
import { GET as adminGET } from "@/app/api/v1/admin/form-submissions/route";

export const GET = (req: NextRequest) => adminGET(req);