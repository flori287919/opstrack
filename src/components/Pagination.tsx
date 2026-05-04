import Link from 'next/link'

export function Pagination({
  page,
  pageSize,
  total,
  hrefForPage,
  labelPrev = '←',
  labelNext = '→',
  labelOf = 'of',
}: {
  page: number
  pageSize: number
  total: number
  hrefForPage: (p: number) => string
  labelPrev?: string
  labelNext?: string
  labelOf?: string
}) {
  const last = Math.max(1, Math.ceil(total / pageSize))
  if (last <= 1) return null
  const prev = Math.max(1, page - 1)
  const next = Math.min(last, page + 1)
  const baseBtn = 'px-3 py-1.5 text-sm rounded-lg border'
  const enabled = 'border-slate-200 text-slate-700 hover:bg-slate-100'
  const disabled = 'border-slate-100 text-slate-300 pointer-events-none'

  const start = (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
      <span>
        {start}–{end} {labelOf} {total}
      </span>
      <div className="flex gap-2">
        <Link
          href={hrefForPage(prev)}
          aria-disabled={page === 1}
          className={`${baseBtn} ${page === 1 ? disabled : enabled}`}
        >
          {labelPrev}
        </Link>
        <span className="px-3 py-1.5 text-sm text-slate-500">
          {page} / {last}
        </span>
        <Link
          href={hrefForPage(next)}
          aria-disabled={page === last}
          className={`${baseBtn} ${page === last ? disabled : enabled}`}
        >
          {labelNext}
        </Link>
      </div>
    </div>
  )
}
