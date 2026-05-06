import type { Allocation, Person, Timesheet } from '@/lib/people-cost'

let counter = 0
const nextId = () => `00000000-0000-0000-0000-${String(++counter).padStart(12, '0')}`

export function resetFixtureIds() {
  counter = 0
}

// ----------------------------------------
// Identity
// ----------------------------------------

export type TestOrg = { id: string; name: string; slug: string }
export function makeOrg(overrides: Partial<TestOrg> = {}): TestOrg {
  return { id: nextId(), name: 'Acme Consulting', slug: 'acme', ...overrides }
}

export type TestUser = { id: string; email: string; password: string }
export function makeUser(overrides: Partial<TestUser> = {}): TestUser {
  return { id: nextId(), email: 'director@acme.test', password: 'TestPass123!', ...overrides }
}

// ----------------------------------------
// People
// ----------------------------------------

export function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: nextId(),
    name: 'Alice Salaried',
    employment_type: 'Salaried',
    monthly_salary: 2000,
    daily_rate: null,
    hourly_rate: null,
    default_billable_daily_rate: 250,
    ...overrides,
  }
}

export function makeAllocation(overrides: Partial<Allocation> = {}): Allocation {
  return {
    id: nextId(),
    person_id: nextId(),
    project_id: nextId(),
    allocation_pct: 1,
    start_date: '2026-01-01',
    end_date: null,
    billable_daily_rate: null,
    ...overrides,
  }
}

export function makeTimesheet(overrides: Partial<Timesheet> = {}): Timesheet {
  return {
    person_id: nextId(),
    project_id: nextId(),
    date: '2026-05-01',
    hours: 8,
    ...overrides,
  }
}

// ----------------------------------------
// Domain rows (DB-shaped, used by integration tests / mocked Supabase)
// ----------------------------------------

export type TestClient = {
  id: string
  org_id: string
  name: string
  payment_terms_days: number
  default_modality: 'Contract' | 'PO' | null
  deleted_at: string | null
}
export function makeClient(overrides: Partial<TestClient> = {}): TestClient {
  return {
    id: nextId(),
    org_id: nextId(),
    name: 'Big Client SH.A.',
    payment_terms_days: 30,
    default_modality: 'Contract',
    deleted_at: null,
    ...overrides,
  }
}

export type TestProject = {
  id: string
  org_id: string
  project_code: string
  name: string
  client_id: string | null
  project_value_no_vat: number
  client_payment_terms_days: number
  deleted_at: string | null
}
export function makeProject(overrides: Partial<TestProject> = {}): TestProject {
  return {
    id: nextId(),
    org_id: nextId(),
    project_code: '1-IN-21',
    name: 'Test Project',
    client_id: null,
    project_value_no_vat: 10000,
    client_payment_terms_days: 30,
    deleted_at: null,
    ...overrides,
  }
}

export type TestInvoice = {
  id: string
  org_id: string
  project_id: string
  invoice_number: string | null
  planned_collection_date: string | null
  expected_collection_date: string | null
  collection_date: string | null
  amount_no_vat: number
  status: 'Scheduled' | 'Invoiced' | 'Paid' | 'Cancelled'
  deleted_at: string | null
}
export function makeInvoice(overrides: Partial<TestInvoice> = {}): TestInvoice {
  return {
    id: nextId(),
    org_id: nextId(),
    project_id: nextId(),
    invoice_number: 'INV-001',
    planned_collection_date: '2026-04-01',
    expected_collection_date: null,
    collection_date: null,
    amount_no_vat: 5000,
    status: 'Scheduled',
    deleted_at: null,
    ...overrides,
  }
}

// Convenience: build a small consistent scenario (org + 2 clients + 2 projects + invoices)
export function buildScenario() {
  resetFixtureIds()
  const org = makeOrg()
  const user = makeUser()
  const fastClient = makeClient({ org_id: org.id, name: 'PaysOnTime LLC', payment_terms_days: 15 })
  const slowClient = makeClient({ org_id: org.id, name: 'AlwaysLate SH.A.', payment_terms_days: 60 })
  const fastProject = makeProject({ org_id: org.id, client_id: fastClient.id, project_code: '1-FAST-01' })
  const slowProject = makeProject({ org_id: org.id, client_id: slowClient.id, project_code: '1-SLOW-01' })
  const onTimePaid = makeInvoice({
    org_id: org.id,
    project_id: fastProject.id,
    invoice_number: 'INV-100',
    planned_collection_date: '2026-04-01',
    collection_date: '2026-04-01',
    status: 'Paid',
    amount_no_vat: 1000,
  })
  const latePaid = makeInvoice({
    org_id: org.id,
    project_id: slowProject.id,
    invoice_number: 'INV-200',
    planned_collection_date: '2026-04-01',
    collection_date: '2026-04-15',
    status: 'Paid',
    amount_no_vat: 2000,
  })
  const overdueOpen = makeInvoice({
    org_id: org.id,
    project_id: slowProject.id,
    invoice_number: 'INV-201',
    planned_collection_date: '2026-04-01',
    collection_date: null,
    status: 'Invoiced',
    amount_no_vat: 3000,
  })
  return {
    org,
    user,
    clients: { fast: fastClient, slow: slowClient },
    projects: { fast: fastProject, slow: slowProject },
    invoices: { onTimePaid, latePaid, overdueOpen },
  }
}
