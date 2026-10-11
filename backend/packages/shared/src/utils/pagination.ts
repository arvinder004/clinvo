export interface PaginationQuery {
  page: number;
  pageSize: number;
}

export function parsePaginationQuery(query: Record<string, unknown>): PaginationQuery {
  const page = Math.max(1, parseInt(String(query.page ?? 1), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize ?? 20), 10)));
  return { page, pageSize };
}
