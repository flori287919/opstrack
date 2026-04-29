import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: contracts } = await supabase
    .from('cost_contracts')
    .select(
      'contract_name, beneficiary_name, modality, status, contract_value_no_taxes, contract_value_with_taxes, tax_label, wht_value, subco_payment_terms_days, subco_payment_terms_condition, notes, project:projects(project_code, name)'
    )
    .is('deleted_at', null)

  const wb = new ExcelJS.Workbook()
  const wsContracts = wb.addWorksheet('Kontratat')
  wsContracts.columns = [
    { header: 'Kontrata', key: 'contract_name', width: 30 },
    { header: 'Subko (Beneficiary)', key: 'beneficiary_name', width: 24 },
    { header: 'Project Code', key: 'project_code', width: 14 },
    { header: 'Project', key: 'project_name', width: 30 },
    { header: 'Modalitet', key: 'modality', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Vlera (pa taksa)', key: 'contract_value_no_taxes', width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'Vlera (me taksa)', key: 'contract_value_with_taxes', width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'Tax', key: 'tax_label', width: 14 },
    { header: 'WHT', key: 'wht_value', width: 12, style: { numFmt: '#,##0.00' } },
    { header: 'Payment Terms (ditë)', key: 'subco_payment_terms_days', width: 16 },
    { header: 'Payment Terms (kushti)', key: 'subco_payment_terms_condition', width: 22 },
    { header: 'Shënime', key: 'notes', width: 30 },
  ]
  for (const c of contracts ?? []) {
    const project = Array.isArray(c.project) ? c.project[0] : c.project
    wsContracts.addRow({
      ...c,
      project_code: project?.project_code ?? '',
      project_name: project?.name ?? '',
    })
  }
  wsContracts.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF305496' } }
  wsContracts.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  wsContracts.views = [{ state: 'frozen', ySplit: 1 }]

  // Payments sheet
  const { data: payments } = await supabase
    .from('cost_payments')
    .select(
      'receipt_number, payment_schedule_pct, invoice_expected_date, due_payment_date, actual_payment_date, amount, cost_no_taxes, wht, status, notes, contract:cost_contracts(contract_name, beneficiary_name, project:projects(project_code))'
    )
    .is('deleted_at', null)
    .order('due_payment_date', { ascending: false, nullsFirst: false })

  const wsPayments = wb.addWorksheet('Pagesat')
  wsPayments.columns = [
    { header: 'Receipt #', key: 'receipt_number', width: 14 },
    { header: 'Project', key: 'project_code', width: 14 },
    { header: 'Subko', key: 'beneficiary_name', width: 24 },
    { header: 'Kontrata', key: 'contract_name', width: 30 },
    { header: 'Schedule %', key: 'payment_schedule_pct', width: 12, style: { numFmt: '0.00%' } },
    { header: 'Expected Date', key: 'invoice_expected_date', width: 14 },
    { header: 'Due Date', key: 'due_payment_date', width: 14 },
    { header: 'Actual Payment', key: 'actual_payment_date', width: 14 },
    { header: 'Shuma', key: 'amount', width: 14, style: { numFmt: '#,##0.00' } },
    { header: 'Cost (pa taksa)', key: 'cost_no_taxes', width: 14, style: { numFmt: '#,##0.00' } },
    { header: 'WHT', key: 'wht', width: 12, style: { numFmt: '#,##0.00' } },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Shënime', key: 'notes', width: 30 },
  ]
  for (const p of payments ?? []) {
    const contract = Array.isArray(p.contract) ? p.contract[0] : p.contract
    const project = contract ? (Array.isArray(contract.project) ? contract.project[0] : contract.project) : null
    wsPayments.addRow({
      ...p,
      contract_name: contract?.contract_name ?? '',
      beneficiary_name: contract?.beneficiary_name ?? '',
      project_code: project?.project_code ?? '',
    })
  }
  wsPayments.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF305496' } }
  wsPayments.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  wsPayments.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `kostot_${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
