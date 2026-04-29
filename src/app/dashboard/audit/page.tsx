import { createClient } from '@/lib/supabase/server'

const TABLE_LABELS: Record<string, string> = {
  projects: 'Projektet',
  invoices: 'Faturat',
  cost_contracts: 'Kontratat e kostove',
  cost_payments: 'Pagesat e kostove',
  clients: 'Klientët',
  beneficiaries: 'Beneficiarët',
  project_managers: 'Project Managers',
  business_lines: 'Business Lines',
}

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  INSERT: { label: 'Krijim', cls: 'bg-emerald-100 text-emerald-700' },
  UPDATE: { label: 'Ndryshim', cls: 'bg-blue-100 text-blue-700' },
  DELETE: { label: 'Fshirje', cls: 'bg-red-100 text-red-700' },
  RESTORE: { label: 'Restaurim', cls: 'bg-amber-100 text-amber-700' },
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; action?: string }>
}) {
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

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Histori (Audit log)</h1>
        <p className="text-sm text-slate-500">
          Çdo ndryshim, fshirje, ose restaurim regjistrohet — asgjë nuk humbet pa gjurmë.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        <span className="text-slate-500 mr-1">Filtro:</span>
        {(['INSERT', 'UPDATE', 'DELETE', 'RESTORE'] as const).map((a) => (
          <a
            key={a}
            href={action === a ? '/dashboard/audit' : `/dashboard/audit?action=${a}`}
            className={`px-2 py-1 rounded border ${
              action === a
                ? `${ACTION_LABELS[a].cls} border-current`
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {ACTION_LABELS[a].label}
          </a>
        ))}
        {action && (
          <a href="/dashboard/audit" className="px-2 py-1 rounded text-slate-500 underline">
            Pastro
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
              <th className="px-4 py-3 font-medium">Kur</th>
              <th className="px-4 py-3 font-medium">Veprimi</th>
              <th className="px-4 py-3 font-medium">Tabela</th>
              <th className="px-4 py-3 font-medium">Çfarë ndryshoi</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                  Asnjë veprim akoma. Pasi të ekzekutosh migration-in 0002 dhe të bësh ndryshime, do të shfaqen këtu.
                </td>
              </tr>
            ) : (
              (events ?? []).map((e) => {
                const a = ACTION_LABELS[e.action] ?? { label: e.action, cls: 'bg-slate-100 text-slate-700' }
                return (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 align-top">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString('sq-AL')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${a.cls}`}>{a.label}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {TABLE_LABELS[e.table_name] || e.table_name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <ChangeSummary action={e.action} before={e.before} after={e.after} />
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
}: {
  action: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}) {
  if (action === 'INSERT' && after) {
    const label =
      String(after.name ?? after.contract_name ?? after.project_code ?? after.invoice_number ?? after.id ?? '')
    return <span className="text-xs text-slate-600">U krijua: <strong>{label}</strong></span>
  }
  if (action === 'DELETE' && (before || after)) {
    const src = before ?? after
    const label = String(
      (src as Record<string, unknown>)?.name ??
        (src as Record<string, unknown>)?.contract_name ??
        (src as Record<string, unknown>)?.project_code ??
        (src as Record<string, unknown>)?.invoice_number ??
        (src as Record<string, unknown>)?.id ??
        ''
    )
    return <span className="text-xs text-slate-600">U fshi: <strong>{label}</strong></span>
  }
  if (action === 'RESTORE' && after) {
    const label = String(after.name ?? after.contract_name ?? after.project_code ?? after.invoice_number ?? after.id ?? '')
    return <span className="text-xs text-slate-600">U restaurua: <strong>{label}</strong></span>
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
          <li className="text-slate-400">+ {changes.length - 4} të tjera</li>
        )}
      </ul>
    )
  }
  return <span className="text-xs text-slate-400">—</span>
}
