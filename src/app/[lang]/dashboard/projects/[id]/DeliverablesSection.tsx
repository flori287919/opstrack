import { formatEUR, formatDate } from '@/lib/format'
import {
  createDeliverable,
  setDeliverableStatus,
  softDeleteDeliverable,
} from './deliverables-actions'

type Deliverable = {
  id: string
  code: string
  name: string
  description: string | null
  planned_date: string | null
  actual_date: string | null
  planned_value_no_vat: number | null
  status: string
  notes: string | null
}

export type DeliverablesDict = {
  title: string
  subtitle: string
  planned: string
  remaining: string
  empty: string
  code: string
  name: string
  plannedDate: string
  valueNoVat: string
  actionAdd: string
  actionStart: string
  actionSubmit: string
  actionAccept: string
  actionDelete: string
  labelPlanned: string
  labelDelivered: string
}

const STATUS_STYLES: Record<string, string> = {
  Planned: 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Submitted: 'bg-amber-100 text-amber-800',
  Accepted: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Cancelled: 'bg-slate-100 text-slate-500',
}

export function DeliverablesSection({
  projectId,
  projectValue,
  deliverables,
  dict,
}: {
  projectId: string
  projectValue: number
  deliverables: Deliverable[]
  dict: DeliverablesDict
}) {
  const create = createDeliverable.bind(null, projectId)
  const totalPlanned = deliverables.reduce(
    (s, d) => s + Number(d.planned_value_no_vat || 0),
    0
  )
  const remaining = projectValue - totalPlanned

  return (
    <div className="bg-white border border-slate-200 rounded-xl mt-6">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">{dict.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{dict.subtitle}</p>
        </div>
        <div className="text-right text-xs text-slate-600">
          <div>
            {dict.planned}: <span className="font-medium text-slate-900">{formatEUR(totalPlanned)}</span>
            <span className="text-slate-400"> / {formatEUR(projectValue)}</span>
          </div>
          <div className={remaining < 0 ? 'text-red-600' : 'text-slate-500'}>
            {dict.remaining}: {formatEUR(remaining)}
          </div>
        </div>
      </div>

      <form action={create} className="p-5 border-b border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3">
        <label className="block md:col-span-1">
          <span className="block text-xs font-medium text-slate-600 mb-1">{dict.code} *</span>
          <input
            name="code"
            placeholder="D1.1"
            required
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="block text-xs font-medium text-slate-600 mb-1">{dict.name} *</span>
          <input
            name="name"
            required
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 mb-1">{dict.plannedDate}</span>
          <input
            type="date"
            name="planned_date"
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 mb-1">{dict.valueNoVat}</span>
          <input
            type="number"
            step="0.01"
            name="planned_value_no_vat"
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
          />
        </label>
        <button
          type="submit"
          className="md:col-span-1 px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-800 self-end"
        >
          + {dict.actionAdd}
        </button>
      </form>

      <div className="p-5">
        {deliverables.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">{dict.empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {deliverables.map((d) => (
              <DeliverableRow key={d.id} projectId={projectId} d={d} dict={dict} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function DeliverableRow({ projectId, d, dict }: { projectId: string; d: Deliverable; dict: DeliverablesDict }) {
  const remove = softDeleteDeliverable.bind(null, projectId, d.id)
  const start = setDeliverableStatus.bind(null, projectId, d.id, 'In Progress', false)
  const submit = setDeliverableStatus.bind(null, projectId, d.id, 'Submitted', true)
  const accept = setDeliverableStatus.bind(null, projectId, d.id, 'Accepted', false)
  const statusCls = STATUS_STYLES[d.status] || 'bg-slate-100 text-slate-700'

  const showStart = d.status === 'Planned'
  const showSubmit = d.status === 'Planned' || d.status === 'In Progress'
  const showAccept = d.status === 'Submitted'

  return (
    <li className="py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-slate-900">{d.code}</span>
          <span className="text-sm text-slate-700 truncate">{d.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${statusCls}`}>{d.status}</span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
          <span>{dict.labelPlanned}: {formatDate(d.planned_date)}</span>
          {d.actual_date && <span>{dict.labelDelivered}: {formatDate(d.actual_date)}</span>}
          <span>{formatEUR(d.planned_value_no_vat)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 justify-end">
        {showStart && (
          <form action={start}>
            <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              {dict.actionStart}
            </button>
          </form>
        )}
        {showSubmit && (
          <form action={submit}>
            <button className="text-xs px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700">
              {dict.actionSubmit}
            </button>
          </form>
        )}
        {showAccept && (
          <form action={accept}>
            <button className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700">
              {dict.actionAccept}
            </button>
          </form>
        )}
        <form action={remove}>
          <button className="text-xs px-2 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50">
            {dict.actionDelete}
          </button>
        </form>
      </div>
    </li>
  )
}
