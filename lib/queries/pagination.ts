// lib/queries/pagination.ts
export function getPagination(pageParam: string | null, limitParam: string | null) {
  const page = Math.max(1, Number(pageParam) || 1);
  const limit = Math.max(1, Number(limitParam) || 10);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function getPageCount(total: number, limit: number) {
  return Math.ceil(total / limit);
}