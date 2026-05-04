import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatEUR, formatDate } from '@/lib/format'
import { restoreProject } from './actions'
import { getDictionary, hasLocale } from '../../dictionaries'

export default async function ProjectsPage({
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
          <h1 className="text-2xl font-semibold text-slate-900">{t.projects.title}</h1>
          <p className="text-sm text-slate-500">
            {showDeleted ? t.invoices.deletedSubtitle : t.invoices.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          {!showDeleted && (
            <a
              href="/api/export/projects"
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700"
            >
              ↓ Excel
            </a>
          )}
          <Link
            href={showDeleted ? `/${lang}/dashboard/projects` : `/${lang}/dashboard/projects?show=deleted`}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700"
          >
            {showDeleted ? t.invoices.activeToggle : t.invoices.deletedToggle}
          </Link>
          {!showDeleted && (
            <Link
              href={`/${lang}/dashboard/projects/new`}
              className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              {t.projects.newButton}
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
              <th className="px-4 py-3 font-medium">{t.lookups.code}</th>
              <th className="px-4 py-3 font-medium">{t.common.name}</th>
              <th className="px-4 py-3 font-medium text-right">{t.projects.valueNoVat}</th>
              <th className="px-4 py-3 font-medium">{t.projects.contractStart}</th>
              <th className="px-4 py-3 font-medium">{t.projects.plannedEnd}</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(projects ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  {showDeleted ? t.invoices.noDeleted : t.projects.noProjects}
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
                        <button className="text-emerald-700 hover:underline">{t.common.restore}</button>
                      </form>
                    ) : (
                      <Link
                        href={`/${lang}/dashboard/projects/${p.id}`}
                        className="text-slate-700 hover:underline"
                      >
                        {t.common.open} →
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
