import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  CashFlowChart,
  InvoicingVsCollectionChart,
  TopClientsChart,
  CashFlowPoint,
  MonthlyPoint,
  ClientDeltaPoint,
} from './Charts'
import { computeProjectPeopleCost, type Person, type Allocation, type Timesheet } from '@/lib/people-cost'
import { getDictionary, hasLocale } from '../dictionaries'

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

function monthLabel(yyyymm: string, locale: string): string {
  const [y, m] = yyyymm.split('-')
  const monthsSq = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj']
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const months = locale === 'en' ? monthsEn : monthsSq
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

export default async function DashboardHome({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const supabase = await createClient()

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const todayISO = today.toISOString().slice(0, 10)
  const weekISO = startOfWeek.toISOString().slice(0, 10)
  const next30 = isoDay(30)
  const start12mo = isoMonthStart(11)

  const monthStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const monthStartISO = monthStartDate.toISOString().slice(0, 10)
  const monthEndISO = monthEndDate.toISOString().slice(0, 10)

  const [
    overdueRes,
    weekCollectionRes,
    weekPaymentRes,
    totalLiabilityRes,
    todayInvoicesRes,
    cashInRes,
    cashOutRes,
    last12moRes,
    peopleRes,
    monthAllocationsRes,
    monthTimesheetsRes,
    topClientsRes,
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
      .from('cost_payments')
      .select('amount')
      .is('deleted_at', null)
      .is('actual_payment_date', null),
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
    supabase
      .from('people')
      .select('id, name, employment_type, monthly_salary, daily_rate, hourly_rate, default_billable_daily_rate')
      .is('deleted_at', null),
    supabase
      .from('people_allocations')
      .select('id, person_id, project_id, allocation_pct, start_date, end_date, billable_daily_rate')
      .is('deleted_at', null)
      .lte('start_date', monthEndISO)
      .or(`end_date.is.null,end_date.gte.${monthStartISO}`),
    supabase
      .from('timesheets')
      .select('person_id, project_id, date, hours')
      .is('deleted_at', null)
      .gte('date', monthStartISO)
      .lte('date', monthEndISO),
    supabase
      .from('invoices')
      .select(
        'amount_no_vat, planned_collection_date, collection_date, project:projects(client:clients(id, name))'
      )
      .is('deleted_at', null)
      .not('collection_date', 'is', null)
      .not('planned_collection_date', 'is', null)
      .gte('collection_date', start12mo),
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
  const totalLiability = (totalLiabilityRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  )
  const totalLiabilityCount = totalLiabilityRes.data?.length ?? 0
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
    months[m] = { month: monthLabel(m, lang), invoiced: 0, collected: 0 }
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

  // People cost — current month, summed across all active projects
  const peopleList: Person[] = (peopleRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    employment_type: p.employment_type as Person['employment_type'],
    monthly_salary: p.monthly_salary != null ? Number(p.monthly_salary) : null,
    daily_rate: p.daily_rate != null ? Number(p.daily_rate) : null,
    hourly_rate: p.hourly_rate != null ? Number(p.hourly_rate) : null,
    default_billable_daily_rate:
      p.default_billable_daily_rate != null ? Number(p.default_billable_daily_rate) : null,
  }))
  const allocList: Allocation[] = (monthAllocationsRes.data ?? []).map((a) => ({
    id: a.id,
    person_id: a.person_id,
    project_id: a.project_id,
    allocation_pct: Number(a.allocation_pct),
    start_date: a.start_date,
    end_date: a.end_date,
    billable_daily_rate: a.billable_daily_rate != null ? Number(a.billable_daily_rate) : null,
  }))
  const timesheetList: Timesheet[] = (monthTimesheetsRes.data ?? []).map((t) => ({
    person_id: t.person_id,
    project_id: t.project_id,
    date: t.date,
    hours: Number(t.hours),
  }))

  // Top 10 clients by Collection Delta — paid invoices in last 12 months
  type ClientAgg = { name: string; deltaSum: number; count: number; total: number }
  const clientAgg: Record<string, ClientAgg> = {}
  for (const inv of topClientsRes.data ?? []) {
    const project = Array.isArray(inv.project) ? inv.project[0] : inv.project
    const client = project ? (Array.isArray(project.client) ? project.client[0] : project.client) : null
    if (!client?.id || !client.name) continue
    if (!inv.collection_date || !inv.planned_collection_date) continue
    const planned = new Date(inv.planned_collection_date)
    const actual = new Date(inv.collection_date)
    const delta = Math.round((actual.getTime() - planned.getTime()) / 86_400_000)
    const entry = clientAgg[client.id] ?? (clientAgg[client.id] = { name: client.name, deltaSum: 0, count: 0, total: 0 })
    entry.deltaSum += delta
    entry.count += 1
    entry.total += Number(inv.amount_no_vat || 0)
  }
  const topClientsData: ClientDeltaPoint[] = Object.values(clientAgg)
    .map((c) => ({
      client: c.name,
      avgDelta: Math.round(c.deltaSum / c.count),
      invoices: c.count,
      totalAmount: c.total,
    }))
    .sort((a, b) => b.avgDelta - a.avgDelta)
    .slice(0, 10)

  const projectIds = Array.from(new Set(allocList.map((a) => a.project_id)))
  let monthPeopleCost = 0
  for (const pid of projectIds) {
    const r = computeProjectPeopleCost({
      fromIso: monthStartISO,
      toIso: monthEndISO,
      people: peopleList,
      allocations: allocList,
      timesheets: timesheetList,
      projectId: pid,
    })
    monthPeopleCost += r.cost
  }

  const kpis: KPI[] = [
    {
      label: t.dashboard.kpi.overdue,
      value: formatEUR(overdueAmount),
      hint: t.dashboard.kpi.overdueHint.replace('{count}', String(overdueCount)),
      emphasis: 'red',
    },
    {
      label: t.dashboard.kpi.todayInvoices,
      value: String(todayCount),
      hint: formatEUR(todayAmount),
      emphasis: 'slate',
    },
    {
      label: t.dashboard.kpi.weekCollection,
      value: formatEUR(weekCollection),
      hint: t.dashboard.kpi.weekCollectionHint,
      emphasis: 'green',
    },
    {
      label: t.dashboard.kpi.weekLiability,
      value: formatEUR(weekPayments),
      hint: t.dashboard.kpi.weekLiabilityHint,
      emphasis: 'amber',
    },
    {
      label: t.dashboard.kpi.totalLiability,
      value: formatEUR(totalLiability),
      hint: t.dashboard.kpi.totalLiabilityHint.replace('{count}', String(totalLiabilityCount)),
      emphasis: 'amber',
    },
    {
      label: t.dashboard.kpi.monthPeopleCost,
      value: formatEUR(monthPeopleCost),
      hint: t.dashboard.kpi.monthPeopleCostHint.replace('{count}', String(peopleList.length)),
      emphasis: 'slate',
    },
  ]

  const localeTag = lang === 'en' ? 'en-US' : 'sq-AL'

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t.nav.dashboard}</h1>
        <p className="text-sm text-slate-500">
          {t.dashboard.subtitle} — {today.toLocaleDateString(localeTag)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {kpis.map((k) => (
          <KPICard key={k.label} kpi={k} />
        ))}
      </div>

      <section className="bg-white border border-slate-200 rounded-xl mb-6">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-medium text-slate-900">{t.dashboard.alarms}</h2>
        </div>
        <div className="p-6 text-sm text-slate-500">
          {overdueCount === 0
            ? t.dashboard.noAlarms
            : t.dashboard.overdueMessage.replace('{count}', String(overdueCount))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-medium text-slate-900 mb-4">{t.dashboard.cashFlow30}</h3>
          <CashFlowChart data={cashFlowData} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-medium text-slate-900 mb-4">{t.dashboard.invoicingVsCollection}</h3>
          <InvoicingVsCollectionChart data={monthlyData} />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-medium text-slate-900 mb-1">{t.dashboard.topClientsTitle}</h3>
        <p className="text-xs text-slate-500 mb-4">{t.dashboard.topClientsSubtitle}</p>
        <TopClientsChart
          data={topClientsData}
          labels={{
            empty: t.dashboard.topClientsEmpty,
            invoicesCount: t.dashboard.topClientsInvoicesCount,
            totalAmount: t.dashboard.topClientsTotalAmount,
            daysLate: t.dashboard.topClientsDaysLate,
            daysEarly: t.dashboard.topClientsDaysEarly,
            avgDelta: t.dashboard.topClientsAvgDelta,
          }}
        />
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
