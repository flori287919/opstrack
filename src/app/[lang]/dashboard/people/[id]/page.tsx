import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatEUR, formatDate, todayISO } from '@/lib/format'
import { updatePerson, softDeletePerson } from '../actions'
import { activeAllocationPctForPerson, type Allocation } from '@/lib/people-cost'
import { getDictionary, hasLocale } from '../../../dictionaries'
import { Field, Select } from '@/components/forms'

export default async function PersonDetailPage({
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

  const [{ data: person }, { data: allocations }] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).single(),
    supabase
      .from('people_allocations')
      .select('id, person_id, project_id, allocation_pct, start_date, end_date, billable_daily_rate, project:projects(project_code, name)')
      .eq('person_id', id)
      .is('deleted_at', null)
      .order('start_date', { ascending: false }),
  ])

  if (!person) notFound()

  const update = updatePerson.bind(null, id)
  const remove = softDeletePerson.bind(null, id)
  const today = todayISO()

  const allocsForCalc: Allocation[] = (allocations ?? []).map((a) => ({
    id: a.id,
    person_id: a.person_id,
    project_id: a.project_id,
    allocation_pct: Number(a.allocation_pct),
    start_date: a.start_date,
    end_date: a.end_date,
    billable_daily_rate: a.billable_daily_rate ? Number(a.billable_daily_rate) : null,
  }))
  const totalActivePct = activeAllocationPctForPerson(id, today, allocsForCalc)
  const overAllocated = totalActivePct > 1.0001

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href={`/${lang}/dashboard/people`} className="text-sm text-slate-500 hover:text-slate-700">
          ← {t.people.title}
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-semibold text-slate-900">{person.name}</h1>
          <form action={remove}>
            <button className="text-sm px-3 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50">
              {t.common.delete}
            </button>
          </form>
        </div>
      </div>

      {errorMsg && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{errorMsg}</div>}

      {overAllocated && (
        <div className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          {t.people.overAllocated}{' '}
          <strong>{(totalActivePct * 100).toFixed(0)}%</strong> {t.people.overAllocatedSuffix}
        </div>
      )}

      <form action={update} className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={`${t.common.name} *`} name="name" defaultValue={person.name} required />
          <Field label={t.common.role} name="role" defaultValue={person.role ?? ''} />
          <Field label={t.common.email} name="email" type="email" defaultValue={person.email ?? ''} />
          <Select
            label={t.people.type}
            name="employment_type"
            defaultValue={person.employment_type}
            options={['Salaried', 'Daily', 'Hourly']}
          />
          <Field
            label={t.people.monthlySalary}
            name="monthly_salary"
            type="number"
            step="0.01"
            defaultValue={person.monthly_salary?.toString() ?? ''}
          />
          <Field
            label={t.people.dailyRate}
            name="daily_rate"
            type="number"
            step="0.01"
            defaultValue={person.daily_rate?.toString() ?? ''}
          />
          <Field
            label={t.people.hourlyRate}
            name="hourly_rate"
            type="number"
            step="0.01"
            defaultValue={person.hourly_rate?.toString() ?? ''}
          />
          <Field
            label={t.people.billableDailyRate}
            name="default_billable_daily_rate"
            type="number"
            step="0.01"
            defaultValue={person.default_billable_daily_rate?.toString() ?? ''}
          />
          <Field
            label={t.people.startDate}
            name="start_date"
            type="date"
            defaultValue={person.start_date ?? ''}
          />
          <Field
            label={t.people.endDate}
            name="end_date"
            type="date"
            defaultValue={person.end_date ?? ''}
          />
        </div>
        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            type="submit"
            className="px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            {t.common.saveChanges}
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{t.people.currentAllocations}</h2>
          <span className="text-xs text-slate-500">
            {t.people.totalToday} <strong className={overAllocated ? 'text-amber-700' : 'text-slate-700'}>
              {(totalActivePct * 100).toFixed(0)}%
            </strong>
          </span>
        </div>
        <div className="p-5">
          {(allocations ?? []).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              {t.people.noAllocations}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(allocations ?? []).map((a) => {
                const proj = Array.isArray(a.project) ? a.project[0] : a.project
                return (
                  <li key={a.id} className="py-2 flex items-center justify-between text-sm">
                    <div>
                      <Link
                        href={`/${lang}/dashboard/projects/${a.project_id}`}
                        className="text-slate-900 hover:underline"
                      >
                        {proj ? `${proj.project_code} — ${proj.name}` : '—'}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {(Number(a.allocation_pct) * 100).toFixed(0)}% ·{' '}
                        {formatDate(a.start_date)} → {formatDate(a.end_date)}
                        {a.billable_daily_rate && ` · ${formatEUR(a.billable_daily_rate)}/d`}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

