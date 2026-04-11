import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { addressSchema } from "@/lib/validation";
import { jsonResponse, validationError, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: { isDefault: "desc" },
  });

  return jsonResponse(addresses.map(serialize));
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] = [issue.message];
    return validationError(errors);
  }

  const data = parsed.data;

  // If setting as default, unset other defaults
  if (data.is_default) {
    await prisma.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      userId: user.id,
      label: data.label,
      name: data.name,
      phone: data.phone,
      address: data.address,
      city: data.city,
      zipCode: data.zip_code || null,
      isDefault: data.is_default || false,
    },
  });

  return jsonResponse(serialize(address), 201);
}
