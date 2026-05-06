import { describe, expect, it } from 'vitest'
import { buildLookup, parseBoolean, parseDate, parseEnum, parseInteger, parseNumber, parseString } from './excel-import'

describe('parseString', () => {
  it('returns null for null/undefined/empty', () => {
    expect(parseString(null)).toBeNull()
    expect(parseString(undefined)).toBeNull()
    expect(parseString('')).toBeNull()
  })

  it('trims whitespace', () => {
    expect(parseString('  hello  ')).toBe('hello')
  })

  it('coerces non-string values to string', () => {
    expect(parseString(42)).toBe('42')
    expect(parseString(true)).toBe('true')
  })
})

describe('parseNumber', () => {
  it('passes through finite numbers', () => {
    expect(parseNumber(42)).toBe(42)
    expect(parseNumber(3.14)).toBe(3.14)
    expect(parseNumber(0)).toBe(0)
  })

  it('returns null for null/empty', () => {
    expect(parseNumber(null)).toBeNull()
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('   ')).toBeNull()
  })

  it('parses comma decimal separator (European)', () => {
    expect(parseNumber('1,5')).toBe(1.5)
    expect(parseNumber('1234,56')).toBe(1234.56)
  })

  it('parses dot decimal separator', () => {
    expect(parseNumber('1.5')).toBe(1.5)
  })

  it('strips currency symbols and other non-numeric chars', () => {
    expect(parseNumber('€1234.56')).toBe(1234.56)
    expect(parseNumber('$1,234')).toBe(1.234) // comma → dot, then $ stripped
  })

  it('handles negative numbers', () => {
    expect(parseNumber('-42')).toBe(-42)
    expect(parseNumber(-3.14)).toBe(-3.14)
  })

  it('returns null for unparseable input', () => {
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber('-')).toBeNull()
    expect(parseNumber('.')).toBeNull()
  })

  it('rejects Infinity / NaN', () => {
    expect(parseNumber(Infinity)).toBeNull()
    expect(parseNumber(NaN)).toBeNull()
  })
})

describe('parseInteger', () => {
  it('truncates floats', () => {
    expect(parseInteger(3.7)).toBe(3)
    expect(parseInteger(-3.7)).toBe(-3)
  })

  it('returns null for null', () => {
    expect(parseInteger(null)).toBeNull()
  })
})

describe('parseBoolean', () => {
  it.each([
    ['Po', true],
    ['po', true],
    ['Yes', true],
    ['true', true],
    ['1', true],
    ['Y', true],
  ])('truthy: %s → %s', (input, expected) => {
    expect(parseBoolean(input)).toBe(expected)
  })

  it.each([
    ['Jo', false],
    ['jo', false],
    ['No', false],
    ['false', false],
    ['0', false],
    ['n', false],
  ])('falsy: %s → %s', (input, expected) => {
    expect(parseBoolean(input)).toBe(expected)
  })

  it('passes through booleans', () => {
    expect(parseBoolean(true)).toBe(true)
    expect(parseBoolean(false)).toBe(false)
  })

  it('returns null for empty/unrecognized', () => {
    expect(parseBoolean(null)).toBeNull()
    expect(parseBoolean('')).toBeNull()
    expect(parseBoolean('maybe')).toBeNull()
  })
})

describe('parseDate', () => {
  it('passes through ISO YYYY-MM-DD', () => {
    expect(parseDate('2026-05-06')).toBe('2026-05-06')
  })

  it('parses DD/MM/YYYY (European)', () => {
    expect(parseDate('06/05/2026')).toBe('2026-05-06')
    expect(parseDate('15/01/2026')).toBe('2026-01-15')
  })

  it('parses DD-MM-YYYY', () => {
    expect(parseDate('06-05-2026')).toBe('2026-05-06')
  })

  it('parses DD.MM.YYYY', () => {
    expect(parseDate('06.05.2026')).toBe('2026-05-06')
  })

  it('parses 2-digit year', () => {
    expect(parseDate('06/05/26')).toBe('2026-05-06')
  })

  it('parses Excel serial dates', () => {
    // Excel serial = days since 1899-12-30 (our JS-compatible epoch).
    // 46148 days after 1899-12-30 = 2026-05-06.
    expect(parseDate(46148)).toBe('2026-05-06')
    // 1 = 1899-12-31 (one day after the epoch)
    expect(parseDate(1)).toBe('1899-12-31')
  })

  it('passes through Date objects', () => {
    expect(parseDate(new Date('2026-05-06T00:00:00Z'))).toBe('2026-05-06')
  })

  it('returns null for null/empty', () => {
    expect(parseDate(null)).toBeNull()
    expect(parseDate('')).toBeNull()
  })

  it('returns null for clearly invalid input', () => {
    expect(parseDate('not a date')).toBeNull()
    expect(parseDate('99/99/9999')).toBeNull()
  })

  it('rejects invalid Date objects', () => {
    expect(parseDate(new Date('invalid'))).toBeNull()
  })
})

describe('parseEnum', () => {
  it('matches case-insensitively', () => {
    expect(parseEnum('contract', ['Contract', 'PO'] as const)).toBe('Contract')
    expect(parseEnum('PO', ['Contract', 'PO'] as const)).toBe('PO')
    expect(parseEnum('po', ['Contract', 'PO'] as const)).toBe('PO')
  })

  it('returns null for non-matches', () => {
    expect(parseEnum('Other', ['Contract', 'PO'] as const)).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(parseEnum('', ['Contract', 'PO'] as const)).toBeNull()
    expect(parseEnum(null, ['Contract', 'PO'] as const)).toBeNull()
  })
})

describe('buildLookup', () => {
  it('builds case-insensitive map', () => {
    const m = buildLookup([
      { id: 'id-1', key: 'Big Client SH.A.' },
      { id: 'id-2', key: 'Other Co' },
    ])
    expect(m.get('big client sh.a.')).toBe('id-1')
    expect(m.get('BIG CLIENT SH.A.'.toLowerCase())).toBe('id-1')
    expect(m.get('other co')).toBe('id-2')
    expect(m.get('missing')).toBeUndefined()
  })

  it('skips entries with null key', () => {
    const m = buildLookup([
      { id: 'id-1', key: null },
      { id: 'id-2', key: 'Valid' },
    ])
    expect(m.size).toBe(1)
    expect(m.get('valid')).toBe('id-2')
  })

  it('trims whitespace in keys', () => {
    const m = buildLookup([{ id: 'id-1', key: '  Spaced  ' }])
    expect(m.get('spaced')).toBe('id-1')
  })
})
