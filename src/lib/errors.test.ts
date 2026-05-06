import { describe, expect, it } from 'vitest'
import { friendlyError } from './errors'

describe('friendlyError', () => {
  it('returns generic message for null', () => {
    expect(friendlyError(null)).toMatch(/diçka shkoi keq/i)
  })

  it('returns generic message for unknown error shapes', () => {
    expect(friendlyError({ totally: 'unrecognized' })).toMatch(/diçka shkoi keq/i)
  })

  describe('auth errors', () => {
    it('maps "User already registered"', () => {
      expect(friendlyError({ message: 'User already registered' })).toMatch(/i përdorur/i)
    })

    it('maps "Invalid login credentials"', () => {
      expect(friendlyError({ message: 'Invalid login credentials' })).toMatch(/email ose fjalëkalim/i)
    })

    it('maps "Email not confirmed"', () => {
      expect(friendlyError({ message: 'Email not confirmed' })).toMatch(/nuk është konfirmuar/i)
    })

    it('maps weak password', () => {
      expect(friendlyError({ message: 'Password should be at least 8 characters' })).toMatch(/i dobët/i)
    })

    it('maps rate limit', () => {
      expect(friendlyError({ message: 'rate limit exceeded' })).toMatch(/shumë kërkesa/i)
    })

    it('maps invalid email', () => {
      expect(friendlyError({ message: 'Invalid email address' })).toMatch(/i pavlefshëm/i)
    })

    it('maps "Signups not allowed"', () => {
      expect(friendlyError({ message: 'Signups not allowed' })).toMatch(/çaktivizuar/i)
    })
  })

  describe('postgres errors', () => {
    it('maps unique violation (23505)', () => {
      expect(friendlyError({ code: '23505', message: 'duplicate key' })).toMatch(/ekziston tashmë/i)
    })

    it('maps foreign-key violation (23503)', () => {
      expect(friendlyError({ code: '23503', message: 'fk fail' })).toMatch(/lidhje e pasaktë/i)
    })

    it('maps not-null violation (23502)', () => {
      expect(friendlyError({ code: '23502', message: 'not null' })).toMatch(/mungon një fushë/i)
    })

    it('maps check constraint (23514)', () => {
      expect(friendlyError({ code: '23514', message: 'check fail' })).toMatch(/vlerë e palejuar/i)
    })

    it('maps RLS denial via code 42501', () => {
      expect(friendlyError({ code: '42501', message: 'denied' })).toMatch(/nuk keni leje/i)
    })

    it('maps RLS denial via message text', () => {
      expect(friendlyError({ message: 'new row violates row-level security policy' })).toMatch(
        /nuk keni leje/i
      )
    })

    it('maps JWT expiry', () => {
      expect(friendlyError({ message: 'JWT expired' })).toMatch(/sesioni skadoi/i)
    })
  })

  it('case-insensitive for messages', () => {
    expect(friendlyError({ message: 'INVALID LOGIN CREDENTIALS' })).toMatch(/email ose fjalëkalim/i)
  })
})
