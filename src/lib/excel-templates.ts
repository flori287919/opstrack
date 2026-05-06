import ExcelJS from 'exceljs'

export type ImportEntity =
  | 'business_lines'
  | 'beneficiaries'
  | 'project_managers'
  | 'clients'
  | 'people'
  | 'projects'
  | 'invoices'
  | 'cost_contracts'
  | 'cost_payments'
  | 'allocations'
  | 'timesheets'

type ColSpec = { header: string; width?: number; sample?: unknown; comment?: string }

const TEMPLATES: Record<ImportEntity, { sheetName: string; columns: ColSpec[]; sampleRows?: unknown[][] }> = {
  business_lines: {
    sheetName: 'Business Lines',
    columns: [
      { header: 'Kodi', width: 14, sample: 'IN' },
      { header: 'Emri', width: 30, sample: 'Internal' },
      { header: 'Përshkrim', width: 40 },
    ],
  },
  beneficiaries: {
    sheetName: 'Beneficiarët',
    columns: [
      { header: 'Emri', width: 30, sample: 'Beneficiary Name SH.A.' },
      { header: 'Vendi', width: 18, sample: 'Albania' },
      { header: 'Shënime', width: 40 },
    ],
  },
  project_managers: {
    sheetName: 'Project Managers',
    columns: [
      { header: 'Emri', width: 24, sample: 'Filan Fisteku' },
      { header: 'Email', width: 28, sample: 'pm@example.com' },
      { header: 'Roli', width: 16, sample: 'Senior PM', comment: 'Senior PM | PM | Junior PM | Other' },
    ],
  },
  clients: {
    sheetName: 'Klientët',
    columns: [
      { header: 'Emri', width: 30, sample: 'Big Client SH.A.' },
      { header: 'Vendi', width: 18, sample: 'Albania' },
      { header: 'Kontakt person', width: 24, sample: 'Filan Fisteku' },
      { header: 'Email', width: 28, sample: 'contact@bigclient.al' },
      { header: 'Telefon', width: 16, sample: '+355 69 1234567' },
      { header: 'Payment Terms (ditë)', width: 16, sample: 30 },
      { header: 'Modaliteti default', width: 14, sample: 'Contract', comment: 'Contract | PO' },
      { header: 'Shënime', width: 30 },
    ],
  },
  people: {
    sheetName: 'Stafi',
    columns: [
      { header: 'Emri', width: 24, sample: 'Filan Fisteku' },
      { header: 'Roli', width: 18, sample: 'Senior Consultant' },
      { header: 'Email', width: 28, sample: 'filan@example.com' },
      { header: 'Tipi', width: 12, sample: 'Salaried', comment: 'Salaried | Daily | Hourly' },
      { header: 'Pagë mujore (EUR)', width: 16, sample: 2000 },
      { header: 'Daily rate (EUR)', width: 16 },
      { header: 'Hourly rate (EUR)', width: 16 },
      { header: 'Billable daily rate (EUR)', width: 18, sample: 350 },
      { header: 'Start date', width: 14, sample: '2026-01-01' },
      { header: 'End date', width: 14 },
      { header: 'Shënime', width: 30 },
    ],
  },
  projects: {
    sheetName: 'Projektet',
    columns: [
      { header: 'Kodi', width: 14, sample: '1-IN-21' },
      { header: 'Emri', width: 36, sample: 'Demo Project' },
      { header: 'BL kodi', width: 12, sample: 'IN', comment: 'duhet të ekzistojë te Business Lines' },
      { header: 'Klient', width: 24, sample: 'Big Client SH.A.', comment: 'duhet të ekzistojë te Klientët' },
      { header: 'Beneficiary', width: 24, comment: 'opsionale; duhet të ekzistojë te Beneficiarët' },
      { header: 'Project Manager', width: 20, comment: 'opsionale; emri ekzakt nga PMs' },
      { header: 'Contract Start', width: 14, sample: '2026-01-15' },
      { header: 'Contract End', width: 14, sample: '2026-12-31' },
      { header: 'Project Start', width: 14 },
      { header: 'Planned End', width: 14 },
      { header: 'Modalitet', width: 12, sample: 'Contract', comment: 'Contract | PO' },
      { header: 'Vlera (pa VAT)', width: 16, sample: 50000 },
      { header: 'Submission Margin', width: 14, sample: 0.2, comment: 'p.sh. 0.2 për 20%' },
      { header: 'Payment Terms (ditë)', width: 16, sample: 30 },
      { header: 'Payment Terms (kushti)', width: 24 },
      { header: 'Shënime', width: 30 },
    ],
  },
  invoices: {
    sheetName: 'Faturat',
    columns: [
      { header: 'Project Code', width: 14, sample: '1-IN-21', comment: 'duhet të ekzistojë te Projektet' },
      { header: 'Invoice #', width: 14, sample: 'INV-001' },
      { header: 'Planned Issue', width: 14, sample: '2026-04-01' },
      { header: 'Actual Issue', width: 14 },
      { header: 'Planned Collection', width: 16, sample: '2026-05-01' },
      { header: 'Expected Collection', width: 16 },
      { header: 'Collection Date', width: 14, comment: 'plotësohet kur arkëtohet' },
      { header: 'Shuma (pa VAT)', width: 16, sample: 5000 },
      { header: 'Status', width: 12, sample: 'Scheduled', comment: 'Scheduled | Invoiced | Paid | Cancelled' },
      { header: 'Shënime', width: 30 },
    ],
  },
  cost_contracts: {
    sheetName: 'Kontratat',
    columns: [
      { header: 'Project Code', width: 14, sample: '1-IN-21', comment: 'duhet të ekzistojë te Projektet' },
      { header: 'Emri i kontratës', width: 30, sample: 'Subko X — Pjesa A' },
      { header: 'Subkontraktori', width: 24 },
      { header: 'Modalitet', width: 12, sample: 'Contract', comment: 'Contract | PO' },
      { header: 'Status', width: 12, sample: 'Active', comment: 'Active | Closed | Pending' },
      { header: 'Vlera pa taksa', width: 16, sample: 10000 },
      { header: 'Vlera me taksa', width: 16 },
      { header: 'Tax label', width: 14 },
      { header: 'WHT i aplikueshëm', width: 14, sample: 'Po', comment: 'Po | Jo' },
      { header: 'WHT Value', width: 14 },
      { header: 'Subco Payment (ditë)', width: 16, sample: 30 },
      { header: 'Payment Condition', width: 24 },
      { header: 'Shënime', width: 30 },
    ],
  },
  cost_payments: {
    sheetName: 'Pagesat',
    columns: [
      { header: 'Project Code', width: 14, sample: '1-IN-21' },
      { header: 'Emri i kontratës', width: 30, sample: 'Subko X — Pjesa A', comment: 'duhet të ekzistojë te Kontratat' },
      { header: 'Receipt #', width: 14, sample: 'R-001' },
      { header: '% e kontratës', width: 14, sample: 0.5 },
      { header: 'Invoice Expected', width: 16 },
      { header: 'Due Payment', width: 14, sample: '2026-05-15' },
      { header: 'Actual Payment', width: 14, comment: 'plotësohet kur paguhet' },
      { header: 'Amount', width: 14, sample: 5000 },
      { header: 'Cost no taxes', width: 14 },
      { header: 'WHT', width: 12 },
      { header: 'Status', width: 12, sample: 'Scheduled', comment: 'Scheduled | Submitted | Paid | Cancelled' },
      { header: 'Shënime', width: 30 },
    ],
  },
  allocations: {
    sheetName: 'Alokimet',
    columns: [
      { header: 'Project Code', width: 14, sample: '1-IN-21' },
      { header: 'Emri i personit', width: 24, sample: 'Filan Fisteku', comment: 'duhet të ekzistojë te Stafi' },
      { header: 'Start date', width: 14, sample: '2026-01-15' },
      { header: 'End date', width: 14 },
      { header: 'Allocation %', width: 14, sample: 1, comment: '1 = 100%, 0.5 = 50%' },
      { header: 'Billable daily rate', width: 16, comment: 'opsionale, mbingarkon default-in e personit' },
      { header: 'Shënime', width: 30 },
    ],
  },
  timesheets: {
    sheetName: 'Timesheets',
    columns: [
      { header: 'Project Code', width: 14, sample: '1-IN-21' },
      { header: 'Emri i personit', width: 24, sample: 'Filan Fisteku' },
      { header: 'Data', width: 14, sample: '2026-04-15' },
      { header: 'Orë', width: 10, sample: 8 },
      { header: 'Përshkrim', width: 30 },
    ],
  },
}

export async function generateTemplate(entity: ImportEntity): Promise<ArrayBuffer> {
  const spec = TEMPLATES[entity]
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(spec.sheetName)

  ws.columns = spec.columns.map((c) => ({ header: c.header, key: c.header, width: c.width ?? 14 }))

  // Sample row to make required formats obvious
  const hasSample = spec.columns.some((c) => c.sample !== undefined)
  if (hasSample) {
    const row: Record<string, unknown> = {}
    for (const c of spec.columns) {
      if (c.sample !== undefined) row[c.header] = c.sample
    }
    ws.addRow(row)
  }

  // Header styling
  const header = ws.getRow(1)
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF305496' } }
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.alignment = { vertical: 'middle' }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  // Comments on header cells (Excel cell comments)
  spec.columns.forEach((c, i) => {
    if (c.comment) {
      header.getCell(i + 1).note = { texts: [{ text: c.comment }] }
    }
  })

  return await wb.xlsx.writeBuffer()
}

export const ENTITY_FILE_PREFIX: Record<ImportEntity, string> = {
  business_lines: 'business-lines',
  beneficiaries: 'beneficiaret',
  project_managers: 'project-managers',
  clients: 'klientet',
  people: 'stafi',
  projects: 'projektet',
  invoices: 'faturat',
  cost_contracts: 'kontratat',
  cost_payments: 'pagesat',
  allocations: 'alokimet',
  timesheets: 'timesheets',
}
