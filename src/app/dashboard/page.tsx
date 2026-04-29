import { createClient } from '@/lib/supabase/server'

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

export default async function DashboardHome() {
  const supabase = await createClient()

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const todayISO = today.toISOString().slice(0, 10)
  const weekISO = startOfWeek.toISOString().slice(0, 10)
  const monthISO = startOfMonth.toISOString().slice(0, 10)

  const [overdueRes, weekCollectionRes, weekPaymentRes, todayInvoicesRes] =
    await Promise.all([
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

      <section className="bg-white border border-slate-200 rounded-xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-medium text-slate-900">Alarme me prioritet</h2>
        </div>
        <div className="p-6 text-sm text-slate-500">
          {overdueCount === 0
            ? 'Asnjë alarm aktiv — të gjitha faturat brenda termit.'
            : `${overdueCount} fatura të papaguara kanë kaluar datën e arkëtimit. Hap "Faturat" për listën e plotë.`}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-medium text-slate-900 mb-2">
            Cash Flow 30 ditët e ardhshme
          </h3>
          <p className="text-sm text-slate-500">
            Grafik i hyrjeve dhe daljeve të pritshme bazuar në datat e faturave dhe pagesave të planifikuara.
            <br />
            <em className="text-slate-400">Vjen me të dhëna reale pas hyrjes së parë.</em>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-medium text-slate-900 mb-2">Faturim vs Arkëtim — 12 muajt e fundit</h3>
          <p className="text-sm text-slate-500">
            Krahasim mujor i faturave të lëshuara me arkëtimet aktuale.
            <br />
            <em className="text-slate-400">Vjen me të dhëna reale pas hyrjes së parë.</em>
          </p>
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
      <div className="text-xs uppercase tracking-wide font-medium opacity-70">
        {kpi.label}
      </div>
      <div className="text-3xl font-semibold mt-1">{kpi.value}</div>
      {kpi.hint && (
        <div className="text-xs mt-1 opacity-70">{kpi.hint}</div>
      )}
    </div>
  )
}
