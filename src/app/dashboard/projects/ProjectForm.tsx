type ProjectInitial = {
  project_code?: string | null
  name?: string | null
  bl_id?: string | null
  client_id?: string | null
  beneficiary_id?: string | null
  project_manager_id?: string | null
  contract_start_date?: string | null
  contract_end_date?: string | null
  project_start_date?: string | null
  planned_end_date?: string | null
  modality?: string | null
  project_approval_form?: string | null
  project_charter?: string | null
  approved_cost_sheets?: string | null
  project_value_no_vat?: number | null
  submission_profit_margin?: number | null
  client_payment_terms_days?: number | null
  payment_terms_condition?: string | null
  notes?: string | null
}

export type LookupOption = { id: string; label: string }

export function ProjectForm({
  action,
  initial = {},
  bls,
  clients,
  beneficiaries,
  pms,
  submitLabel = 'Save',
}: {
  action: (fd: FormData) => Promise<void>
  initial?: ProjectInitial
  bls: LookupOption[]
  clients: LookupOption[]
  beneficiaries: LookupOption[]
  pms: LookupOption[]
  submitLabel?: string
}) {
  const v = (k: keyof ProjectInitial) => initial[k] ?? ''
  return (
    <form action={action} className="space-y-6 bg-white border border-slate-200 rounded-xl p-6">
      <Section title="Identifikuesit">
        <Field label="Kodi i projektit *" name="project_code" defaultValue={String(v('project_code'))} placeholder="p.sh. 1-IN-21" required />
        <Field label="Emri i projektit *" name="name" defaultValue={String(v('name'))} required />
        <LookupSelect label="Business Line" name="bl_id" defaultValue={String(v('bl_id'))} options={bls} hrefAdd="/dashboard/lookups" />
        <LookupSelect label="Project Manager" name="project_manager_id" defaultValue={String(v('project_manager_id'))} options={pms} hrefAdd="/dashboard/lookups" />
      </Section>

      <Section title="Klienti dhe beneficiary">
        <LookupSelect label="Klienti" name="client_id" defaultValue={String(v('client_id'))} options={clients} hrefAdd="/dashboard/clients" />
        <LookupSelect label="Beneficiary" name="beneficiary_id" defaultValue={String(v('beneficiary_id'))} options={beneficiaries} hrefAdd="/dashboard/lookups" />
      </Section>

      <Section title="Datat">
        <Field type="date" label="Contract Start" name="contract_start_date" defaultValue={String(v('contract_start_date'))} />
        <Field type="date" label="Contract End" name="contract_end_date" defaultValue={String(v('contract_end_date'))} />
        <Field type="date" label="Project Start" name="project_start_date" defaultValue={String(v('project_start_date'))} />
        <Field type="date" label="Planned End" name="planned_end_date" defaultValue={String(v('planned_end_date'))} />
      </Section>

      <Section title="Kontrata">
        <Select label="Modaliteti" name="modality" defaultValue={String(v('modality'))} options={['', 'Contract', 'PO']} />
        <Select label="Project Approval Form" name="project_approval_form" defaultValue={String(v('project_approval_form'))} options={['', 'Yes', 'No', 'Pending']} />
        <Select label="Project Charter" name="project_charter" defaultValue={String(v('project_charter'))} options={['', 'Yes', 'No', 'Pending']} />
        <Select label="Approved Cost Sheets" name="approved_cost_sheets" defaultValue={String(v('approved_cost_sheets'))} options={['', 'Yes', 'No', 'Pending']} />
      </Section>

      <Section title="Vlera dhe marzhi">
        <Field type="number" step="0.01" label="Vlera (pa VAT)" name="project_value_no_vat" defaultValue={String(v('project_value_no_vat'))} />
        <Field type="number" step="0.0001" label="Submission Profit Margin (%)" name="submission_profit_margin" defaultValue={String(v('submission_profit_margin'))} placeholder="0.20 = 20%" />
        <Field type="number" label="Client Payment Terms (ditë)" name="client_payment_terms_days" defaultValue={String(v('client_payment_terms_days'))} />
        <Field label="Payment Terms (kushti)" name="payment_terms_condition" defaultValue={String(v('payment_terms_condition'))} placeholder="After Completion / After Approval" />
      </Section>

      <Section title="Shënime" cols={1}>
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

function Section({ title, children, cols = 2 }: { title: string; children: React.ReactNode; cols?: 1 | 2 }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">{title}</div>
      <div className={`grid gap-4 ${cols === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>{children}</div>
    </div>
  )
}

function Field({
  label, name, type = 'text', defaultValue = '', placeholder, required, step,
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
  label, name, options, defaultValue = '',
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
          <option key={o} value={o}>{o || '— Zgjidh —'}</option>
        ))}
      </select>
    </label>
  )
}

function LookupSelect({
  label, name, options, defaultValue = '', hrefAdd,
}: {
  label: string
  name: string
  options: LookupOption[]
  defaultValue?: string
  hrefAdd?: string
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {hrefAdd && (
          <a href={hrefAdd} target="_blank" rel="noopener" className="text-xs text-slate-500 hover:text-slate-900 underline">
            + Shto i ri
          </a>
        )}
      </div>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 bg-white"
      >
        <option value="">— Zgjidh —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
