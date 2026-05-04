import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatEUR } from '@/lib/format'
import { restoreCostContract } from './actions'
import { getDictionary, hasLocale } from '../../dictionaries'

export default async function CostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ show?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const { show } = await searchParams
  const showDeleted = show === 'deleted'
  const supabase = await createClient()

  const query = supabase
    .from('cost_contracts')
    .select(
      'id, contract_name, beneficiary_name, status, contract_value_no_taxes, contract_value_with_taxes, deleted_at, project:projects(id, project_code, name)'
    )
    .order('created_at', { ascending: false })

  if (showDeleted) {
    query.not('deleted_at', 'is', null)
  } else {
    query.is('deleted_at', null)
  }

  const { data: contracts, error } = await query

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t.costs.title}</h1>
          <p className="text-sm text-slate-500">
            {showDeleted ? t.invoices.deletedSubtitle : t.invoices.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          {!showDeleted && (
            <a href="/api/export/costs" className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700">
              ↓ Excel
            </a>
          )}
          <Link href={showDeleted ? `/${lang}/dashboard/costs` : `/${lang}/dashboard/costs?show=deleted`} className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700">
            {showDeleted ? t.invoices.activeToggle : t.invoices.deletedToggle}
          </Link>
          {!showDeleted && (
            <Link href={`/${lang}/dashboard/costs/new`} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800">
              {t.costs.newButton}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error.message}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-slate-700">
              <th className="px-4 py-3 font-medium">{t.costs.contractName}</th>
              <th className="px-4 py-3 font-medium">{t.costs.subcontractor}</th>
              <th className="px-4 py-3 font-medium">{t.invoices.project}</th>
              <th className="px-4 py-3 font-medium text-right">{t.costs.valueNoTaxes}</th>
              <th className="px-4 py-3 font-medium">{t.common.status}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(contracts ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  {showDeleted ? t.invoices.noDeleted : t.costs.noPayments}
                </td>
              </tr>
            ) : (
              (contracts ?? []).map((c) => {
                const project = Array.isArray(c.project) ? c.project[0] : c.project
                return (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{c.contract_name}</td>
                    <td className="px-4 py-3 text-slate-700">{c.beneficiary_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{project ? `${project.project_code}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatEUR(c.contract_value_no_taxes)}</td>
                    <td className="px-4 py-3 text-slate-700">{c.status || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {showDeleted ? (
                        <form action={restoreCostContract.bind(null, c.id)}>
                          <button className="text-emerald-700 hover:underline">{t.common.restore}</button>
                        </form>
                      ) : (
                        <Link href={`/${lang}/dashboard/costs/${c.id}`} className="text-slate-700 hover:underline">
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
    </div>
  )
}
