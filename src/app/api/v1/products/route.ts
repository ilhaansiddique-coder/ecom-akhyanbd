import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { paginatedResponse } from "@/lib/paginate";
import { jsonResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(50, Math.max(1, Number(searchParams.get("per_page")) || 12));
  const categoryId = searchParams.get("category_id");
  const brandId = searchParams.get("brand_id");
  const isFeatured = searchParams.get("is_featured");
  const sortBy = searchParams.get("sort_by") || "sort_order";
  const sortDir = (searchParams.get("sort_dir") || "asc") as "asc" | "desc";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isActive: true };
  if (categoryId) where.categoryId = Number(categoryId);
  if (brandId) where.brandId = Number(brandId);
  if (isFeatured === "1" || isFeatured === "true") where.isFeatured = true;

  const sortMap: Record<string, string> = {
    price: "price",
    sold_count: "soldCount",
    created_at: "createdAt",
    sort_order: "sortOrder",
  };
  const orderByField = sortMap[sortBy] || "sortOrder";

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true, price: true, originalPrice: true, stock: true, unlimitedStock: true, image: true, sortOrder: true } },
      },
      orderBy: { [orderByField]: sortDir },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return jsonResponse(paginatedResponse(products, { page, perPage, total }));
}
