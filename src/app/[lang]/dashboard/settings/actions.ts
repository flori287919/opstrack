'use server'

import { createClient } from '@/lib/supabase/server'
import { buildDemoData, SAMPLE_TAGS } from '@/lib/sample-data'
import { revalidatePath } from 'next/cache'

type Result = { ok: boolean; message: string; counts?: Record<string, number> }

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('org_members')
    .select('org_id, approved')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!data?.approved) return null
  return data.org_id
}

export async function loadSampleData(): Promise<Result> {
  const orgId = await getOrgId()
  if (!orgId) return { ok: false, message: 'Not authorized' }
  const supabase = await createClient()

  // Refuse if demo data already exists — keep idempotency simple
  const { count: existing } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .like('name', `${SAMPLE_TAGS.DEMO_TAG}%`)
  if (existing && existing > 0) {
    return { ok: false, message: 'Të dhëna shembull tashmë ekzistojnë. Pastroji para se të shtosh të reja.' }
  }

  const data = buildDemoData(orgId)
  const counts: Record<string, number> = {}

  // 1. Lookups (no FKs)
  const [bls, bens, pms] = await Promise.all([
    supabase.from('business_lines').insert(data.businessLines).select('id, code'),
    supabase.from('beneficiaries').insert(data.beneficiaries).select('id, name'),
    supabase.from('project_managers').insert(data.projectManagers).select('id, name'),
  ])
  if (bls.error) return { ok: false, message: `BL: ${bls.error.message}` }
  if (bens.error) return { ok: false, message: `Beneficiaries: ${bens.error.message}` }
  if (pms.error) return { ok: false, message: `PMs: ${pms.error.message}` }
  counts.business_lines = bls.data?.length ?? 0
  counts.beneficiaries = bens.data?.length ?? 0
  counts.project_managers = pms.data?.length ?? 0

  // 2. Clients + people (no FKs to seeded data)
  const [clientsRes, peopleRes] = await Promise.all([
    supabase.from('clients').insert(data.clients).select('id, name'),
    supabase.from('people').insert(data.people).select('id, name'),
  ])
  if (clientsRes.error) return { ok: false, message: `Clients: ${clientsRes.error.message}` }
  if (peopleRes.error) return { ok: false, message: `People: ${peopleRes.error.message}` }
  counts.clients = clientsRes.data?.length ?? 0
  counts.people = peopleRes.data?.length ?? 0

  // 3. Projects — need bl_id, client_id, beneficiary_id, project_manager_id
  const today = new Date()
  const day = (n: number) => new Date(today.getTime() + n * 86_400_000).toISOString().slice(0, 10)
  const projectRows = data.projectSeeds.map((p) => ({
    org_id: orgId,
    project_code: p.code,
    name: p.name,
    bl_id: bls.data?.[p.blIndex]?.id ?? null,
    client_id: clientsRes.data?.[p.clientIndex]?.id ?? null,
    beneficiary_id: p.benIndex != null ? bens.data?.[p.benIndex]?.id ?? null : null,
    project_manager_id: pms.data?.[p.pmIndex]?.id ?? null,
    contract_start_date: day(p.contract_start),
    contract_end_date: day(p.contract_end),
    project_start_date: day(p.project_start),
    planned_end_date: day(p.planned_end),
    modality: p.modality,
    project_value_no_vat: p.value,
    submission_profit_margin: p.margin,
    client_payment_terms_days: p.payment_days,
    project_approval_form: 'Yes' as const,
    project_charter: 'Yes' as const,
    approved_cost_sheets: 'Yes' as const,
  }))
  const projectsRes = await supabase.from('projects').insert(projectRows).select('id, project_code')
  if (projectsRes.error) return { ok: false, message: `Projects: ${projectsRes.error.message}` }
  counts.projects = projectsRes.data?.length ?? 0

  // 4. Invoices — need project_id
  const invoiceRows = data.invoiceSeeds.map((inv) => ({
    org_id: orgId,
    project_id: projectsRes.data?.[inv.project_index]?.id ?? null,
    invoice_number: inv.invoice_number,
    actual_issue_date: day(inv.actual_issue_offset),
    planned_issue_date: day(inv.actual_issue_offset),
    planned_collection_date: day(inv.planned_collection_offset),
    expected_collection_date: inv.expected_collection_offset != null ? day(inv.expected_collection_offset) : null,
    collection_date: inv.collection_offset != null ? day(inv.collection_offset) : null,
    amount_no_vat: inv.amount,
    status: inv.status,
  }))
  const invoicesRes = await supabase.from('invoices').insert(invoiceRows)
  if (invoicesRes.error) return { ok: false, message: `Invoices: ${invoicesRes.error.message}` }
  counts.invoices = invoiceRows.length

  // 5. Cost contracts — need project_id
  const ccRows = data.costContractSeeds.map((c) => ({
    org_id: orgId,
    project_id: projectsRes.data?.[c.project_index]?.id ?? null,
    contract_name: c.contract_name,
    beneficiary_name: c.beneficiary_name,
    modality: c.modality,
    status: c.status,
    contract_value_no_taxes: c.value_no_taxes,
    contract_value_with_taxes: c.value_with_taxes,
    wht_applicable: c.wht_applicable,
    subco_payment_terms_days: c.payment_days,
  }))
  const ccRes = await supabase.from('cost_contracts').insert(ccRows).select('id, contract_name')
  if (ccRes.error) return { ok: false, message: `Cost contracts: ${ccRes.error.message}` }
  counts.cost_contracts = ccRes.data?.length ?? 0

  // 6. Cost payments — need cost_contract_id
  const cpRows = data.costPaymentSeeds.map((p) => ({
    org_id: orgId,
    cost_contract_id: ccRes.data?.[p.contract_index]?.id ?? null,
    receipt_number: p.receipt_number,
    payment_schedule_pct: p.pct,
    due_payment_date: day(p.due_offset),
    actual_payment_date: p.actual_offset != null ? day(p.actual_offset) : null,
    amount: p.amount,
    status: p.status,
  }))
  const cpRes = await supabase.from('cost_payments').insert(cpRows)
  if (cpRes.error) return { ok: false, message: `Cost payments: ${cpRes.error.message}` }
  counts.cost_payments = cpRows.length

  // 7. People allocations
  const allocRows = data.allocationSeeds.map((a) => ({
    org_id: orgId,
    person_id: peopleRes.data?.[a.person_index]?.id ?? null,
    project_id: projectsRes.data?.[a.project_index]?.id ?? null,
    allocation_pct: a.pct,
    start_date: day(a.start_offset),
    end_date: a.end_offset != null ? day(a.end_offset) : null,
    billable_daily_rate: a.billable_rate ?? null,
  }))
  const allocRes = await supabase.from('people_allocations').insert(allocRows)
  if (allocRes.error) return { ok: false, message: `Allocations: ${allocRes.error.message}` }
  counts.allocations = allocRows.length

  revalidatePath('/[lang]/dashboard', 'layout')

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return { ok: true, message: `U ngarkuan ${total} regjistrime shembull.`, counts }
}

export async function clearSampleData(): Promise<Result> {
  const orgId = await getOrgId()
  if (!orgId) return { ok: false, message: 'Not authorized' }
  const supabase = await createClient()
  const tag = `${SAMPLE_TAGS.DEMO_TAG}%`
  const blPrefix = `${SAMPLE_TAGS.DEMO_BL_PREFIX}%`

  const counts: Record<string, number> = {}

  // Order matters — children first to avoid FK issues even with cascade.
  // We HARD delete (not soft) since this is demo data the user explicitly chose to remove.

  // people_allocations: scoped via project_id with [DEMO] name OR person with [DEMO]
  const { data: demoProjects } = await supabase.from('projects').select('id').eq('org_id', orgId).like('name', tag)
  const projectIds = (demoProjects ?? []).map((p) => p.id)

  const { data: demoPeople } = await supabase.from('people').select('id').eq('org_id', orgId).like('name', tag)
  const peopleIds = (demoPeople ?? []).map((p) => p.id)

  if (projectIds.length || peopleIds.length) {
    const ids = Array.from(new Set([...projectIds]))
    if (ids.length) {
      const { count } = await supabase.from('people_allocations').delete({ count: 'exact' }).in('project_id', ids)
      counts.allocations = count ?? 0
      await supabase.from('timesheets').delete().in('project_id', ids)
    }
  }

  // cost_payments via cost_contracts with [DEMO]
  const { data: demoContracts } = await supabase.from('cost_contracts').select('id').eq('org_id', orgId).like('contract_name', tag)
  const ccIds = (demoContracts ?? []).map((c) => c.id)
  if (ccIds.length) {
    const { count } = await supabase.from('cost_payments').delete({ count: 'exact' }).in('cost_contract_id', ccIds)
    counts.cost_payments = count ?? 0
    const { count: ccCount } = await supabase.from('cost_contracts').delete({ count: 'exact' }).in('id', ccIds)
    counts.cost_contracts = ccCount ?? 0
  }

  // invoices via project_id
  if (projectIds.length) {
    const { count } = await supabase.from('invoices').delete({ count: 'exact' }).in('project_id', projectIds)
    counts.invoices = count ?? 0
    const { count: pCount } = await supabase.from('projects').delete({ count: 'exact' }).in('id', projectIds)
    counts.projects = pCount ?? 0
  }

  // Lookups + people + clients (no remaining children)
  const [{ count: clientsCount }, { count: peopleCount }, { count: bensCount }, { count: pmsCount }, { count: blsCount }] =
    await Promise.all([
      supabase.from('clients').delete({ count: 'exact' }).eq('org_id', orgId).like('name', tag),
      supabase.from('people').delete({ count: 'exact' }).eq('org_id', orgId).like('name', tag),
      supabase.from('beneficiaries').delete({ count: 'exact' }).eq('org_id', orgId).like('name', tag),
      supabase.from('project_managers').delete({ count: 'exact' }).eq('org_id', orgId).like('name', tag),
      supabase.from('business_lines').delete({ count: 'exact' }).eq('org_id', orgId).like('code', blPrefix),
    ])
  counts.clients = clientsCount ?? 0
  counts.people = peopleCount ?? 0
  counts.beneficiaries = bensCount ?? 0
  counts.project_managers = pmsCount ?? 0
  counts.business_lines = blsCount ?? 0

  revalidatePath('/[lang]/dashboard', 'layout')

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return { ok: true, message: `U fshinë ${total} regjistrime shembull.`, counts }
}

export async function hasSampleData(): Promise<boolean> {
  const orgId = await getOrgId()
  if (!orgId) return false
  const supabase = await createClient()
  const { count } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .like('name', `${SAMPLE_TAGS.DEMO_TAG}%`)
  return (count ?? 0) > 0
}

export async function isWorkspaceEmpty(): Promise<boolean> {
  const orgId = await getOrgId()
  if (!orgId) return false
  const supabase = await createClient()
  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .is('deleted_at', null)
  return (count ?? 0) === 0
}
