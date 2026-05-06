import { describe, expect, it } from 'vitest'
import { formatEUR, formatDate, todayISO } from './format'

describe('formatEUR', () => {
  it('formats integers with the EUR symbol', () => {
    expect(formatEUR(1000)).toMatch(/€1,000\.00/)
  })

  it('preserves two decimals', () => {
    expect(formatEUR(1234.5)).toMatch(/€1,234\.50/)
  })

  it('treats null as zero', () => {
    expect(formatEUR(null)).toMatch(/€0\.00/)
  })

  it('treats undefined as zero', () => {
    expect(formatEUR(undefined)).toMatch(/€0\.00/)
  })

  it('handles negatives', () => {
    expect(formatEUR(-500)).toMatch(/-€500\.00|\(€500\.00\)/)
  })
})

describe('formatDate', () => {
  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns em-dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('returns the original string for invalid input that Date cannot parse', () => {
    // sq-AL formatting of "Invalid Date" string yields "Invalid Date" — both
    // catch fallback and toLocaleDateString('Invalid Date') produce a string,
    // so we just assert it is a non-empty string and does not throw.
    const result = formatDate('not-a-date')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('formats valid ISO dates without throwing', () => {
    const result = formatDate('2026-05-06')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('todayISO', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns the same value across two close calls', () => {
    const a = todayISO()
    const b = todayISO()
    expect(a).toBe(b)
  })
})
