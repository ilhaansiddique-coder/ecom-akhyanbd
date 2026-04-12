import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

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
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const { id } = await params;

  try {
    await prisma.formSubmission.delete({ where: { id: Number(id) } });
    return jsonResponse({ message: "Deleted" });
  } catch {
    return notFound("Submission not found");
  }
}
