import { formatEUR, formatDate } from '@/lib/format'
import {
  computeProjectPeopleCost,
  type Person,
  type Allocation,
  type Timesheet,
} from '@/lib/people-cost'
import {
  createAllocation,
  softDeleteAllocation,
  createTimesheet,
  softDeleteTimesheet,
} from './allocations-actions'

type AllocationRow = Allocation & {
  person?: { name: string; employment_type: string } | null
}

type TimesheetRow = Timesheet & {
  id: string
  person?: { name: string } | null
  description?: string | null
}

export type PeopleSectionDict = {
  title: string
  subtitle: string
  peopleCost: string
  billable: string
  peopleMargin: string
  person: string
  allocPct: string
  startDate: string
  endDate: string
  actionAdd: string
  actionDelete: string
  noAllocations: string
  timesheets: string
  timesheetSubtitle: string
  addHours: string
  noHours: string
  description: string
  personPlaceholder: string
  hoursLabel: string
  moreOthers: string
}

export function PeopleSection({
  projectId,
  projectStart,
  projectEnd,
  people,
  allocations,
  timesheets,
  dict,
}: {
  projectId: string
  projectStart: string | null
  projectEnd: string | null
  people: Person[]
  allocations: AllocationRow[]
  timesheets: TimesheetRow[]
  dict: PeopleSectionDict
}) {
  const today = new Date().toISOString().slice(0, 10)
  const fromIso = projectStart ?? today
  const toIso = projectEnd ?? today

  const { cost, billable, lines } = computeProjectPeopleCost({
    fromIso,
    toIso,
    people,
    allocations: allocations.map((a) => ({
      id: a.id,
      person_id: a.person_id,
      project_id: a.project_id,
      allocation_pct: Number(a.allocation_pct),
      start_date: a.start_date,
      end_date: a.end_date,
      billable_daily_rate: a.billable_daily_rate ? Number(a.billable_daily_rate) : null,
    })),
    timesheets,
    projectId,
  })

  const margin = billable - cost
  const addAllocation = createAllocation.bind(null, projectId)
  const addTimesheet = createTimesheet.bind(null, projectId)

  return (
    <div className="bg-white border border-slate-200 rounded-xl mt-6">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">{dict.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{dict.subtitle}</p>
        </div>
        <div className="flex gap-4 text-xs">
          <Stat label={dict.peopleCost} value={formatEUR(cost)} tone="amber" />
          <Stat label={dict.billable} value={formatEUR(billable)} tone="slate" />
          <Stat label={dict.peopleMargin} value={formatEUR(margin)} tone={margin >= 0 ? 'green' : 'red'} />
        </div>
      </div>

      <form
        action={addAllocation}
        className="p-5 border-b border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3"
      >
        <label className="block md:col-span-2">
          <span className="block text-xs font-medium text-slate-600 mb-1">{dict.person} *</span>
          <select
            name="person_id"
            required
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 bg-white outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">{dict.personPlaceholder}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.employment_type})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 mb-1">{dict.allocPct}</span>
          <input
            type="number"
            step="0.01"
            name="allocation_pct"
            placeholder="1.0"
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 mb-1">{dict.startDate} *</span>
          <input
            type="date"
            name="start_date"
            required
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 mb-1">{dict.endDate}</span>
          <input
            type="date"
            name="end_date"
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900"
          />
        </label>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-800 self-end"
        >
          + {dict.actionAdd}
        </button>
      </form>

      <div className="p-5 border-b border-slate-200">
        {allocations.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">{dict.noAllocations}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {allocations.map((a) => {
              const remove = softDeleteAllocation.bind(null, projectId, a.id)
              const line = lines.find(
                (l) => l.personId === a.person_id && l.from === maxIso(a.start_date, fromIso)
              )
              return (
                <li key={a.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900">
                        {a.person?.name ?? '—'}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {a.person?.employment_type ?? ''}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                        {(Number(a.allocation_pct) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatDate(a.start_date)} → {formatDate(a.end_date)}
                      {a.billable_daily_rate && ` · ${formatEUR(a.billable_daily_rate)}/d`}
                      {line && (
                        <>
                          {' · '}{dict.peopleCost}: {formatEUR(line.cost)} · {dict.billable}: {formatEUR(line.billable)}
                        </>
                      )}
                    </div>
                  </div>
                  <form action={remove}>
                    <button className="text-xs px-2 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50">
                      {dict.actionDelete}
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-900">{dict.timesheets}</h3>
          <span className="text-xs text-slate-500">
            {dict.timesheetSubtitle}{' '}
            <strong className="text-slate-700">
              {timesheets.reduce((s, t) => s + Number(t.hours), 0).toFixed(1)}h
            </strong>
          </span>
        </div>

        <form
          action={addTimesheet}
          className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4 pb-4 border-b border-slate-100"
        >
          <select
            name="person_id"
            required
            className="px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 bg-white"
          >
            <option value="">— {dict.person} —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="date"
            required
            className="px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900"
          />
          <input
            type="number"
            step="0.25"
            name="hours"
            placeholder={dict.hoursLabel}
            required
            className="px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900"
          />
          <input
            name="description"
            placeholder={dict.description}
            className="md:col-span-1 px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-800"
          >
            {dict.addHours}
          </button>
        </form>

        {timesheets.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-3">{dict.noHours}</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {timesheets.slice(0, 20).map((t) => {
              const remove = softDeleteTimesheet.bind(null, projectId, t.id)
              return (
                <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-900">{t.person?.name ?? '—'}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      {formatDate(t.date)} · {Number(t.hours).toFixed(1)}h
                    </span>
                    {t.description && (
                      <div className="text-xs text-slate-500 truncate">{t.description}</div>
                    )}
                  </div>
                  <form action={remove}>
                    <button className="text-xs text-red-700 hover:underline">{dict.actionDelete}</button>
                  </form>
                </li>
              )
            })}
            {timesheets.length > 20 && (
              <li className="py-2 text-xs text-slate-500 text-center">
                + {timesheets.length - 20} {dict.moreOthers}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

function maxIso(a: string, b: string): string {
  return a > b ? a : b
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'green' | 'red' | 'amber' | 'slate'
}) {
  const cls =
    tone === 'green'
      ? 'text-emerald-700'
      : tone === 'red'
      ? 'text-red-700'
      : tone === 'amber'
      ? 'text-amber-700'
      : 'text-slate-700'
  return (
    <div className="text-right">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm font-semibold ${cls}`}>{value}</div>
    </div>
  )
}
