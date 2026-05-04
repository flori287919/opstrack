import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDictionary, hasLocale } from '../../dictionaries'

const ACTION_CLS: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  RESTORE: 'bg-amber-100 text-amber-700',
}

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ table?: string; action?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const { table, action } = await searchParams
  const supabase = await createClient()

  const query = supabase
    .from('audit_log')
    .select('id, table_name, row_id, action, before, after, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(200)

  if (table) query.eq('table_name', table)
  if (action) query.eq('action', action)

  const { data: events, error } = await query

  const localeTag = lang === 'en' ? 'en-US' : 'sq-AL'
  const actionLabel: Record<string, string> = {
    INSERT: t.audit.actionInsert,
    UPDATE: t.audit.actionUpdate,
    DELETE: t.audit.actionDelete,
    RESTORE: t.audit.actionRestore,
  }
  const tableLabels = t.audit.tables as Record<string, string>

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t.audit.title}</h1>
        <p className="text-sm text-slate-500">{t.audit.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        <span className="text-slate-500 mr-1">{t.audit.filterBy}</span>
        {(['INSERT', 'UPDATE', 'DELETE', 'RESTORE'] as const).map((a) => (
          <a
            key={a}
            href={action === a ? `/${lang}/dashboard/audit` : `/${lang}/dashboard/audit?action=${a}`}
            className={`px-2 py-1 rounded border ${
              action === a ? `${ACTION_CLS[a]} border-current` : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {actionLabel[a]}
          </a>
        ))}
        {action && (
          <a href={`/${lang}/dashboard/audit`} className="px-2 py-1 rounded text-slate-500 underline">
            {t.audit.clearFilter}
          </a>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error.message}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-slate-700">
              <th className="px-4 py-3 font-medium">{t.audit.colWhen}</th>
              <th className="px-4 py-3 font-medium">{t.audit.colAction}</th>
              <th className="px-4 py-3 font-medium">{t.audit.colTable}</th>
              <th className="px-4 py-3 font-medium">{t.audit.colChange}</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                  {t.audit.noEvents}
                </td>
              </tr>
            ) : (
              (events ?? []).map((e) => {
                const cls = ACTION_CLS[e.action] ?? 'bg-slate-100 text-slate-700'
                return (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 align-top">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString(localeTag)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>
                        {actionLabel[e.action] ?? e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {tableLabels[e.table_name] || e.table_name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <ChangeSummary
                        action={e.action}
                        before={e.before}
                        after={e.after}
                        labels={{
                          created: t.audit.created,
                          deleted: t.audit.deleted,
                          restored: t.audit.restored,
                          more: t.audit.moreOthers,
                        }}
                      />
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

function ChangeSummary({
  action,
  before,
  after,
  labels,
}: {
  action: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  labels: { created: string; deleted: string; restored: string; more: string }
}) {
  if (action === 'INSERT' && after) {
    const label = String(
      after.name ?? after.contract_name ?? after.project_code ?? after.invoice_number ?? after.code ?? after.id ?? ''
    )
    return <span className="text-xs text-slate-600">{labels.created} <strong>{label}</strong></span>
  }
  if (action === 'DELETE' && (before || after)) {
    const src = before ?? after
    const label = String(
      (src as Record<string, unknown>)?.name ??
        (src as Record<string, unknown>)?.contract_name ??
        (src as Record<string, unknown>)?.project_code ??
        (src as Record<string, unknown>)?.invoice_number ??
        (src as Record<string, unknown>)?.code ??
        (src as Record<string, unknown>)?.id ??
        ''
    )
    return <span className="text-xs text-slate-600">{labels.deleted} <strong>{label}</strong></span>
  }
  if (action === 'RESTORE' && after) {
    const label = String(
      after.name ?? after.contract_name ?? after.project_code ?? after.invoice_number ?? after.code ?? after.id ?? ''
    )
    return <span className="text-xs text-slate-600">{labels.restored} <strong>{label}</strong></span>
  }
  if (action === 'UPDATE' && before && after) {
    const changes: string[] = []
    for (const k of Object.keys(after)) {
      if (k === 'updated_at' || k === 'created_at') continue
      const a = (after as Record<string, unknown>)[k]
      const b = (before as Record<string, unknown>)[k]
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        const av = a == null ? '—' : String(a)
        const bv = b == null ? '—' : String(b)
        changes.push(`${k}: ${bv} → ${av}`)
      }
    }
    if (changes.length === 0) return <span className="text-xs text-slate-400">—</span>
    return (
      <ul className="text-xs text-slate-600 space-y-0.5">
        {changes.slice(0, 4).map((c, i) => (
          <li key={i}>{c}</li>
        ))}
        {changes.length > 4 && (
          <li className="text-slate-400">+ {changes.length - 4} {labels.more}</li>
        )}
      </ul>
    )
  }
  return <span className="text-xs text-slate-400">—</span>
}
