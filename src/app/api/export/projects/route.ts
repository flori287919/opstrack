import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: projects } = await supabase
    .from('projects')
    .select(
      'project_code, name, contract_start_date, contract_end_date, project_start_date, planned_end_date, modality, project_value_no_vat, vat_rate, submission_profit_margin, client_payment_terms_days, payment_terms_condition, project_approval_form, project_charter, approved_cost_sheets, notes, bl:business_lines(code, name), client:clients(name), beneficiary:beneficiaries(name), project_manager:project_managers(name)'
    )
    .is('deleted_at', null)
    .order('project_code')

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Projektet')

  ws.columns = [
    { header: 'Kodi', key: 'project_code', width: 14 },
    { header: 'Emri', key: 'name', width: 36 },
    { header: 'BL', key: 'bl', width: 12 },
    { header: 'Klient', key: 'client', width: 24 },
    { header: 'Beneficiary', key: 'beneficiary', width: 24 },
    { header: 'Project Manager', key: 'pm', width: 20 },
    { header: 'Contract Start', key: 'contract_start_date', width: 14 },
    { header: 'Contract End', key: 'contract_end_date', width: 14 },
    { header: 'Project Start', key: 'project_start_date', width: 14 },
    { header: 'Planned End', key: 'planned_end_date', width: 14 },
    { header: 'Modalitet', key: 'modality', width: 12 },
    { header: 'Vlera (pa VAT)', key: 'project_value_no_vat', width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'Submission Margin %', key: 'submission_profit_margin', width: 16, style: { numFmt: '0.00%' } },
    { header: 'Payment Terms (ditë)', key: 'client_payment_terms_days', width: 16 },
    { header: 'Payment Terms (kushti)', key: 'payment_terms_condition', width: 24 },
    { header: 'Project Approval', key: 'project_approval_form', width: 14 },
    { header: 'Project Charter', key: 'project_charter', width: 14 },
    { header: 'Approved Cost Sheets', key: 'approved_cost_sheets', width: 16 },
    { header: 'Shënime', key: 'notes', width: 30 },
  ]

  for (const p of projects ?? []) {
    const bl = Array.isArray(p.bl) ? p.bl[0] : p.bl
    const client = Array.isArray(p.client) ? p.client[0] : p.client
    const beneficiary = Array.isArray(p.beneficiary) ? p.beneficiary[0] : p.beneficiary
    const pm = Array.isArray(p.project_manager) ? p.project_manager[0] : p.project_manager
    ws.addRow({
      ...p,
      bl: bl ? `${bl.code} — ${bl.name}` : '',
      client: client?.name ?? '',
      beneficiary: beneficiary?.name ?? '',
      pm: pm?.name ?? '',
    })
  }

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF305496' } }
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `projektet_${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
