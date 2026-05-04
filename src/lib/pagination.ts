export const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

export type Pagination = {
  page: number
  pageSize: number
  from: number
  to: number
}

export function parsePagination(
  searchParams: { page?: string; pageSize?: string },
  defaults: { page?: number; pageSize?: number } = {}
): Pagination {
  const defaultPage = defaults.page ?? 1
  const defaultSize = defaults.pageSize ?? DEFAULT_PAGE_SIZE
  const page = Math.max(1, parseInt(searchParams.page ?? '', 10) || defaultPage)
  const rawSize = parseInt(searchParams.pageSize ?? '', 10) || defaultSize
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  return { page, pageSize, from, to }
}

export function totalPages(count: number | null | undefined, pageSize: number): number {
  if (!count || count <= 0) return 1
  return Math.ceil(count / pageSize)
}
