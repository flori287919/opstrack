import { describe, it, expect } from 'vitest'
import {
  computeProjectPeopleCost,
  workingDaysInRange,
  activeAllocationPctForPerson,
  type Person,
  type Allocation,
  type Timesheet,
} from './people-cost'

describe('workingDaysInRange', () => {
  it('counts a single weekday as 1 day', () => {
    // 2026-05-04 is a Monday
    expect(workingDaysInRange('2026-05-04', '2026-05-04')).toBe(1)
  })

  it('counts a single weekend day as 0', () => {
    // 2026-05-02 is a Saturday, 2026-05-03 is a Sunday
    expect(workingDaysInRange('2026-05-02', '2026-05-02')).toBe(0)
    expect(workingDaysInRange('2026-05-03', '2026-05-03')).toBe(0)
  })

  it('counts a Mon–Fri week as 5 days', () => {
    // 2026-05-04 (Mon) → 2026-05-08 (Fri)
    expect(workingDaysInRange('2026-05-04', '2026-05-08')).toBe(5)
  })

  it('skips weekends in a 7-day range', () => {
    // Mon–Sun = 5 working days
    expect(workingDaysInRange('2026-05-04', '2026-05-10')).toBe(5)
  })

  it('returns 0 if range is inverted', () => {
    expect(workingDaysInRange('2026-05-10', '2026-05-04')).toBe(0)
  })

  it('handles a full month', () => {
    // 2026-05-01 (Fri) → 2026-05-31 (Sun) = 21 working days
    expect(workingDaysInRange('2026-05-01', '2026-05-31')).toBe(21)
  })
})

const PERSON_SAL: Person = {
  id: 'p-sal',
  name: 'Salaried Sue',
  employment_type: 'Salaried',
  monthly_salary: 4400,
  daily_rate: null,
  hourly_rate: null,
  default_billable_daily_rate: 500,
}

const PERSON_DAILY: Person = {
  id: 'p-day',
  name: 'Daily Dan',
  employment_type: 'Daily',
  monthly_salary: null,
  daily_rate: 300,
  hourly_rate: null,
  default_billable_daily_rate: 600,
}

const PERSON_HOUR: Person = {
  id: 'p-hr',
  name: 'Hourly Hal',
  employment_type: 'Hourly',
  monthly_salary: null,
  daily_rate: null,
  hourly_rate: 40,
  default_billable_daily_rate: 520,
}

describe('computeProjectPeopleCost — Salaried', () => {
  it('full month at 100% allocation costs ~ monthly_salary', () => {
    // May 2026 has 21 working days. 22 = the denominator. So cost ≈ salary * 21/22.
    const allocs: Allocation[] = [
      {
        id: 'a',
        person_id: 'p-sal',
        project_id: 'proj-1',
        allocation_pct: 1,
        start_date: '2026-05-01',
        end_date: '2026-05-31',
        billable_daily_rate: null,
      },
    ]
    const r = computeProjectPeopleCost({
      fromIso: '2026-05-01',
      toIso: '2026-05-31',
      people: [PERSON_SAL],
      allocations: allocs,
      timesheets: [],
      projectId: 'proj-1',
    })
    expect(r.cost).toBeCloseTo((4400 / 22) * 21 * 1, 2)
    // Billable: 21 working days × 100% × 500 = 10,500
    expect(r.billable).toBeCloseTo(21 * 1 * 500, 2)
  })

  it('half allocation halves the cost', () => {
    const allocs: Allocation[] = [
      {
        id: 'a',
        person_id: 'p-sal',
        project_id: 'proj-1',
        allocation_pct: 0.5,
        start_date: '2026-05-01',
        end_date: '2026-05-31',
        billable_daily_rate: null,
      },
    ]
    const r = computeProjectPeopleCost({
      fromIso: '2026-05-01',
      toIso: '2026-05-31',
      people: [PERSON_SAL],
      allocations: allocs,
      timesheets: [],
      projectId: 'proj-1',
    })
    expect(r.cost).toBeCloseTo((4400 / 22) * 21 * 0.5, 2)
  })
})

describe('computeProjectPeopleCost — Daily', () => {
  it('uses working days × daily_rate × allocation_pct', () => {
    const allocs: Allocation[] = [
      {
        id: 'a',
        person_id: 'p-day',
        project_id: 'proj-1',
        allocation_pct: 1,
        start_date: '2026-05-04',
        end_date: '2026-05-08',
        billable_daily_rate: null,
      },
    ]
    const r = computeProjectPeopleCost({
      fromIso: '2026-05-04',
      toIso: '2026-05-08',
      people: [PERSON_DAILY],
      allocations: allocs,
      timesheets: [],
      projectId: 'proj-1',
    })
    // 5 working days × 300 × 1 = 1500
    expect(r.cost).toBe(1500)
    // 5 × 1 × 600 = 3000
    expect(r.billable).toBe(3000)
  })
})

describe('computeProjectPeopleCost — Hourly', () => {
  it('sums timesheet hours × hourly_rate', () => {
    const allocs: Allocation[] = [
      {
        id: 'a',
        person_id: 'p-hr',
        project_id: 'proj-1',
        allocation_pct: 1,
        start_date: '2026-05-01',
        end_date: '2026-05-31',
        billable_daily_rate: null,
      },
    ]
    const ts: Timesheet[] = [
      { person_id: 'p-hr', project_id: 'proj-1', date: '2026-05-04', hours: 8 },
      { person_id: 'p-hr', project_id: 'proj-1', date: '2026-05-05', hours: 6 },
      // wrong project — must NOT be counted
      { person_id: 'p-hr', project_id: 'other', date: '2026-05-06', hours: 100 },
      // outside overlap — must NOT be counted
      { person_id: 'p-hr', project_id: 'proj-1', date: '2026-04-30', hours: 8 },
    ]
    const r = computeProjectPeopleCost({
      fromIso: '2026-05-01',
      toIso: '2026-05-31',
      people: [PERSON_HOUR],
      allocations: allocs,
      timesheets: ts,
      projectId: 'proj-1',
    })
    // (8 + 6) × 40 = 560
    expect(r.cost).toBe(560)
    // billable = (14 / 8) × 520 = 910
    expect(r.billable).toBeCloseTo((14 / 8) * 520, 2)
  })
})

describe('computeProjectPeopleCost — billable_daily_rate override', () => {
  it('uses allocation override over person default', () => {
    const allocs: Allocation[] = [
      {
        id: 'a',
        person_id: 'p-day',
        project_id: 'proj-1',
        allocation_pct: 1,
        start_date: '2026-05-04',
        end_date: '2026-05-08',
        billable_daily_rate: 700, // override
      },
    ]
    const r = computeProjectPeopleCost({
      fromIso: '2026-05-04',
      toIso: '2026-05-08',
      people: [PERSON_DAILY],
      allocations: allocs,
      timesheets: [],
      projectId: 'proj-1',
    })
    // 5 × 1 × 700 = 3500 (NOT 3000 from the person default)
    expect(r.billable).toBe(3500)
  })
})

describe('computeProjectPeopleCost — wrong project filtered', () => {
  it('ignores allocations from other projects', () => {
    const allocs: Allocation[] = [
      {
        id: 'a',
        person_id: 'p-day',
        project_id: 'OTHER',
        allocation_pct: 1,
        start_date: '2026-05-04',
        end_date: '2026-05-08',
        billable_daily_rate: null,
      },
    ]
    const r = computeProjectPeopleCost({
      fromIso: '2026-05-04',
      toIso: '2026-05-08',
      people: [PERSON_DAILY],
      allocations: allocs,
      timesheets: [],
      projectId: 'proj-1',
    })
    expect(r.cost).toBe(0)
    expect(r.billable).toBe(0)
    expect(r.lines).toHaveLength(0)
  })
})

describe('computeProjectPeopleCost — overlap clipping', () => {
  it('clips when allocation starts before fromIso', () => {
    const allocs: Allocation[] = [
      {
        id: 'a',
        person_id: 'p-day',
        project_id: 'proj-1',
        allocation_pct: 1,
        start_date: '2026-04-01',
        end_date: '2026-05-31',
        billable_daily_rate: null,
      },
    ]
    const r = computeProjectPeopleCost({
      fromIso: '2026-05-04',
      toIso: '2026-05-08',
      people: [PERSON_DAILY],
      allocations: allocs,
      timesheets: [],
      projectId: 'proj-1',
    })
    // Only Mon–Fri of this week count, not the whole period
    expect(r.cost).toBe(5 * 300)
  })

  it('returns 0 when allocation ends before fromIso', () => {
    const allocs: Allocation[] = [
      {
        id: 'a',
        person_id: 'p-day',
        project_id: 'proj-1',
        allocation_pct: 1,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        billable_daily_rate: null,
      },
    ]
    const r = computeProjectPeopleCost({
      fromIso: '2026-05-01',
      toIso: '2026-05-31',
      people: [PERSON_DAILY],
      allocations: allocs,
      timesheets: [],
      projectId: 'proj-1',
    })
    expect(r.cost).toBe(0)
  })

  it('treats null end_date as open-ended', () => {
    const allocs: Allocation[] = [
      {
        id: 'a',
        person_id: 'p-day',
        project_id: 'proj-1',
        allocation_pct: 1,
        start_date: '2026-04-01',
        end_date: null,
        billable_daily_rate: null,
      },
    ]
    const r = computeProjectPeopleCost({
      fromIso: '2026-05-04',
      toIso: '2026-05-08',
      people: [PERSON_DAILY],
      allocations: allocs,
      timesheets: [],
      projectId: 'proj-1',
    })
    expect(r.cost).toBe(5 * 300)
  })
})

describe('activeAllocationPctForPerson', () => {
  const allocs: Allocation[] = [
    {
      id: 'a',
      person_id: 'P',
      project_id: 'p1',
      allocation_pct: 0.5,
      start_date: '2026-05-01',
      end_date: '2026-12-31',
      billable_daily_rate: null,
    },
    {
      id: 'b',
      person_id: 'P',
      project_id: 'p2',
      allocation_pct: 0.3,
      start_date: '2026-04-01',
      end_date: null,
      billable_daily_rate: null,
    },
    {
      id: 'c',
      person_id: 'OTHER',
      project_id: 'p3',
      allocation_pct: 1,
      start_date: '2026-01-01',
      end_date: null,
      billable_daily_rate: null,
    },
  ]

  it('sums all active allocations for the person on the given date', () => {
    expect(activeAllocationPctForPerson('P', '2026-05-15', allocs)).toBeCloseTo(0.8, 5)
  })

  it('ignores allocations of other people', () => {
    expect(activeAllocationPctForPerson('NOBODY', '2026-05-15', allocs)).toBe(0)
  })

  it('excludes ended allocations', () => {
    // Outside the May 1–Dec 31 window for "a", only "b" (open-ended) counts.
    expect(activeAllocationPctForPerson('P', '2027-01-15', allocs)).toBeCloseTo(0.3, 5)
  })

  it('excludes future allocations', () => {
    expect(activeAllocationPctForPerson('P', '2026-03-15', allocs)).toBe(0)
  })
})
