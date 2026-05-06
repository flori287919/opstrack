/**
 * Realistic-looking demo workspace seed.
 *
 * Tagging convention for clean removal:
 * - Names start with `[DEMO]`
 * - Business Line codes start with `DEMO_`
 *
 * `clearSampleData()` deletes anything matching these patterns within the org.
 */

const DEMO_TAG = '[DEMO]'
const DEMO_BL_PREFIX = 'DEMO_'

const dayMs = 86_400_000

function isoDay(offsetDays: number, anchor: Date = new Date()): string {
  return new Date(anchor.getTime() + offsetDays * dayMs).toISOString().slice(0, 10)
}

export type DemoBuilder = ReturnType<typeof buildDemoData>

export function buildDemoData(orgId: string, today: Date = new Date()) {
  const day = (n: number) => isoDay(n, today)

  // ----------------------------------------
  // Lookups
  // ----------------------------------------
  const businessLines = [
    { org_id: orgId, code: `${DEMO_BL_PREFIX}INT`, name: `${DEMO_TAG} Internal`, description: 'Projekte të brendshme' },
    { org_id: orgId, code: `${DEMO_BL_PREFIX}EXT`, name: `${DEMO_TAG} External Consulting`, description: 'Konsulencë për klientë të jashtëm' },
  ]

  const beneficiaries = [
    { org_id: orgId, name: `${DEMO_TAG} Beneficiary Alpha`, country: 'Albania' },
    { org_id: orgId, name: `${DEMO_TAG} Beneficiary Beta`, country: 'Kosovo' },
    { org_id: orgId, name: `${DEMO_TAG} Beneficiary Gamma`, country: 'Italy' },
  ]

  const projectManagers = [
    { org_id: orgId, name: `${DEMO_TAG} Anna Krasniqi`, email: 'anna.demo@example.com', role: 'Senior PM' },
    { org_id: orgId, name: `${DEMO_TAG} Bob Hoxha`, email: 'bob.demo@example.com', role: 'PM' },
  ]

  const clients = [
    { org_id: orgId, name: `${DEMO_TAG} Big Bank SH.A.`, country: 'Albania', contact_person: 'Erion Kraja', email: 'finance@bigbank.demo', payment_terms_days: 30, default_modality: 'Contract' },
    { org_id: orgId, name: `${DEMO_TAG} PaysOnTime LLC`, country: 'Kosovo', contact_person: 'Mira Krasniqi', email: 'ap@paysontime.demo', payment_terms_days: 15, default_modality: 'Contract' },
    { org_id: orgId, name: `${DEMO_TAG} AlwaysLate SH.A.`, country: 'Albania', contact_person: 'Genti Lala', email: 'finance@alwayslate.demo', payment_terms_days: 60, default_modality: 'Contract' },
    { org_id: orgId, name: `${DEMO_TAG} Government Agency`, country: 'Albania', contact_person: 'Procurement Office', email: 'proc@gov.demo', payment_terms_days: 90, default_modality: 'PO' },
    { org_id: orgId, name: `${DEMO_TAG} FastClient KFT`, country: 'Hungary', contact_person: 'Janos Toth', email: 'pay@fastclient.demo', payment_terms_days: 7, default_modality: 'Contract' },
  ]

  // ----------------------------------------
  // People
  // ----------------------------------------
  const people = [
    { org_id: orgId, name: `${DEMO_TAG} Filan Salaried`, role: 'Senior Consultant', employment_type: 'Salaried', monthly_salary: 2500, default_billable_daily_rate: 400, start_date: day(-365) },
    { org_id: orgId, name: `${DEMO_TAG} Fistek Salaried`, role: 'Consultant', employment_type: 'Salaried', monthly_salary: 1800, default_billable_daily_rate: 320, start_date: day(-300) },
    { org_id: orgId, name: `${DEMO_TAG} Cilan Daily`, role: 'External Specialist', employment_type: 'Daily', daily_rate: 180, default_billable_daily_rate: 320, start_date: day(-200) },
    { org_id: orgId, name: `${DEMO_TAG} Hourly Helper`, role: 'Junior', employment_type: 'Hourly', hourly_rate: 25, default_billable_daily_rate: 200, start_date: day(-90) },
  ]

  // ----------------------------------------
  // Projects (8) — varied stages, BLs, clients
  // ----------------------------------------
  type ProjectSeed = {
    code: string
    name: string
    blIndex: number
    clientIndex: number
    benIndex: number | null
    pmIndex: number
    contract_start: number  // days offset
    contract_end: number
    project_start: number
    planned_end: number
    modality: 'Contract' | 'PO'
    value: number
    margin: number
    payment_days: number
  }
  const projectSeeds: ProjectSeed[] = [
    { code: '1-INT-01', name: `${DEMO_TAG} Bank Migration Q1`, blIndex: 0, clientIndex: 0, benIndex: 0, pmIndex: 0, contract_start: -120, contract_end: 60, project_start: -100, planned_end: 30, modality: 'Contract', value: 50000, margin: 0.25, payment_days: 30 },
    { code: '1-EXT-02', name: `${DEMO_TAG} Annual Audit`, blIndex: 1, clientIndex: 1, benIndex: 0, pmIndex: 1, contract_start: -90, contract_end: 90, project_start: -75, planned_end: 60, modality: 'Contract', value: 30000, margin: 0.30, payment_days: 15 },
    { code: '1-EXT-03', name: `${DEMO_TAG} System Integration`, blIndex: 1, clientIndex: 2, benIndex: 1, pmIndex: 0, contract_start: -150, contract_end: 30, project_start: -135, planned_end: 15, modality: 'Contract', value: 80000, margin: 0.20, payment_days: 60 },
    { code: '1-INT-04', name: `${DEMO_TAG} Compliance Review`, blIndex: 0, clientIndex: 3, benIndex: 2, pmIndex: 1, contract_start: -45, contract_end: 120, project_start: -30, planned_end: 90, modality: 'PO', value: 40000, margin: 0.18, payment_days: 90 },
    { code: '1-EXT-05', name: `${DEMO_TAG} Quick Strategy`, blIndex: 1, clientIndex: 4, benIndex: 1, pmIndex: 0, contract_start: -30, contract_end: 30, project_start: -25, planned_end: 15, modality: 'Contract', value: 15000, margin: 0.40, payment_days: 7 },
    { code: '1-INT-06', name: `${DEMO_TAG} Q2 Initiative`, blIndex: 0, clientIndex: 0, benIndex: 0, pmIndex: 0, contract_start: -10, contract_end: 180, project_start: 0, planned_end: 150, modality: 'Contract', value: 25000, margin: 0.28, payment_days: 30 },
    { code: '1-EXT-07', name: `${DEMO_TAG} Legacy Cleanup`, blIndex: 1, clientIndex: 2, benIndex: 1, pmIndex: 1, contract_start: -180, contract_end: 0, project_start: -170, planned_end: -10, modality: 'Contract', value: 60000, margin: 0.22, payment_days: 60 },
    { code: '1-EXT-08', name: `${DEMO_TAG} Q3 Planning`, blIndex: 1, clientIndex: 1, benIndex: 0, pmIndex: 0, contract_start: 30, contract_end: 180, project_start: 30, planned_end: 150, modality: 'Contract', value: 20000, margin: 0.35, payment_days: 15 },
  ]

  // ----------------------------------------
  // Invoices — designed to fuel every dashboard chart
  // ----------------------------------------
  type InvoiceSeed = {
    project_index: number
    invoice_number: string
    amount: number
    actual_issue_offset: number
    planned_collection_offset: number
    expected_collection_offset?: number
    collection_offset?: number  // null = unpaid
    status: 'Scheduled' | 'Invoiced' | 'Paid' | 'Cancelled'
  }
  const invoiceSeeds: InvoiceSeed[] = [
    // Bank Migration — paid mostly on time (Big Bank fast-ish)
    { project_index: 0, invoice_number: 'INV-2025-001', amount: 12500, actual_issue_offset: -300, planned_collection_offset: -270, collection_offset: -268, status: 'Paid' },
    { project_index: 0, invoice_number: 'INV-2025-002', amount: 12500, actual_issue_offset: -210, planned_collection_offset: -180, collection_offset: -175, status: 'Paid' },
    { project_index: 0, invoice_number: 'INV-2025-003', amount: 12500, actual_issue_offset: -120, planned_collection_offset: -90, collection_offset: -82, status: 'Paid' },
    { project_index: 0, invoice_number: 'INV-2026-004', amount: 12500, actual_issue_offset: -30, planned_collection_offset: 0, expected_collection_offset: 5, status: 'Invoiced' },
    // Annual Audit — PaysOnTime client, all on time or early
    { project_index: 1, invoice_number: 'INV-2025-101', amount: 10000, actual_issue_offset: -240, planned_collection_offset: -225, collection_offset: -228, status: 'Paid' },
    { project_index: 1, invoice_number: 'INV-2025-102', amount: 10000, actual_issue_offset: -150, planned_collection_offset: -135, collection_offset: -136, status: 'Paid' },
    { project_index: 1, invoice_number: 'INV-2026-103', amount: 10000, actual_issue_offset: -45, planned_collection_offset: -30, collection_offset: -28, status: 'Paid' },
    // System Integration — AlwaysLate client, paid 15-30 days late
    { project_index: 2, invoice_number: 'INV-2025-201', amount: 20000, actual_issue_offset: -350, planned_collection_offset: -290, collection_offset: -260, status: 'Paid' },
    { project_index: 2, invoice_number: 'INV-2025-202', amount: 20000, actual_issue_offset: -250, planned_collection_offset: -190, collection_offset: -160, status: 'Paid' },
    { project_index: 2, invoice_number: 'INV-2025-203', amount: 20000, actual_issue_offset: -150, planned_collection_offset: -90, collection_offset: -68, status: 'Paid' },
    // ⚠ overdue: planned_collection in past, no collection_date
    { project_index: 2, invoice_number: 'INV-2026-204', amount: 20000, actual_issue_offset: -90, planned_collection_offset: -30, status: 'Invoiced' },
    // Compliance Review — Government slow but eventual
    { project_index: 3, invoice_number: 'INV-2026-301', amount: 13000, actual_issue_offset: -45, planned_collection_offset: 45, expected_collection_offset: 60, status: 'Invoiced' },
    { project_index: 3, invoice_number: 'INV-2026-302', amount: 13000, actual_issue_offset: -15, planned_collection_offset: 75, expected_collection_offset: 90, status: 'Scheduled' },
    // Quick Strategy — FastClient, paid same week
    { project_index: 4, invoice_number: 'INV-2026-401', amount: 7500, actual_issue_offset: -25, planned_collection_offset: -18, collection_offset: -17, status: 'Paid' },
    { project_index: 4, invoice_number: 'INV-2026-402', amount: 7500, actual_issue_offset: -10, planned_collection_offset: -3, collection_offset: -2, status: 'Paid' },
    // Q2 Initiative — Big Bank, future scheduled
    { project_index: 5, invoice_number: 'INV-2026-501', amount: 12500, actual_issue_offset: 5, planned_collection_offset: 35, expected_collection_offset: 35, status: 'Scheduled' },
    { project_index: 5, invoice_number: 'INV-2026-502', amount: 12500, actual_issue_offset: 60, planned_collection_offset: 90, expected_collection_offset: 90, status: 'Scheduled' },
    // Legacy Cleanup — AlwaysLate, multiple late + 1 overdue
    { project_index: 6, invoice_number: 'INV-2025-601', amount: 15000, actual_issue_offset: -340, planned_collection_offset: -280, collection_offset: -245, status: 'Paid' },
    { project_index: 6, invoice_number: 'INV-2025-602', amount: 15000, actual_issue_offset: -240, planned_collection_offset: -180, collection_offset: -148, status: 'Paid' },
    { project_index: 6, invoice_number: 'INV-2025-603', amount: 15000, actual_issue_offset: -150, planned_collection_offset: -90, collection_offset: -55, status: 'Paid' },
    // ⚠ overdue
    { project_index: 6, invoice_number: 'INV-2026-604', amount: 15000, actual_issue_offset: -75, planned_collection_offset: -15, status: 'Invoiced' },
    // Q3 Planning — PaysOnTime, future
    { project_index: 7, invoice_number: 'INV-2026-701', amount: 6700, actual_issue_offset: 35, planned_collection_offset: 50, expected_collection_offset: 50, status: 'Scheduled' },
    { project_index: 7, invoice_number: 'INV-2026-702', amount: 6700, actual_issue_offset: 65, planned_collection_offset: 80, expected_collection_offset: 80, status: 'Scheduled' },
    { project_index: 7, invoice_number: 'INV-2026-703', amount: 6600, actual_issue_offset: 95, planned_collection_offset: 110, expected_collection_offset: 110, status: 'Scheduled' },
    // ⚠ overdue extra: small one to make the count obvious
    { project_index: 4, invoice_number: 'INV-2026-403', amount: 2500, actual_issue_offset: -50, planned_collection_offset: -40, status: 'Invoiced' },
  ]

  // ----------------------------------------
  // Cost contracts (subko) — 4 contracts across 3 projects
  // ----------------------------------------
  const costContractSeeds = [
    { project_index: 0, contract_name: `${DEMO_TAG} Subko BankSpec`, beneficiary_name: 'BankSpec Sh.p.k.', modality: 'Contract' as const, status: 'Active' as const, value_no_taxes: 8000, value_with_taxes: 9600, wht_applicable: false, payment_days: 30 },
    { project_index: 2, contract_name: `${DEMO_TAG} Subko IntegrationCo`, beneficiary_name: 'IntegrationCo SH.A.', modality: 'Contract' as const, status: 'Active' as const, value_no_taxes: 18000, value_with_taxes: 21600, wht_applicable: true, payment_days: 60 },
    { project_index: 6, contract_name: `${DEMO_TAG} Subko LegacyHelp`, beneficiary_name: 'LegacyHelp Sh.p.k.', modality: 'PO' as const, status: 'Active' as const, value_no_taxes: 12000, value_with_taxes: 14400, wht_applicable: false, payment_days: 30 },
    { project_index: 3, contract_name: `${DEMO_TAG} Subko ComplianceLab`, beneficiary_name: 'ComplianceLab Sh.p.k.', modality: 'Contract' as const, status: 'Active' as const, value_no_taxes: 10000, value_with_taxes: 12000, wht_applicable: false, payment_days: 90 },
  ]

  // ----------------------------------------
  // Cost payments — distributed across cost contracts
  // ----------------------------------------
  type CostPaymentSeed = {
    contract_index: number
    receipt_number: string
    pct: number
    due_offset: number
    actual_offset?: number
    amount: number
    status: 'Scheduled' | 'Submitted' | 'Paid' | 'Cancelled'
  }
  const costPaymentSeeds: CostPaymentSeed[] = [
    // BankSpec
    { contract_index: 0, receipt_number: 'R-001', pct: 0.5, due_offset: -200, actual_offset: -195, amount: 4000, status: 'Paid' },
    { contract_index: 0, receipt_number: 'R-002', pct: 0.5, due_offset: -60, actual_offset: -58, amount: 4000, status: 'Paid' },
    // IntegrationCo (subko of late client; pay ourselves on time though)
    { contract_index: 1, receipt_number: 'R-101', pct: 0.4, due_offset: -250, actual_offset: -245, amount: 7200, status: 'Paid' },
    { contract_index: 1, receipt_number: 'R-102', pct: 0.4, due_offset: -120, actual_offset: -118, amount: 7200, status: 'Paid' },
    { contract_index: 1, receipt_number: 'R-103', pct: 0.2, due_offset: 20, amount: 3600, status: 'Scheduled' },
    // LegacyHelp
    { contract_index: 2, receipt_number: 'R-201', pct: 0.5, due_offset: -150, actual_offset: -148, amount: 6000, status: 'Paid' },
    { contract_index: 2, receipt_number: 'R-202', pct: 0.5, due_offset: 15, amount: 6000, status: 'Scheduled' },
    // ComplianceLab — upcoming payments
    { contract_index: 3, receipt_number: 'R-301', pct: 0.5, due_offset: 30, amount: 5000, status: 'Scheduled' },
    { contract_index: 3, receipt_number: 'R-302', pct: 0.5, due_offset: 90, amount: 5000, status: 'Scheduled' },
  ]

  // ----------------------------------------
  // People allocations — staff assigned to projects
  // ----------------------------------------
  type AllocSeed = {
    person_index: number
    project_index: number
    pct: number
    start_offset: number
    end_offset: number | null
    billable_rate?: number
  }
  const allocationSeeds: AllocSeed[] = [
    { person_index: 0, project_index: 0, pct: 0.6, start_offset: -100, end_offset: 30 },
    { person_index: 0, project_index: 5, pct: 0.4, start_offset: 0, end_offset: 150 },
    { person_index: 1, project_index: 1, pct: 1.0, start_offset: -75, end_offset: 60 },
    { person_index: 1, project_index: 7, pct: 0.5, start_offset: 30, end_offset: 150, billable_rate: 350 },
    { person_index: 2, project_index: 2, pct: 0.8, start_offset: -135, end_offset: 15 },
    { person_index: 2, project_index: 3, pct: 0.2, start_offset: -30, end_offset: 90 },
    { person_index: 3, project_index: 4, pct: 0.5, start_offset: -25, end_offset: 15 },
    { person_index: 3, project_index: 6, pct: 0.5, start_offset: -170, end_offset: -10 },
  ]

  return {
    businessLines,
    beneficiaries,
    projectManagers,
    clients,
    people,
    projectSeeds,
    invoiceSeeds,
    costContractSeeds,
    costPaymentSeeds,
    allocationSeeds,
    DEMO_TAG,
    DEMO_BL_PREFIX,
  }
}

export const SAMPLE_TAGS = { DEMO_TAG, DEMO_BL_PREFIX }
