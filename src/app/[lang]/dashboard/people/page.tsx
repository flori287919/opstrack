import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatEUR } from '@/lib/format'
import { createPerson, softDeletePerson } from './actions'
import { getDictionary, hasLocale } from '../../dictionaries'

export default async function PeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: people } = await supabase
    .from('people')
    .select('*')
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t.people.title}</h1>
          <p className="text-sm text-slate-500">{t.people.subtitle}</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-medium text-slate-900 mb-4">{t.people.addPerson}</h2>
            <form action={createPerson} className="space-y-3">
              <Field label={`${t.common.name} *`} name="name" required />
              <Field label={t.common.role} name="role" />
              <Field label={t.common.email} name="email" type="email" />
              <Select
                label={t.people.type}
                name="employment_type"
                options={['Salaried', 'Daily', 'Hourly']}
                defaultValue="Salaried"
              />
              <Field label={t.people.monthlySalary} name="monthly_salary" type="number" step="0.01" />
              <Field label={t.people.dailyRate} name="daily_rate" type="number" step="0.01" />
              <Field label={t.people.hourlyRate} name="hourly_rate" type="number" step="0.01" />
              <Field
                label={t.people.billableDailyRate}
                name="default_billable_daily_rate"
                type="number"
                step="0.01"
              />
              <div className="grid grid-cols-2 gap-2">
                <Field label={t.people.startDate} name="start_date" type="date" />
                <Field label={t.people.endDate} name="end_date" type="date" />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                {t.common.save}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-slate-700">
                  <th className="px-4 py-3 font-medium">{t.common.name}</th>
                  <th className="px-4 py-3 font-medium">{t.people.type}</th>
                  <th className="px-4 py-3 font-medium text-right">{t.people.costCol}</th>
                  <th className="px-4 py-3 font-medium text-right">{t.people.billableCol}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(people ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      {t.people.noPeople}
                    </td>
                  </tr>
                ) : (
                  (people ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/${lang}/dashboard/people/${p.id}`} className="text-slate-900 hover:underline">
                          {p.name}
                        </Link>
                        {p.role && <div className="text-xs text-slate-500">{p.role}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {p.employment_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {p.employment_type === 'Salaried' && p.monthly_salary != null && (
                          <>{formatEUR(p.monthly_salary)} <span className="text-xs text-slate-400">{t.people.perMonth}</span></>
                        )}
                        {p.employment_type === 'Daily' && p.daily_rate != null && (
                          <>{formatEUR(p.daily_rate)} <span className="text-xs text-slate-400">{t.people.perDay}</span></>
                        )}
                        {p.employment_type === 'Hourly' && p.hourly_rate != null && (
                          <>{formatEUR(p.hourly_rate)} <span className="text-xs text-slate-400">{t.people.perHour}</span></>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {p.default_billable_daily_rate != null ? formatEUR(p.default_billable_daily_rate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={softDeletePerson.bind(null, p.id)}>
                          <button className="text-xs text-red-700 hover:underline">{t.common.delete}</button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  required,
  step,
  placeholder,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  step?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        step={step}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
      />
    </label>
  )
}

function Select({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string
  name: string
  options: string[]
  defaultValue?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white outline-none focus:ring-2 focus:ring-slate-900"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
