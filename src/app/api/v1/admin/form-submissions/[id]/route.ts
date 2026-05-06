import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { withAdmin } from "@/lib/auth-helpers";

export const PUT = withAdmin<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const data = await request.json();

  try {
    const submission = await prisma.formSubmission.update({
      where: { id: Number(id) },
      data: {
        status: data.status || undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
    });
    return jsonResponse(serialize(submission));
  } catch {
    return notFound("Submission not found");
  }
});

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_request, { params }) => {
  const { id } = await params;

  try {
    await prisma.formSubmission.delete({ where: { id: Number(id) } });
    return jsonResponse({ message: "Deleted" });
  } catch {
    return notFound("Submission not found");
  }
});
