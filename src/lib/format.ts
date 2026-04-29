export function formatEUR(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(v)
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('sq-AL')
  } catch {
    return d
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
