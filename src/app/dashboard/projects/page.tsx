import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatEUR, formatDate } from '@/lib/format'
import { restoreProject } from './actions'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>
}) {
  const { show } = await searchParams
  const showDeleted = show === 'deleted'
  const supabase = await createClient()

  const query = supabase
    .from('projects')
    .select(
      'id, project_code, name, project_value_no_vat, contract_start_date, planned_end_date, deleted_at, created_at'
    )
    .order('created_at', { ascending: false })

  if (showDeleted) {
    query.not('deleted_at', 'is', null)
  } else {
    query.is('deleted_at', null)
  }

  const { data: projects, error } = await query

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projektet</h1>
          <p className="text-sm text-slate-500">
            {showDeleted ? 'Projekte të fshira (mund t\'i restauroni)' : 'Projektet aktive'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={showDeleted ? '/dashboard/projects' : '/dashboard/projects?show=deleted'}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700"
          >
            {showDeleted ? '← Aktive' : 'Të fshira'}
          </Link>
          {!showDeleted && (
            <Link
              href="/dashboard/projects/new"
              className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              + Projekt i ri
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error.message}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-slate-700">
              <th className="px-4 py-3 font-medium">Kodi</th>
              <th className="px-4 py-3 font-medium">Emri</th>
              <th className="px-4 py-3 font-medium text-right">Vlera (pa VAT)</th>
              <th className="px-4 py-3 font-medium">Start</th>
              <th className="px-4 py-3 font-medium">End i planifikuar</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(projects ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  {showDeleted ? 'Nuk ka projekte të fshira.' : 'Asnjë projekt akoma. Klik "Projekt i ri" për të nisur.'}
                </td>
              </tr>
            ) : (
              (projects ?? []).map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-900">{p.project_code}</td>
                  <td className="px-4 py-3 text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatEUR(p.project_value_no_vat ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.contract_start_date)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.planned_end_date)}</td>
                  <td className="px-4 py-3 text-right">
                    {showDeleted ? (
                      <form action={restoreProject.bind(null, p.id)}>
                        <button className="text-emerald-700 hover:underline">Restauro</button>
                      </form>
                    ) : (
                      <Link
                        href={`/dashboard/projects/${p.id}`}
                        className="text-slate-700 hover:underline"
                      >
                        Hap →
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
