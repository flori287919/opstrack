import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isSuperAdmin } from './admin'

describe('isSuperAdmin', () => {
  const original = process.env.SUPER_ADMIN_EMAILS

  beforeEach(() => {
    delete process.env.SUPER_ADMIN_EMAILS
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SUPER_ADMIN_EMAILS
    else process.env.SUPER_ADMIN_EMAILS = original
  })

  it('returns false for null email', () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@example.com'
    expect(isSuperAdmin(null)).toBe(false)
  })

  it('returns false for undefined email', () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@example.com'
    expect(isSuperAdmin(undefined)).toBe(false)
  })

  it('returns false when env var is not set', () => {
    expect(isSuperAdmin('admin@example.com')).toBe(false)
  })

  it('returns false when env var is empty', () => {
    process.env.SUPER_ADMIN_EMAILS = ''
    expect(isSuperAdmin('admin@example.com')).toBe(false)
  })

  it('returns true for a single configured admin', () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@example.com'
    expect(isSuperAdmin('admin@example.com')).toBe(true)
  })

  it('matches case-insensitively', () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@example.com'
    expect(isSuperAdmin('ADMIN@example.com')).toBe(true)
    expect(isSuperAdmin('Admin@Example.COM')).toBe(true)
  })

  it('parses CSV with extra whitespace', () => {
    process.env.SUPER_ADMIN_EMAILS = ' admin@example.com , backup@example.com '
    expect(isSuperAdmin('admin@example.com')).toBe(true)
    expect(isSuperAdmin('backup@example.com')).toBe(true)
  })

  it('returns false for emails not in the list', () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@example.com,backup@example.com'
    expect(isSuperAdmin('intruder@example.com')).toBe(false)
  })

  it('ignores empty entries between commas', () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@example.com,,backup@example.com,'
    expect(isSuperAdmin('admin@example.com')).toBe(true)
    expect(isSuperAdmin('')).toBe(false)
  })
})
