type CostContractInitial = {
  project_id?: string | null
  beneficiary_name?: string | null
  contract_name?: string | null
  modality?: string | null
  status?: string | null
  contract_value_no_taxes?: number | null
  tax_label?: string | null
  wht_applicable?: boolean | null
  wht_value?: number | null
  contract_value_with_taxes?: number | null
  subco_payment_terms_days?: number | null
  subco_payment_terms_condition?: string | null
  notes?: string | null
}

type ProjectOption = { id: string; project_code: string; name: string }

export type CostContractFormDict = {
  sectionProject: string
  sectionSubco: string
  sectionValues: string
  sectionTerms: string
  sectionNotes: string
  project: string
  selectProject: string
  subco: string
  contractName: string
  modality: string
  status: string
  valueNoTaxes: string
  valueWithTaxes: string
  taxLabel: string
  whtApplicable: string
  whtValue: string
  paymentDays: string
  paymentCondition: string
  selectPlaceholder: string
}

export function CostContractForm({
  action,
  initial = {},
  projects,
  submitLabel = 'Save',
  dict,
}: {
  action: (fd: FormData) => Promise<void>
  initial?: CostContractInitial
  projects: ProjectOption[]
  submitLabel?: string
  dict: CostContractFormDict
}) {
  const v = (k: keyof CostContractInitial) => initial[k] ?? ''
  return (
    <form action={action} className="space-y-6 bg-white border border-slate-200 rounded-xl p-6">
      <Section title={dict.sectionProject}>
        <label className="block md:col-span-2">
          <span className="block text-sm font-medium text-slate-700 mb-1">{dict.project} *</span>
          <select
            name="project_id"
            defaultValue={String(v('project_id'))}
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

      <Section title={dict.sectionSubco}>
        <Field label={dict.subco} name="beneficiary_name" defaultValue={String(v('beneficiary_name'))} />
        <Field label={`${dict.contractName} *`} name="contract_name" defaultValue={String(v('contract_name'))} required />
        <Select label={dict.modality} name="modality" defaultValue={String(v('modality'))} options={['', 'Contract', 'PO']} placeholder={dict.selectPlaceholder} />
        <Select label={dict.status} name="status" defaultValue={String(v('status') || 'Active')} options={['Active', 'Closed', 'Pending']} placeholder={dict.selectPlaceholder} />
      </Section>

      <Section title={dict.sectionValues}>
        <Field type="number" step="0.01" label={dict.valueNoTaxes} name="contract_value_no_taxes" defaultValue={String(v('contract_value_no_taxes'))} />
        <Field type="number" step="0.01" label={dict.valueWithTaxes} name="contract_value_with_taxes" defaultValue={String(v('contract_value_with_taxes'))} />
        <Field label={dict.taxLabel} name="tax_label" defaultValue={String(v('tax_label'))} placeholder="VAT 15%" />
        <label className="flex items-center gap-2 mt-6">
          <input type="checkbox" name="wht_applicable" defaultChecked={Boolean(initial.wht_applicable)} className="h-4 w-4" />
          <span className="text-sm text-slate-700">{dict.whtApplicable}</span>
        </label>
        <Field type="number" step="0.01" label={dict.whtValue} name="wht_value" defaultValue={String(v('wht_value'))} />
      </Section>

      <Section title={dict.sectionTerms}>
        <Field type="number" label={dict.paymentDays} name="subco_payment_terms_days" defaultValue={String(v('subco_payment_terms_days'))} />
        <Field label={dict.paymentCondition} name="subco_payment_terms_condition" defaultValue={String(v('subco_payment_terms_condition'))} placeholder="After Completion / After Approval" />
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
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">{title}</div>
      <div className={`grid gap-4 ${cols === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>{children}</div>
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
  placeholder,
}: {
  label: string
  name: string
  options: string[]
  defaultValue?: string
  placeholder: string
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
            {o || placeholder}
          </option>
        ))}
      </select>
    </label>
  )
}
