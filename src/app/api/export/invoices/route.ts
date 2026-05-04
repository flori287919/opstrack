import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: invoices } = await supabase
    .from('invoices')
    .select(
      'invoice_number, planned_issue_date, actual_issue_date, planned_collection_date, expected_collection_date, collection_date, amount_no_vat, vat_rate, status, notes, project:projects(project_code, name, client:clients(name)), deliverable:deliverables(code, name)'
    )
    .is('deleted_at', null)
    .order('actual_issue_date', { ascending: false, nullsFirst: false })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Faturat')

  ws.columns = [
    { header: 'Invoice #', key: 'invoice_number', width: 14 },
    { header: 'Project Code', key: 'project_code', width: 14 },
    { header: 'Project', key: 'project_name', width: 30 },
    { header: 'Klient', key: 'client', width: 24 },
    { header: 'Deliverable', key: 'deliverable', width: 24 },
    { header: 'Planned Issue', key: 'planned_issue_date', width: 14 },
    { header: 'Actual Issue', key: 'actual_issue_date', width: 14 },
    { header: 'Planned Collection', key: 'planned_collection_date', width: 16 },
    { header: 'Expected Collection', key: 'expected_collection_date', width: 16 },
    { header: 'Collection Date', key: 'collection_date', width: 14 },
    { header: 'Shuma (pa VAT)', key: 'amount_no_vat', width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Shënime', key: 'notes', width: 30 },
  ]

  for (const inv of invoices ?? []) {
    const project = Array.isArray(inv.project) ? inv.project[0] : inv.project
    const client = project ? (Array.isArray(project.client) ? project.client[0] : project.client) : null
    const deliverable = Array.isArray(inv.deliverable) ? inv.deliverable[0] : inv.deliverable
    ws.addRow({
      ...inv,
      project_code: project?.project_code ?? '',
      project_name: project?.name ?? '',
      client: client?.name ?? '',
      deliverable: deliverable ? `${deliverable.code} — ${deliverable.name}` : '',
    })
  }

  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF305496' } }
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `faturat_${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
