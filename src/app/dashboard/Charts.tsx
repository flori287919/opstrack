'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
} from 'recharts'

export type CashFlowPoint = {
  date: string
  incoming: number
  outgoing: number
}

export type MonthlyPoint = {
  month: string
  invoiced: number
  collected: number
}

const formatEUR = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Pa të dhëna akoma. Krijo fatura me &ldquo;Expected Collection Date&rdquo; ose pagesa me &ldquo;Due Payment Date&rdquo; në 30 ditët e ardhshme.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip formatter={(v) => formatEUR(Number(v ?? 0))} contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="incoming" name="Hyrje" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="outgoing" name="Dalje" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="incoming" stroke="#10b981" dot={false} legendType="none" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function InvoicingVsCollectionChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Pa të dhëna akoma. Krijo fatura me &ldquo;Actual Issue Date&rdquo; dhe &ldquo;Collection Date&rdquo;.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip formatter={(v) => formatEUR(Number(v ?? 0))} contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="invoiced" name="Faturuar" fill="#0f172a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="collected" name="Arkëtuar" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
