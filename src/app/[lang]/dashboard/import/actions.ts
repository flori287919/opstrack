'use server'

import { createClient } from '@/lib/supabase/server'
import {
  buildLookup,
  parseBoolean,
  parseDate,
  parseEnum,
  parseInteger,
  parseNumber,
  parseString,
  readWorkbook,
  sliceForPreview,
  type CommitResult,
  type PreviewResult,
  type RawRow,
  type RowError,
} from '@/lib/excel-import'
import type { ImportEntity } from '@/lib/excel-templates'
import { revalidatePath } from 'next/cache'

const MODALITY = ['Contract', 'PO'] as const
const PROJECT_APPROVAL = ['Yes', 'No', 'Pending'] as const
const INVOICE_STATUS = ['Scheduled', 'Invoiced', 'Paid', 'Cancelled'] as const
const COST_CONTRACT_STATUS = ['Active', 'Closed', 'Pending'] as const
const COST_PAYMENT_STATUS = ['Scheduled', 'Submitted', 'Paid', 'Cancelled'] as const
const PM_ROLE = ['Senior PM', 'PM', 'Junior PM', 'Other'] as const
const EMPLOYMENT_TYPE = ['Salaried', 'Daily', 'Hourly'] as const

async function getOrgId(): Promise<{ orgId: string | null; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { orgId: null, error: 'Not authenticated' }
  const { data } = await supabase.from('org_members').select('org_id, approved').eq('user_id', user.id).limit(1).maybeSingle()
  if (!data?.approved) return { orgId: null, error: 'Org not approved' }
  return { orgId: data.org_id }
}

// ----------------------------------------
// Row builders — pure, return either the typed row or an error string
// ----------------------------------------

function buildBL(r: RawRow, orgId: string): { row?: Record<string, unknown>; error?: string } {
  const code = parseString(r['Kodi'])
  const name = parseString(r['Emri'])
  if (!code) return { error: 'Mungon "Kodi"' }
  if (!name) return { error: 'Mungon "Emri"' }
  return { row: { org_id: orgId, code, name, description: parseString(r['Përshkrim']) } }
}

function buildBeneficiary(r: RawRow, orgId: string): { row?: Record<string, unknown>; error?: string } {
  const name = parseString(r['Emri'])
  if (!name) return { error: 'Mungon "Emri"' }
  return { row: { org_id: orgId, name, country: parseString(r['Vendi']), notes: parseString(r['Shënime']) } }
}

function buildPM(r: RawRow, orgId: string): { row?: Record<string, unknown>; error?: string } {
  const name = parseString(r['Emri'])
  if (!name) return { error: 'Mungon "Emri"' }
  const roleRaw = parseString(r['Roli'])
  const role = roleRaw ? parseEnum(roleRaw, PM_ROLE) : null
  if (roleRaw && !role) return { error: `"Roli" duhet të jetë një nga: ${PM_ROLE.join(', ')}` }
  return { row: { org_id: orgId, name, email: parseString(r['Email']), role } }
}

function buildClient(r: RawRow, orgId: string): { row?: Record<string, unknown>; error?: string } {
  const name = parseString(r['Emri'])
  if (!name) return { error: 'Mungon "Emri"' }
  const modalityRaw = parseString(r['Modaliteti default'])
  const modality = modalityRaw ? parseEnum(modalityRaw, MODALITY) : null
  if (modalityRaw && !modality) return { error: '"Modaliteti default" duhet të jetë "Contract" ose "PO"' }
  return {
    row: {
      org_id: orgId,
      name,
      country: parseString(r['Vendi']),
      contact_person: parseString(r['Kontakt person']),
      email: parseString(r['Email']),
      phone: parseString(r['Telefon']),
      payment_terms_days: parseInteger(r['Payment Terms (ditë)']) ?? 0,
      default_modality: modality,
      notes: parseString(r['Shënime']),
    },
  }
}

function buildPerson(r: RawRow, orgId: string): { row?: Record<string, unknown>; error?: string } {
  const name = parseString(r['Emri'])
  if (!name) return { error: 'Mungon "Emri"' }
  const typeRaw = parseString(r['Tipi'])
  const employment_type = typeRaw ? parseEnum(typeRaw, EMPLOYMENT_TYPE) : 'Salaried'
  if (typeRaw && !employment_type) return { error: `"Tipi" duhet të jetë një nga: ${EMPLOYMENT_TYPE.join(', ')}` }
  return {
    row: {
      org_id: orgId,
      name,
      role: parseString(r['Roli']),
      email: parseString(r['Email']),
      employment_type,
      monthly_salary: parseNumber(r['Pagë mujore (EUR)']),
      daily_rate: parseNumber(r['Daily rate (EUR)']),
      hourly_rate: parseNumber(r['Hourly rate (EUR)']),
      default_billable_daily_rate: parseNumber(r['Billable daily rate (EUR)']),
      start_date: parseDate(r['Start date']),
      end_date: parseDate(r['End date']),
      notes: parseString(r['Shënime']),
    },
  }
}

function buildProject(
  r: RawRow,
  orgId: string,
  ctx: { blByCode: Map<string, string>; clientByName: Map<string, string>; benByName: Map<string, string>; pmByName: Map<string, string> }
): { row?: Record<string, unknown>; error?: string } {
  const project_code = parseString(r['Kodi'])
  const name = parseString(r['Emri'])
  if (!project_code) return { error: 'Mungon "Kodi"' }
  if (!name) return { error: 'Mungon "Emri"' }

  const blCode = parseString(r['BL kodi'])
  const bl_id = blCode ? ctx.blByCode.get(blCode.toLowerCase()) ?? null : null
  if (blCode && !bl_id) return { error: `BL me kod "${blCode}" nuk u gjet` }

  const clientName = parseString(r['Klient'])
  const client_id = clientName ? ctx.clientByName.get(clientName.toLowerCase()) ?? null : null
  if (clientName && !client_id) return { error: `Klienti "${clientName}" nuk u gjet` }

  const benName = parseString(r['Beneficiary'])
  const beneficiary_id = benName ? ctx.benByName.get(benName.toLowerCase()) ?? null : null
  if (benName && !beneficiary_id) return { error: `Beneficiary "${benName}" nuk u gjet` }

  const pmName = parseString(r['Project Manager'])
  const project_manager_id = pmName ? ctx.pmByName.get(pmName.toLowerCase()) ?? null : null
  if (pmName && !project_manager_id) return { error: `Project Manager "${pmName}" nuk u gjet` }

  const modalityRaw = parseString(r['Modalitet'])
  const modality = modalityRaw ? parseEnum(modalityRaw, MODALITY) : null
  if (modalityRaw && !modality) return { error: '"Modalitet" duhet të jetë "Contract" ose "PO"' }

  return {
    row: {
      org_id: orgId,
      project_code,
      name,
      bl_id,
      client_id,
      beneficiary_id,
      project_manager_id,
      contract_start_date: parseDate(r['Contract Start']),
      contract_end_date: parseDate(r['Contract End']),
      project_start_date: parseDate(r['Project Start']),
      planned_end_date: parseDate(r['Planned End']),
      modality,
      project_value_no_vat: parseNumber(r['Vlera (pa VAT)']) ?? 0,
      submission_profit_margin: parseNumber(r['Submission Margin']) ?? 0,
      client_payment_terms_days: parseInteger(r['Payment Terms (ditë)']) ?? 0,
      payment_terms_condition: parseString(r['Payment Terms (kushti)']),
      project_approval_form: 'Pending' as (typeof PROJECT_APPROVAL)[number],
      project_charter: 'Pending' as (typeof PROJECT_APPROVAL)[number],
      approved_cost_sheets: 'Pending' as (typeof PROJECT_APPROVAL)[number],
      notes: parseString(r['Shënime']),
    },
  }
}

function buildInvoice(
  r: RawRow,
  orgId: string,
  ctx: { projectByCode: Map<string, string> }
): { row?: Record<string, unknown>; error?: string } {
  const projectCode = parseString(r['Project Code'])
  if (!projectCode) return { error: 'Mungon "Project Code"' }
  const project_id = ctx.projectByCode.get(projectCode.toLowerCase())
  if (!project_id) return { error: `Projekti me kod "${projectCode}" nuk u gjet` }
  const statusRaw = parseString(r['Status']) ?? 'Scheduled'
  const status = parseEnum(statusRaw, INVOICE_STATUS)
  if (!status) return { error: `"Status" duhet të jetë një nga: ${INVOICE_STATUS.join(', ')}` }
  return {
    row: {
      org_id: orgId,
      project_id,
      invoice_number: parseString(r['Invoice #']),
      planned_issue_date: parseDate(r['Planned Issue']),
      actual_issue_date: parseDate(r['Actual Issue']),
      planned_collection_date: parseDate(r['Planned Collection']),
      expected_collection_date: parseDate(r['Expected Collection']),
      collection_date: parseDate(r['Collection Date']),
      amount_no_vat: parseNumber(r['Shuma (pa VAT)']) ?? 0,
      status,
      notes: parseString(r['Shënime']),
    },
  }
}

function buildCostContract(
  r: RawRow,
  orgId: string,
  ctx: { projectByCode: Map<string, string> }
): { row?: Record<string, unknown>; error?: string } {
  const projectCode = parseString(r['Project Code'])
  if (!projectCode) return { error: 'Mungon "Project Code"' }
  const project_id = ctx.projectByCode.get(projectCode.toLowerCase())
  if (!project_id) return { error: `Projekti me kod "${projectCode}" nuk u gjet` }
  const contract_name = parseString(r['Emri i kontratës'])
  if (!contract_name) return { error: 'Mungon "Emri i kontratës"' }
  const modalityRaw = parseString(r['Modalitet'])
  const modality = modalityRaw ? parseEnum(modalityRaw, MODALITY) : null
  if (modalityRaw && !modality) return { error: '"Modalitet" duhet të jetë "Contract" ose "PO"' }
  const statusRaw = parseString(r['Status']) ?? 'Active'
  const status = parseEnum(statusRaw, COST_CONTRACT_STATUS)
  if (!status) return { error: `"Status" duhet të jetë një nga: ${COST_CONTRACT_STATUS.join(', ')}` }
  return {
    row: {
      org_id: orgId,
      project_id,
      contract_name,
      beneficiary_name: parseString(r['Subkontraktori']),
      modality,
      status,
      contract_value_no_taxes: parseNumber(r['Vlera pa taksa']) ?? 0,
      contract_value_with_taxes: parseNumber(r['Vlera me taksa']) ?? 0,
      tax_label: parseString(r['Tax label']),
      wht_applicable: parseBoolean(r['WHT i aplikueshëm']) ?? false,
      wht_value: parseNumber(r['WHT Value']) ?? 0,
      subco_payment_terms_days: parseInteger(r['Subco Payment (ditë)']) ?? 0,
      subco_payment_terms_condition: parseString(r['Payment Condition']),
      notes: parseString(r['Shënime']),
    },
  }
}

function buildCostPayment(
  r: RawRow,
  orgId: string,
  ctx: { contractByKey: Map<string, string> }
): { row?: Record<string, unknown>; error?: string } {
  const projectCode = parseString(r['Project Code'])
  const contractName = parseString(r['Emri i kontratës'])
  if (!projectCode) return { error: 'Mungon "Project Code"' }
  if (!contractName) return { error: 'Mungon "Emri i kontratës"' }
  const key = `${projectCode}${contractName}`.toLowerCase()
  const cost_contract_id = ctx.contractByKey.get(key)
  if (!cost_contract_id)
    return { error: `Kontrata "${contractName}" nën projektin "${projectCode}" nuk u gjet` }
  const statusRaw = parseString(r['Status']) ?? 'Scheduled'
  const status = parseEnum(statusRaw, COST_PAYMENT_STATUS)
  if (!status) return { error: `"Status" duhet të jetë një nga: ${COST_PAYMENT_STATUS.join(', ')}` }
  return {
    row: {
      org_id: orgId,
      cost_contract_id,
      receipt_number: parseString(r['Receipt #']),
      payment_schedule_pct: parseNumber(r['% e kontratës']),
      invoice_expected_date: parseDate(r['Invoice Expected']),
      due_payment_date: parseDate(r['Due Payment']),
      actual_payment_date: parseDate(r['Actual Payment']),
      amount: parseNumber(r['Amount']) ?? 0,
      cost_no_taxes: parseNumber(r['Cost no taxes']) ?? 0,
      wht: parseNumber(r['WHT']) ?? 0,
      status,
      notes: parseString(r['Shënime']),
    },
  }
}

function buildAllocation(
  r: RawRow,
  orgId: string,
  ctx: { projectByCode: Map<string, string>; personByName: Map<string, string> }
): { row?: Record<string, unknown>; error?: string } {
  const projectCode = parseString(r['Project Code'])
  const personName = parseString(r['Emri i personit'])
  const start_date = parseDate(r['Start date'])
  if (!projectCode) return { error: 'Mungon "Project Code"' }
  if (!personName) return { error: 'Mungon "Emri i personit"' }
  if (!start_date) return { error: 'Mungon ose i pavlefshëm "Start date"' }
  const project_id = ctx.projectByCode.get(projectCode.toLowerCase())
  if (!project_id) return { error: `Projekti me kod "${projectCode}" nuk u gjet` }
  const person_id = ctx.personByName.get(personName.toLowerCase())
  if (!person_id) return { error: `Personi "${personName}" nuk u gjet te Stafi` }
  return {
    row: {
      org_id: orgId,
      project_id,
      person_id,
      start_date,
      end_date: parseDate(r['End date']),
      allocation_pct: parseNumber(r['Allocation %']) ?? 1,
      billable_daily_rate: parseNumber(r['Billable daily rate']),
      notes: parseString(r['Shënime']),
    },
  }
}

function buildTimesheet(
  r: RawRow,
  orgId: string,
  ctx: { projectByCode: Map<string, string>; personByName: Map<string, string> }
): { row?: Record<string, unknown>; error?: string } {
  const projectCode = parseString(r['Project Code'])
  const personName = parseString(r['Emri i personit'])
  const date = parseDate(r['Data'])
  const hours = parseNumber(r['Orë'])
  if (!projectCode) return { error: 'Mungon "Project Code"' }
  if (!personName) return { error: 'Mungon "Emri i personit"' }
  if (!date) return { error: 'Mungon ose i pavlefshëm "Data"' }
  if (hours == null || hours <= 0) return { error: '"Orë" duhet të jetë numër > 0' }
  const project_id = ctx.projectByCode.get(projectCode.toLowerCase())
  if (!project_id) return { error: `Projekti me kod "${projectCode}" nuk u gjet` }
  const person_id = ctx.personByName.get(personName.toLowerCase())
  if (!person_id) return { error: `Personi "${personName}" nuk u gjet te Stafi` }
  return {
    row: {
      org_id: orgId,
      project_id,
      person_id,
      date,
      hours,
      description: parseString(r['Përshkrim']),
    },
  }
}

// ----------------------------------------
// Context loaders for FK resolution
// ----------------------------------------

async function loadProjectContext(orgId: string) {
  const supabase = await createClient()
  const [bls, clients, bens, pms] = await Promise.all([
    supabase.from('business_lines').select('id, code').eq('org_id', orgId).is('deleted_at', null),
    supabase.from('clients').select('id, name').eq('org_id', orgId).is('deleted_at', null),
    supabase.from('beneficiaries').select('id, name').eq('org_id', orgId).is('deleted_at', null),
    supabase.from('project_managers').select('id, name').eq('org_id', orgId).is('deleted_at', null),
  ])
  return {
    blByCode: buildLookup((bls.data ?? []).map((r) => ({ id: r.id, key: r.code }))),
    clientByName: buildLookup((clients.data ?? []).map((r) => ({ id: r.id, key: r.name }))),
    benByName: buildLookup((bens.data ?? []).map((r) => ({ id: r.id, key: r.name }))),
    pmByName: buildLookup((pms.data ?? []).map((r) => ({ id: r.id, key: r.name }))),
  }
}

async function loadProjectByCode(orgId: string): Promise<Map<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase.from('projects').select('id, project_code').eq('org_id', orgId).is('deleted_at', null)
  return buildLookup((data ?? []).map((r) => ({ id: r.id, key: r.project_code })))
}

async function loadPersonByName(orgId: string): Promise<Map<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase.from('people').select('id, name').eq('org_id', orgId).is('deleted_at', null)
  return buildLookup((data ?? []).map((r) => ({ id: r.id, key: r.name })))
}

async function loadCostContractByKey(orgId: string): Promise<Map<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cost_contracts')
    .select('id, contract_name, project:projects(project_code)')
    .eq('org_id', orgId)
    .is('deleted_at', null)
  const m = new Map<string, string>()
  for (const r of data ?? []) {
    const project = Array.isArray(r.project) ? r.project[0] : r.project
    if (!project?.project_code || !r.contract_name) continue
    const key = `${project.project_code}${r.contract_name}`.toLowerCase()
    m.set(key, r.id)
  }
  return m
}

// ----------------------------------------
// Process — preview or commit a single entity
// ----------------------------------------

async function process(entity: ImportEntity, buffer: ArrayBuffer, mode: 'preview' | 'commit'): Promise<PreviewResult<Record<string, unknown>> | CommitResult> {
  const { orgId, error: orgErr } = await getOrgId()
  if (!orgId) {
    return { ok: false, total: 0, validRows: [], errors: [{ row: 0, message: orgErr ?? 'Org missing' }], preview: [] } as PreviewResult<Record<string, unknown>>
  }

  const raw = await readWorkbook(buffer)
  const errors: RowError[] = []
  const valid: Array<Record<string, unknown>> = []
  const previewSrc: Array<Record<string, unknown>> = []

  // Build per-entity context lazily
  let ctx: unknown = null
  if (entity === 'projects') ctx = await loadProjectContext(orgId)
  else if (entity === 'invoices' || entity === 'cost_contracts') ctx = { projectByCode: await loadProjectByCode(orgId) }
  else if (entity === 'cost_payments') ctx = { contractByKey: await loadCostContractByKey(orgId) }
  else if (entity === 'allocations' || entity === 'timesheets') {
    const [projectByCode, personByName] = await Promise.all([loadProjectByCode(orgId), loadPersonByName(orgId)])
    ctx = { projectByCode, personByName }
  }

  raw.forEach((r, idx) => {
    const rowNum = idx + 2 // +1 for header, +1 for 1-based
    let result: { row?: Record<string, unknown>; error?: string }
    switch (entity) {
      case 'business_lines':
        result = buildBL(r, orgId)
        break
      case 'beneficiaries':
        result = buildBeneficiary(r, orgId)
        break
      case 'project_managers':
        result = buildPM(r, orgId)
        break
      case 'clients':
        result = buildClient(r, orgId)
        break
      case 'people':
        result = buildPerson(r, orgId)
        break
      case 'projects':
        result = buildProject(r, orgId, ctx as Parameters<typeof buildProject>[2])
        break
      case 'invoices':
        result = buildInvoice(r, orgId, ctx as Parameters<typeof buildInvoice>[2])
        break
      case 'cost_contracts':
        result = buildCostContract(r, orgId, ctx as Parameters<typeof buildCostContract>[2])
        break
      case 'cost_payments':
        result = buildCostPayment(r, orgId, ctx as Parameters<typeof buildCostPayment>[2])
        break
      case 'allocations':
        result = buildAllocation(r, orgId, ctx as Parameters<typeof buildAllocation>[2])
        break
      case 'timesheets':
        result = buildTimesheet(r, orgId, ctx as Parameters<typeof buildTimesheet>[2])
        break
      default:
        result = { error: `Unknown entity ${entity}` }
    }
    if (result.error) errors.push({ row: rowNum, message: result.error })
    else if (result.row) {
      valid.push(result.row)
      previewSrc.push(r)
    }
  })

  if (mode === 'preview') {
    return {
      ok: errors.length === 0,
      total: raw.length,
      validRows: valid,
      errors,
      preview: sliceForPreview(previewSrc),
    }
  }

  // Commit: insert valid rows in batches
  if (valid.length === 0) {
    return { ok: false, inserted: 0, errors: errors.length ? errors : [{ row: 0, message: 'No rows to insert' }] }
  }

  const supabase = await createClient()
  const tableMap: Record<ImportEntity, string> = {
    business_lines: 'business_lines',
    beneficiaries: 'beneficiaries',
    project_managers: 'project_managers',
    clients: 'clients',
    people: 'people',
    projects: 'projects',
    invoices: 'invoices',
    cost_contracts: 'cost_contracts',
    cost_payments: 'cost_payments',
    allocations: 'people_allocations',
    timesheets: 'timesheets',
  }
  const table = tableMap[entity]
  const BATCH = 100
  let inserted = 0
  const commitErrors: RowError[] = []
  for (let i = 0; i < valid.length; i += BATCH) {
    const slice = valid.slice(i, i + BATCH)
    const { error, count } = await supabase.from(table).insert(slice, { count: 'exact' })
    if (error) {
      commitErrors.push({ row: i + 2, message: error.message })
      break
    }
    inserted += count ?? slice.length
  }

  // Revalidate the relevant pages
  revalidatePath('/[lang]/dashboard', 'layout')

  return { ok: commitErrors.length === 0, inserted, errors: commitErrors }
}

export async function previewImport(entity: ImportEntity, formData: FormData): Promise<PreviewResult<Record<string, unknown>>> {
  const file = formData.get('file') as File | null
  if (!file) return { ok: false, total: 0, validRows: [], errors: [{ row: 0, message: 'No file provided' }], preview: [] }
  const buffer = await file.arrayBuffer()
  return (await process(entity, buffer, 'preview')) as PreviewResult<Record<string, unknown>>
}

export async function commitImport(entity: ImportEntity, formData: FormData): Promise<CommitResult> {
  const file = formData.get('file') as File | null
  if (!file) return { ok: false, inserted: 0, errors: [{ row: 0, message: 'No file provided' }] }
  const buffer = await file.arrayBuffer()
  return (await process(entity, buffer, 'commit')) as CommitResult
}
