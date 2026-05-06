import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";

export const GET = withAdmin(async (_request) => {
  try {
    const submissions = await prisma.formSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(submissions.map(serialize));
  } catch {
    return errorResponse("Failed to fetch submissions", 500);
  }
});
