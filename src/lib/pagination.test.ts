import { describe, it, expect } from 'vitest'
import { parsePagination, totalPages, DEFAULT_PAGE_SIZE } from './pagination'

describe('parsePagination', () => {
  it('uses defaults when params are missing', () => {
    const p = parsePagination({})
    expect(p.page).toBe(1)
    expect(p.pageSize).toBe(DEFAULT_PAGE_SIZE)
    expect(p.from).toBe(0)
    expect(p.to).toBe(DEFAULT_PAGE_SIZE - 1)
  })

  it('parses valid page/pageSize', () => {
    const p = parsePagination({ page: '3', pageSize: '10' })
    expect(p.page).toBe(3)
    expect(p.pageSize).toBe(10)
    expect(p.from).toBe(20)
    expect(p.to).toBe(29)
  })

  it('clamps page to >= 1', () => {
    expect(parsePagination({ page: '0' }).page).toBe(1)
    expect(parsePagination({ page: '-5' }).page).toBe(1)
    expect(parsePagination({ page: 'abc' }).page).toBe(1)
  })

  it('clamps pageSize to <= 100', () => {
    expect(parsePagination({ pageSize: '500' }).pageSize).toBe(100)
  })

  it('clamps pageSize to >= 1', () => {
    expect(parsePagination({ pageSize: '0' }).pageSize).toBe(DEFAULT_PAGE_SIZE) // 0 falsy → uses default
  })
})

describe('totalPages', () => {
  it('returns 1 when count is 0 or null', () => {
    expect(totalPages(0, 20)).toBe(1)
    expect(totalPages(null, 20)).toBe(1)
  })

  it('rounds up partial pages', () => {
    expect(totalPages(1, 20)).toBe(1)
    expect(totalPages(20, 20)).toBe(1)
    expect(totalPages(21, 20)).toBe(2)
    expect(totalPages(100, 20)).toBe(5)
    expect(totalPages(101, 20)).toBe(6)
  })
})
