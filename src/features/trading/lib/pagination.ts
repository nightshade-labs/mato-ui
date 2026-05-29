export function getPageCount(itemCount: number, pageSize: number) {
  const normalizedPageSize = Math.max(1, Math.floor(pageSize))
  return Math.max(1, Math.ceil(Math.max(0, itemCount) / normalizedPageSize))
}

export function clampPage(page: number, itemCount: number, pageSize: number) {
  const pageCount = getPageCount(itemCount, pageSize)
  if (!Number.isFinite(page)) return 0
  return Math.min(pageCount - 1, Math.max(0, Math.floor(page)))
}

export function getPageItems<T>({
  items,
  page,
  pageSize,
}: {
  items: Array<T>
  page: number
  pageSize: number
}) {
  const normalizedPageSize = Math.max(1, Math.floor(pageSize))
  const normalizedPage = clampPage(page, items.length, normalizedPageSize)
  const start = normalizedPage * normalizedPageSize
  return items.slice(start, start + normalizedPageSize)
}
