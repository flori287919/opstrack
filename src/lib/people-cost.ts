export type Person = {
  id: string
  name: string
  employment_type: 'Salaried' | 'Daily' | 'Hourly'
  monthly_salary: number | null
  daily_rate: number | null
  hourly_rate: number | null
  default_billable_daily_rate: number | null
}

export type Allocation = {
  id: string
  person_id: string
  project_id: string
  allocation_pct: number
  start_date: string
  end_date: string | null
  billable_daily_rate: number | null
}

export type Timesheet = {
  person_id: string
  project_id: string
  date: string
  hours: number
}

function workingDaysInRange(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + 'T00:00:00Z')
  const to = new Date(toIso + 'T00:00:00Z')
  if (to < from) return 0
  let days = 0
  const cur = new Date(from)
  while (cur <= to) {
    const dow = cur.getUTCDay()
    if (dow !== 0 && dow !== 6) days++
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function maxIso(a: string, b: string): string {
  return a > b ? a : b
}

function minIso(a: string, b: string): string {
  return a < b ? a : b
}

/**
 * Llogarit koston e punës (kosto + sa faturohet) për një projekt brenda
 * një intervali datash. Përdor:
 *  - Salaried → pagë mujore × allocation_pct, prorated me ditët kalendarike të mbuluara
 *  - Daily → ditët e punës (Mon–Fri) × daily_rate × allocation_pct
 *  - Hourly → shuma e orëve × hourly_rate (timesheet i vërtetë)
 *
 * billable: ditët e punës × allocation_pct × billable_daily_rate
 */
export function computeProjectPeopleCost(params: {
  fromIso: string
  toIso: string
  people: Person[]
  allocations: Allocation[]
  timesheets: Timesheet[]
  projectId: string
}): { cost: number; billable: number; lines: PeopleCostLine[] } {
  const { fromIso, toIso, people, allocations, timesheets, projectId } = params
  const peopleById = new Map(people.map((p) => [p.id, p]))
  const lines: PeopleCostLine[] = []

  for (const a of allocations) {
    if (a.project_id !== projectId) continue
    const person = peopleById.get(a.person_id)
    if (!person) continue

    const overlapFrom = maxIso(a.start_date, fromIso)
    const overlapTo = minIso(a.end_date ?? toIso, toIso)
    if (overlapTo < overlapFrom) continue

    let cost = 0
    let billable = 0
    const billableRate = a.billable_daily_rate ?? person.default_billable_daily_rate ?? 0

    if (person.employment_type === 'Salaried') {
      // Calendar days of overlap / calendar days of month-equivalent.
      // Use working-days-equivalent denominator: ~22 working days/month.
      const wd = workingDaysInRange(overlapFrom, overlapTo)
      const monthly = Number(person.monthly_salary ?? 0)
      cost = (monthly / 22) * wd * Number(a.allocation_pct)
      billable = wd * Number(a.allocation_pct) * billableRate
    } else if (person.employment_type === 'Daily') {
      const wd = workingDaysInRange(overlapFrom, overlapTo)
      const dr = Number(person.daily_rate ?? 0)
      cost = wd * dr * Number(a.allocation_pct)
      billable = wd * Number(a.allocation_pct) * billableRate
    } else if (person.employment_type === 'Hourly') {
      const hr = Number(person.hourly_rate ?? 0)
      const totalHours = timesheets
        .filter(
          (t) =>
            t.project_id === projectId &&
            t.person_id === person.id &&
            t.date >= overlapFrom &&
            t.date <= overlapTo
        )
        .reduce((s, t) => s + Number(t.hours), 0)
      cost = totalHours * hr
      // Hourly billable: assume 8h/day → fractional days
      billable = (totalHours / 8) * billableRate
    }

    lines.push({
      personId: person.id,
      personName: person.name,
      type: person.employment_type,
      cost,
      billable,
      from: overlapFrom,
      to: overlapTo,
      allocationPct: Number(a.allocation_pct),
    })
  }

  const cost = lines.reduce((s, l) => s + l.cost, 0)
  const billable = lines.reduce((s, l) => s + l.billable, 0)
  return { cost, billable, lines }
}

export type PeopleCostLine = {
  personId: string
  personName: string
  type: Person['employment_type']
  cost: number
  billable: number
  from: string
  to: string
  allocationPct: number
}

/** Total i % të alokimeve aktive të një personi për një datë të caktuar. */
export function activeAllocationPctForPerson(
  personId: string,
  isoDay: string,
  allocations: Allocation[]
): number {
  return allocations
    .filter(
      (a) => a.person_id === personId && a.start_date <= isoDay && (a.end_date == null || a.end_date >= isoDay)
    )
    .reduce((s, a) => s + Number(a.allocation_pct), 0)
}

export { isoDate, workingDaysInRange }
