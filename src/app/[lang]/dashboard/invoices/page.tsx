import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatEUR, formatDate, todayISO } from '@/lib/format'
import { restoreInvoice } from './actions'
import { getDictionary, hasLocale } from '../../dictionaries'
import { parsePagination } from '@/lib/pagination'
import { Pagination } from '@/components/Pagination'

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ show?: string; filter?: string; page?: string; pageSize?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const sp = await searchParams
  const showDeleted = sp.show === 'deleted'
  const filter = sp.filter
  const { page, pageSize, from, to } = parsePagination(sp)
  const supabase = await createClient()

  const query = supabase
    .from('invoices')
    .select(
      'id, invoice_number, amount_no_vat, status, planned_collection_date, collection_date, actual_issue_date, project:projects(id, project_code, name)',
      { count: 'exact' }
    )
    .order('planned_collection_date', { ascending: false, nullsFirst: false })
    .range(from, to)

  if (showDeleted) {
    query.not('deleted_at', 'is', null)
  } else {
    query.is('deleted_at', null)
  }

  const today = todayISO()
  if (filter === 'overdue') {
    query.is('collection_date', null).lt('planned_collection_date', today)
  } else if (filter === 'paid') {
    query.eq('status', 'Paid')
  } else if (filter === 'pending') {
    query.in('status', ['Scheduled', 'Invoiced'])
  }

  const { data: invoices, error, count } = await query
  const params2: string[] = []
  if (showDeleted) params2.push('show=deleted')
  if (filter) params2.push(`filter=${filter}`)
  const baseHref = `/${lang}/dashboard/invoices${params2.length ? '?' + params2.join('&') + '&' : '?'}`

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t.invoices.title}</h1>
          <p className="text-sm text-slate-500">
            {showDeleted ? t.invoices.deletedSubtitle : t.invoices.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          {!showDeleted && (
            <a href="/api/export/invoices" className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700">
              ↓ Excel
            </a>
          )}
          <Link href={showDeleted ? `/${lang}/dashboard/invoices` : `/${lang}/dashboard/invoices?show=deleted`} className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700">
            {showDeleted ? t.invoices.activeToggle : t.invoices.deletedToggle}
          </Link>
          {!showDeleted && (
            <Link href={`/${lang}/dashboard/invoices/new`} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800">
              {t.invoices.newButton}
            </Link>
          )}
        </div>
      </div>

      {!showDeleted && (
        <div className="flex gap-2 mb-4">
          <FilterTab href={`/${lang}/dashboard/invoices`} active={!filter} label={t.invoices.filterAll} />
          <FilterTab href={`/${lang}/dashboard/invoices?filter=overdue`} active={filter === 'overdue'} label={t.invoices.filterOverdue} tone="red" />
          <FilterTab href={`/${lang}/dashboard/invoices?filter=pending`} active={filter === 'pending'} label={t.invoices.filterPending} />
          <FilterTab href={`/${lang}/dashboard/invoices?filter=paid`} active={filter === 'paid'} label={t.invoices.filterPaid} tone="green" />
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error.message}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-slate-700">
              <th className="px-4 py-3 font-medium">{t.invoices.invoiceNumber}</th>
              <th className="px-4 py-3 font-medium">{t.invoices.project}</th>
              <th className="px-4 py-3 font-medium text-right">{t.invoices.amountCol}</th>
              <th className="px-4 py-3 font-medium">{t.invoices.issueCol}</th>
              <th className="px-4 py-3 font-medium">{t.invoices.planCollectionCol}</th>
              <th className="px-4 py-3 font-medium">{t.common.status}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  {showDeleted ? t.invoices.noDeleted : t.invoices.noInvoices}
                </td>
              </tr>
            ) : (
              (invoices ?? []).map((inv) => {
                const isOverdue = !inv.collection_date && inv.planned_collection_date && inv.planned_collection_date < today
                const project = Array.isArray(inv.project) ? inv.project[0] : inv.project
                return (
                  <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-900">{inv.invoice_number || '—'}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {project ? `${project.project_code} — ${project.name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatEUR(inv.amount_no_vat)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(inv.actual_issue_date)}</td>
                    <td className={`px-4 py-3 ${isOverdue ? 'text-red-700 font-medium' : 'text-slate-600'}`}>
                      {formatDate(inv.planned_collection_date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} overdue={isOverdue ?? false} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {showDeleted ? (
                        <form action={restoreInvoice.bind(null, inv.id)}>
                          <button className="text-emerald-700 hover:underline">{t.common.restore}</button>
                        </form>
                      ) : (
                        <Link href={`/${lang}/dashboard/invoices/${inv.id}`} className="text-slate-700 hover:underline">
                          {t.common.open} →
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={count ?? 0}
        hrefForPage={(p) => `${baseHref}page=${p}`}
        labelOf={lang === 'en' ? 'of' : 'nga'}
      />
    </div>
  )
}

function FilterTab({
  href,
  active,
  label,
  tone,
}: {
  href: string
  active: boolean
  label: string
  tone?: 'red' | 'green'
}) {
  const base = 'px-3 py-1.5 text-sm rounded-lg border'
  const inactive = 'border-slate-200 text-slate-600 hover:bg-slate-100'
  const activeCls =
    tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-slate-900 bg-slate-900 text-white'
  return (
    <Link href={href} className={`${base} ${active ? activeCls : inactive}`}>
      {label}
    </Link>
  )
}

function StatusBadge({ status, overdue }: { status: string | null; overdue: boolean }) {
  if (overdue) {
    return <span className="inline-block px-2 py-0.5 text-xs rounded bg-red-100 text-red-700">Overdue</span>
  }
  const colors: Record<string, string> = {
    Paid: 'bg-emerald-100 text-emerald-700',
    Invoiced: 'bg-amber-100 text-amber-700',
    Scheduled: 'bg-slate-100 text-slate-700',
    Cancelled: 'bg-slate-100 text-slate-500',
  }
  const cls = colors[status ?? ''] ?? 'bg-slate-100 text-slate-700'
  return <span className={`inline-block px-2 py-0.5 text-xs rounded ${cls}`}>{status || '—'}</span>
}
