import { serialize } from "./serialize";

interface PaginationParams {
  page: number;
  perPage: number;
  total: number;
}

/**
 * Build a Laravel-compatible paginated response from Prisma results.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function paginatedResponse(data: any[], params: PaginationParams) {
  const { page, perPage, total } = params;
  const lastPage = Math.ceil(total / perPage) || 1;
  const from = total === 0 ? null : (page - 1) * perPage + 1;
  const to = total === 0 ? null : Math.min(page * perPage, total);

  return {
    data: data.map(serialize),
    current_page: page,
    last_page: lastPage,
    per_page: perPage,
    total,
    from,
    to,
  };
}
