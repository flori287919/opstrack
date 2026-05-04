import { Section, Field, Select, LookupSelect, type LookupOption } from '@/components/forms'

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

export type ProjectFormDict = {
  sectionIdentifiers: string
  sectionClient: string
  sectionDates: string
  sectionContract: string
  sectionValue: string
  sectionNotes: string
  code: string
  name: string
  businessLine: string
  projectManager: string
  client: string
  beneficiary: string
  contractStart: string
  contractEnd: string
  projectStart: string
  plannedEnd: string
  modality: string
  approvalForm: string
  charter: string
  approvedCostSheets: string
  valueNoVat: string
  submissionMargin: string
  clientPaymentDays: string
  paymentTermsCondition: string
  addNew: string
  selectPlaceholder: string
  yes: string
  no: string
  pending: string
}

export function ProjectForm({
  action,
  initial = {},
  bls,
  clients,
  beneficiaries,
  pms,
  submitLabel = 'Save',
  lang,
  dict,
}: {
  action: (fd: FormData) => Promise<void>
  initial?: ProjectInitial
  bls: LookupOption[]
  clients: LookupOption[]
  beneficiaries: LookupOption[]
  pms: LookupOption[]
  submitLabel?: string
  lang: string
  dict: ProjectFormDict
}) {
  const v = (k: keyof ProjectInitial) => initial[k] ?? ''
  const yesNoPending = ['', dict.yes, dict.no, dict.pending]
  const yesNoPendingValues = ['', 'Yes', 'No', 'Pending']
  return (
    <form action={action} className="space-y-6 bg-white border border-slate-200 rounded-xl p-6">
      <Section title={dict.sectionIdentifiers}>
        <Field label={`${dict.code} *`} name="project_code" defaultValue={String(v('project_code'))} placeholder="1-IN-21" required />
        <Field label={`${dict.name} *`} name="name" defaultValue={String(v('name'))} required />
        <LookupSelect label={dict.businessLine} name="bl_id" defaultValue={String(v('bl_id'))} options={bls} hrefAdd={`/${lang}/dashboard/lookups`} addLabel={dict.addNew} placeholder={dict.selectPlaceholder} />
        <LookupSelect label={dict.projectManager} name="project_manager_id" defaultValue={String(v('project_manager_id'))} options={pms} hrefAdd={`/${lang}/dashboard/lookups`} addLabel={dict.addNew} placeholder={dict.selectPlaceholder} />
      </Section>

      <Section title={dict.sectionClient}>
        <LookupSelect label={dict.client} name="client_id" defaultValue={String(v('client_id'))} options={clients} hrefAdd={`/${lang}/dashboard/clients`} addLabel={dict.addNew} placeholder={dict.selectPlaceholder} />
        <LookupSelect label={dict.beneficiary} name="beneficiary_id" defaultValue={String(v('beneficiary_id'))} options={beneficiaries} hrefAdd={`/${lang}/dashboard/lookups`} addLabel={dict.addNew} placeholder={dict.selectPlaceholder} />
      </Section>

      <Section title={dict.sectionDates}>
        <Field type="date" label={dict.contractStart} name="contract_start_date" defaultValue={String(v('contract_start_date'))} />
        <Field type="date" label={dict.contractEnd} name="contract_end_date" defaultValue={String(v('contract_end_date'))} />
        <Field type="date" label={dict.projectStart} name="project_start_date" defaultValue={String(v('project_start_date'))} />
        <Field type="date" label={dict.plannedEnd} name="planned_end_date" defaultValue={String(v('planned_end_date'))} />
      </Section>

      <Section title={dict.sectionContract}>
        <Select label={dict.modality} name="modality" defaultValue={String(v('modality'))} options={['', 'Contract', 'PO']} optionLabels={['', 'Contract', 'PO']} placeholder={dict.selectPlaceholder} />
        <Select label={dict.approvalForm} name="project_approval_form" defaultValue={String(v('project_approval_form'))} options={yesNoPendingValues} optionLabels={yesNoPending} placeholder={dict.selectPlaceholder} />
        <Select label={dict.charter} name="project_charter" defaultValue={String(v('project_charter'))} options={yesNoPendingValues} optionLabels={yesNoPending} placeholder={dict.selectPlaceholder} />
        <Select label={dict.approvedCostSheets} name="approved_cost_sheets" defaultValue={String(v('approved_cost_sheets'))} options={yesNoPendingValues} optionLabels={yesNoPending} placeholder={dict.selectPlaceholder} />
      </Section>

      <Section title={dict.sectionValue}>
        <Field type="number" step="0.01" label={dict.valueNoVat} name="project_value_no_vat" defaultValue={String(v('project_value_no_vat'))} />
        <Field type="number" step="0.0001" label={dict.submissionMargin} name="submission_profit_margin" defaultValue={String(v('submission_profit_margin'))} placeholder="0.20 = 20%" />
        <Field type="number" label={dict.clientPaymentDays} name="client_payment_terms_days" defaultValue={String(v('client_payment_terms_days'))} />
        <Field label={dict.paymentTermsCondition} name="payment_terms_condition" defaultValue={String(v('payment_terms_condition'))} placeholder="After Completion / After Approval" />
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

