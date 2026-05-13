import { NextResponse } from "next/server";

export interface MobilePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function mobileJson<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function mobileList<T>(
  items: T[],
  pagination: MobilePagination,
  status = 200,
) {
  return NextResponse.json({ data: items, pagination }, { status });
}

export function buildPagination(
  total: number,
  page: number,
  pageSize: number,
): MobilePagination {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);
  return {
    page,
    pageSize: safePageSize,
    total,
    totalPages,
  };
}

export function parsePaging(
  searchParams: URLSearchParams,
  defaultPageSize = 20,
  maxPageSize = 100,
): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const requested =
    Number(searchParams.get("pageSize") || defaultPageSize) || defaultPageSize;
  const pageSize = Math.min(maxPageSize, Math.max(1, requested));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
