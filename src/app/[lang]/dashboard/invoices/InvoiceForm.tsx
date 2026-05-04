'use client'

import { useMemo, useState } from 'react'

type InvoiceInitial = {
  project_id?: string | null
  invoice_number?: string | null
  deliverable_id?: string | null
  planned_issue_date?: string | null
  actual_issue_date?: string | null
  planned_collection_date?: string | null
  expected_collection_date?: string | null
  collection_date?: string | null
  amount_no_vat?: number | null
  status?: string | null
  notes?: string | null
}

type ProjectOption = { id: string; project_code: string; name: string }
type DeliverableOption = { id: string; project_id: string; code: string; name: string; status: string }

export type InvoiceFormDict = {
  sectionProject: string
  sectionId: string
  sectionDates: string
  sectionAmount: string
  sectionNotes: string
  project: string
  selectProject: string
  invoiceNumber: string
  deliverable: string
  selectDeliverableFirst: string
  noDeliverable: string
  deliverableEmpty: string
  plannedIssueDate: string
  actualIssueDate: string
  plannedCollectionDate: string
  expectedCollectionDate: string
  collectionDate: string
  amountNoVat: string
  status: string
}

export function InvoiceForm({
  action,
  initial = {},
  projects,
  deliverables,
  submitLabel = 'Save',
  dict,
}: {
  action: (fd: FormData) => Promise<void>
  initial?: InvoiceInitial
  projects: ProjectOption[]
  deliverables: DeliverableOption[]
  submitLabel?: string
  dict: InvoiceFormDict
}) {
  const v = (k: keyof InvoiceInitial) => initial[k] ?? ''
  const [projectId, setProjectId] = useState<string>(String(v('project_id')))

  const projectDeliverables = useMemo(
    () => deliverables.filter((d) => d.project_id === projectId),
    [deliverables, projectId]
  )

  return (
    <form action={action} className="space-y-6 bg-white border border-slate-200 rounded-xl p-6">
      <Section title={dict.sectionProject}>
        <label className="block md:col-span-2">
          <span className="block text-sm font-medium text-slate-700 mb-1">{dict.project} *</span>
          <select
            name="project_id"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            <option value="">{dict.selectProject}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code} — {p.name}
              </option>
            ))}
          </select>
        </label>
      </Section>

      <Section title={dict.sectionId}>
        <Field label={dict.invoiceNumber} name="invoice_number" defaultValue={String(v('invoice_number'))} />
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">{dict.deliverable}</span>
          <select
            name="deliverable_id"
            defaultValue={String(v('deliverable_id'))}
            disabled={!projectId}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 bg-white disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">{projectId ? dict.noDeliverable : dict.selectDeliverableFirst}</option>
            {projectDeliverables.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name} ({d.status})
              </option>
            ))}
          </select>
          {projectId && projectDeliverables.length === 0 && (
            <p className="text-xs text-slate-500 mt-1">{dict.deliverableEmpty}</p>
          )}
        </label>
      </Section>

      <Section title={dict.sectionDates}>
        <Field type="date" label={dict.plannedIssueDate} name="planned_issue_date" defaultValue={String(v('planned_issue_date'))} />
        <Field type="date" label={dict.actualIssueDate} name="actual_issue_date" defaultValue={String(v('actual_issue_date'))} />
        <Field type="date" label={dict.plannedCollectionDate} name="planned_collection_date" defaultValue={String(v('planned_collection_date'))} />
        <Field type="date" label={dict.expectedCollectionDate} name="expected_collection_date" defaultValue={String(v('expected_collection_date'))} />
        <Field type="date" label={dict.collectionDate} name="collection_date" defaultValue={String(v('collection_date'))} />
      </Section>

      <Section title={dict.sectionAmount}>
        <Field type="number" step="0.01" label={`${dict.amountNoVat} *`} name="amount_no_vat" defaultValue={String(v('amount_no_vat'))} required />
        <Select label={dict.status} name="status" defaultValue={String(v('status') || 'Scheduled')} options={['Scheduled', 'Invoiced', 'Paid', 'Cancelled']} />
      </Section>

      <Section title={dict.sectionNotes} cols={1}>
        <textarea
          name="notes"
          defaultValue={String(v('notes'))}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
        />
      </Section>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="submit"
          className="px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

function Section({
  title,
  children,
  cols = 2,
}: {
  title: string
  children: React.ReactNode
  cols?: 1 | 2
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">
        {title}
      </div>
      <div className={`grid gap-4 ${cols === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue = '',
  placeholder,
  required,
  step,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  step?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        step={step}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
      />
    </label>
  )
}

function Select({
  label,
  name,
  options,
  defaultValue = '',
}: {
  label: string
  name: string
  options: string[]
  defaultValue?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 bg-white"
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
