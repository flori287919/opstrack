import { createClient } from '@/lib/supabase/server'
import { CashFlowChart, InvoicingVsCollectionChart, CashFlowPoint, MonthlyPoint } from './Charts'

type KPI = {
  label: string
  value: string
  hint?: string
  emphasis?: 'red' | 'green' | 'amber' | 'slate'
}

function formatEUR(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

function isoDay(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

function isoMonthStart(monthsAgo: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  const months = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj']
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

export default async function DashboardHome() {
  const supabase = await createClient()

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const todayISO = today.toISOString().slice(0, 10)
  const weekISO = startOfWeek.toISOString().slice(0, 10)
  const next30 = isoDay(30)
  const start12mo = isoMonthStart(11)

  const [
    overdueRes,
    weekCollectionRes,
    weekPaymentRes,
    todayInvoicesRes,
    cashInRes,
    cashOutRes,
    last12moRes,
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('amount_no_vat, planned_collection_date, collection_date')
      .is('deleted_at', null)
      .lt('planned_collection_date', todayISO)
      .is('collection_date', null),
    supabase
      .from('invoices')
      .select('amount_no_vat')
      .is('deleted_at', null)
      .gte('planned_collection_date', weekISO)
      .lte('planned_collection_date', todayISO),
    supabase
      .from('cost_payments')
      .select('amount')
      .is('deleted_at', null)
      .gte('due_payment_date', weekISO)
      .lte('due_payment_date', todayISO),
    supabase
      .from('invoices')
      .select('id, amount_no_vat')
      .is('deleted_at', null)
      .eq('actual_issue_date', todayISO),
    supabase
      .from('invoices')
      .select('amount_no_vat, expected_collection_date, planned_collection_date')
      .is('deleted_at', null)
      .is('collection_date', null)
      .or(`expected_collection_date.gte.${todayISO},planned_collection_date.gte.${todayISO}`)
      .or(`expected_collection_date.lte.${next30},planned_collection_date.lte.${next30}`),
    supabase
      .from('cost_payments')
      .select('amount, due_payment_date')
      .is('deleted_at', null)
      .is('actual_payment_date', null)
      .gte('due_payment_date', todayISO)
      .lte('due_payment_date', next30),
    supabase
      .from('invoices')
      .select('amount_no_vat, actual_issue_date, collection_date')
      .is('deleted_at', null)
      .or(`actual_issue_date.gte.${start12mo},collection_date.gte.${start12mo}`),
  ])

  const overdueAmount = (overdueRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount_no_vat || 0),
    0
  )
  const overdueCount = overdueRes.data?.length ?? 0
  const weekCollection = (weekCollectionRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount_no_vat || 0),
    0
  )
  const weekPayments = (weekPaymentRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  )
  const todayCount = todayInvoicesRes.data?.length ?? 0
  const todayAmount = (todayInvoicesRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount_no_vat || 0),
    0
  )

  // Cash flow forecast (next 30 days)
  const cashFlow: Record<string, CashFlowPoint> = {}
  for (let i = 0; i <= 30; i++) {
    const d = isoDay(i)
    cashFlow[d] = { date: d.slice(5), incoming: 0, outgoing: 0 }
  }
  for (const inv of cashInRes.data ?? []) {
    const d = inv.expected_collection_date || inv.planned_collection_date
    if (d && cashFlow[d]) cashFlow[d].incoming += Number(inv.amount_no_vat || 0)
  }
  for (const pay of cashOutRes.data ?? []) {
    if (pay.due_payment_date && cashFlow[pay.due_payment_date]) {
      cashFlow[pay.due_payment_date].outgoing += Number(pay.amount || 0)
    }
  }
  const cashFlowData = Object.values(cashFlow)

  // Monthly invoicing vs collection (last 12 months)
  const months: Record<string, MonthlyPoint> = {}
  for (let i = 11; i >= 0; i--) {
    const m = isoMonthStart(i).slice(0, 7)
    months[m] = { month: monthLabel(m), invoiced: 0, collected: 0 }
  }
  for (const inv of last12moRes.data ?? []) {
    if (inv.actual_issue_date) {
      const m = inv.actual_issue_date.slice(0, 7)
      if (months[m]) months[m].invoiced += Number(inv.amount_no_vat || 0)
    }
    if (inv.collection_date) {
      const m = inv.collection_date.slice(0, 7)
      if (months[m]) months[m].collected += Number(inv.amount_no_vat || 0)
    }
  }
  const monthlyData = Object.values(months)

  const kpis: KPI[] = [
    {
      label: 'Fatura overdue',
      value: formatEUR(overdueAmount),
      hint: `${overdueCount} fatura të vonuara`,
      emphasis: 'red',
    },
    {
      label: 'Faturat e ditës',
      value: String(todayCount),
      hint: formatEUR(todayAmount),
      emphasis: 'slate',
    },
    {
      label: 'Arkëtimi i javës',
      value: formatEUR(weekCollection),
      hint: 'Pritet sipas planit',
      emphasis: 'green',
    },
    {
      label: 'Detyrimi i javës',
      value: formatEUR(weekPayments),
      hint: 'Pagesa subko të skeduluara',
      emphasis: 'amber',
    },
  ]

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Pamje e shpejtë e operacioneve sot — {today.toLocaleDateString('sq-AL')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <KPICard key={k.label} kpi={k} />
        ))}
      </div>

      <section className="bg-white border border-slate-200 rounded-xl mb-6">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-medium text-slate-900">Alarme me prioritet</h2>
        </div>
        <div className="p-6 text-sm text-slate-500">
          {overdueCount === 0
            ? 'Asnjë alarm aktiv — të gjitha faturat brenda termit.'
            : `${overdueCount} fatura të papaguara kanë kaluar datën e arkëtimit. Hap "Faturat" për listën e plotë.`}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-medium text-slate-900 mb-4">Cash Flow 30 ditët e ardhshme</h3>
          <CashFlowChart data={cashFlowData} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-medium text-slate-900 mb-4">Faturim vs Arkëtim — 12 muaj</h3>
          <InvoicingVsCollectionChart data={monthlyData} />
        </div>
      </section>
    </div>
  )
}

function KPICard({ kpi }: { kpi: KPI }) {
  const colors = {
    red: 'text-red-700 bg-red-50 border-red-200',
    green: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    slate: 'text-slate-700 bg-white border-slate-200',
  }
  const cls = colors[kpi.emphasis ?? 'slate']
  return (
    <div className={`rounded-xl border p-5 ${cls}`}>
      <div className="text-xs uppercase tracking-wide font-medium opacity-70">{kpi.label}</div>
      <div className="text-3xl font-semibold mt-1">{kpi.value}</div>
      {kpi.hint && <div className="text-xs mt-1 opacity-70">{kpi.hint}</div>}
    </div>
  )
}
