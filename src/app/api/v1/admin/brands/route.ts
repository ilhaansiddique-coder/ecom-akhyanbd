import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { jsonResponse, validationError, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { brandSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/unique-slug";
import { bumpVersion } from "@/lib/sync";

export async function GET(_request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = brands.map((b: any) => ({
    ...serialize(b),
    products_count: b._count?.products ?? 0,
  }));

  return jsonResponse(result);
}

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const body = await request.json();
    const parsed = brandSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.name, "brand", data.slug);

    const brand = await prisma.brand.create({
      data: {
        name: data.name,
        slug,
        logo: data.logo ?? null,
        isActive: data.is_active ?? true,
      },
    });

    revalidateTag("brands", "max");
    bumpVersion("brands");
    return jsonResponse(serialize(brand), 201);
  } catch (error) {
    return errorResponse("Failed to create brand", 500);
  }
}
