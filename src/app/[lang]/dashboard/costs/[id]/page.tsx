import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CostContractForm } from '../CostContractForm'
import {
  updateCostContract,
  softDeleteCostContract,
  createCostPayment,
  markPaymentPaid,
  softDeleteCostPayment,
} from '../actions'
import { formatEUR, formatDate, todayISO } from '@/lib/format'
import { getDictionary, hasLocale } from '../../../dictionaries'
import { costContractFormDict } from '../form-dict'

export default async function CostContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const { error: errorMsg } = await searchParams
  const supabase = await createClient()

  const [{ data: contract }, { data: projects }, { data: payments }] = await Promise.all([
    supabase.from('cost_contracts').select('*').eq('id', id).single(),
    supabase
      .from('projects')
      .select('id, project_code, name')
      .is('deleted_at', null)
      .order('project_code'),
    supabase
      .from('cost_payments')
      .select('*')
      .eq('cost_contract_id', id)
      .is('deleted_at', null)
      .order('due_payment_date', { ascending: true, nullsFirst: false }),
  ])

  if (!contract) notFound()

  const update = updateCostContract.bind(null, id)
  const remove = softDeleteCostContract.bind(null, id)
  const addPayment = createCostPayment.bind(null, id)
  const today = todayISO()

  const totalScheduled = (payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalPaid = (payments ?? [])
    .filter((p) => p.status === 'Paid')
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link href={`/${lang}/dashboard/costs`} className="text-sm text-slate-500 hover:text-slate-700">
          ← {t.costs.title}
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-semibold text-slate-900">{contract.contract_name}</h1>
          <form action={remove}>
            <button className="text-sm px-3 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50">
              {t.costs.deleteContract}
            </button>
          </form>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{errorMsg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostContractForm
          action={update}
          initial={contract}
          projects={projects ?? []}
          submitLabel={t.common.saveChanges}
          dict={costContractFormDict(t)}
        />

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-3">{t.costs.summary}</h2>
            <div className="grid grid-cols-2 gap-4">
              <Stat label={t.costs.contractValue} value={formatEUR(contract.contract_value_no_taxes)} />
              <Stat label={t.costs.scheduled} value={formatEUR(totalScheduled)} />
              <Stat label={t.costs.paid} value={formatEUR(totalPaid)} tone="green" />
              <Stat label={t.costs.remaining} value={formatEUR(totalScheduled - totalPaid)} tone="amber" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">{t.costs.payments}</h2>
            </div>
            <div className="p-5">
              <form action={addPayment} className="grid grid-cols-2 gap-3 mb-5">
                <label className="text-sm">
                  <span className="block text-xs text-slate-600 mb-1">{t.costs.receiptNumber}</span>
                  <input name="receipt_number" className="w-full px-2 py-1.5 border border-slate-300 rounded text-slate-900" />
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-slate-600 mb-1">{t.costs.dueDate} *</span>
                  <input type="date" name="due_payment_date" required className="w-full px-2 py-1.5 border border-slate-300 rounded text-slate-900" />
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-slate-600 mb-1">{t.costs.amount} *</span>
                  <input type="number" step="0.01" name="amount" required className="w-full px-2 py-1.5 border border-slate-300 rounded text-slate-900" />
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-slate-600 mb-1">{t.costs.schedulePct}</span>
                  <input type="number" step="0.0001" name="payment_schedule_pct" placeholder="0.25 = 25%" className="w-full px-2 py-1.5 border border-slate-300 rounded text-slate-900" />
                </label>
                <div className="col-span-2">
                  <button type="submit" className="w-full px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                    {t.costs.addPayment}
                  </button>
                </div>
              </form>

              {(payments ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">{t.costs.noPayments}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {(payments ?? []).map((p) => {
                    const isOverdue = !p.actual_payment_date && p.due_payment_date && p.due_payment_date < today
                    const markPaid = markPaymentPaid.bind(null, p.id, id)
                    const removePayment = softDeleteCostPayment.bind(null, p.id, id)
                    return (
                      <li key={p.id} className="py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500">{p.receipt_number || '—'}</span>
                            <span className="text-sm font-medium text-slate-900">{formatEUR(p.amount)}</span>
                            {p.status === 'Paid' ? (
                              <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">Paid</span>
                            ) : isOverdue ? (
                              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">Overdue</span>
                            ) : (
                              <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">{p.status}</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {t.costs.due}: {formatDate(p.due_payment_date)}
                            {p.actual_payment_date && ` • ${t.costs.paidOn}: ${formatDate(p.actual_payment_date)}`}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {p.status !== 'Paid' && (
                            <form action={markPaid}>
                              <input type="hidden" name="actual_payment_date" value={today} />
                              <button className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700">
                                {t.costs.payNow}
                              </button>
                            </form>
                          )}
                          <form action={removePayment}>
                            <button className="text-xs px-2 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50">
                              {t.common.delete}
                            </button>
                          </form>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' }) {
  const cls =
    tone === 'green'
      ? 'text-emerald-700'
      : tone === 'amber'
      ? 'text-amber-700'
      : 'text-slate-900'
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${cls}`}>{value}</div>
    </div>
  )
}
