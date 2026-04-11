import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { addressSchema } from "@/lib/validation";
import { jsonResponse, validationError, notFound, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const address = await prisma.address.findFirst({
    where: { id: Number(id), userId: user.id },
  });
  if (!address) return notFound("Address not found");

  const body = await request.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] = [issue.message];
    return validationError(errors);
  }

  const data = parsed.data;

  if (data.is_default) {
    await prisma.address.updateMany({
      where: { userId: user.id, id: { not: address.id } },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.address.update({
    where: { id: address.id },
    data: {
      label: data.label,
      name: data.name,
      phone: data.phone,
      address: data.address,
      city: data.city,
      zipCode: data.zip_code || null,
      isDefault: data.is_default || false,
    },
  });

  return jsonResponse(serialize(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const address = await prisma.address.findFirst({
    where: { id: Number(id), userId: user.id },
  });
  if (!address) return notFound("Address not found");

  await prisma.address.delete({ where: { id: address.id } });
  return jsonResponse({ message: "Address deleted" });
}
