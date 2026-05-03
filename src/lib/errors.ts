/**
 * Map Supabase auth/Postgres errors to user-facing Albanian messages.
 * Avoids leaking schema/constraint names via the URL.
 */
export function friendlyError(error: unknown): string {
  if (!error) return 'Diçka shkoi keq, provoni përsëri'

  const e = error as { message?: string; code?: string }
  const msg = (e.message ?? '').toLowerCase()
  const code = e.code ?? ''

  // Auth errors (Supabase)
  if (msg.includes('user already registered') || msg.includes('already exists'))
    return 'Email-i është i përdorur tashmë'
  if (msg.includes('invalid login credentials'))
    return 'Email ose fjalëkalim i gabuar'
  if (msg.includes('email not confirmed'))
    return 'Email-i nuk është konfirmuar. Kontrolloni inbox-in dhe spam-in.'
  if (msg.includes('password should be') || msg.includes('weak password'))
    return 'Fjalëkalimi është i dobët — së paku 8 karaktere.'
  if (msg.includes('rate limit'))
    return 'Shumë kërkesa. Prisni pak minuta dhe provoni përsëri.'
  if (msg.includes('invalid email'))
    return 'Email i pavlefshëm'
  if (msg.includes('signups not allowed'))
    return 'Regjistrimet janë çaktivizuar.'

  // Postgres error codes
  if (code === '23505') return 'Ky regjistrim ekziston tashmë'
  if (code === '23503') return 'Lidhje e pasaktë — kontrolloni fushat e zgjedhura'
  if (code === '23502') return 'Mungon një fushë e detyrueshme'
  if (code === '23514') return 'Vlerë e palejuar për një nga fushat'
  if (code === '42501' || msg.includes('row-level security'))
    return 'Nuk keni leje për këtë veprim'
  if (code === 'PGRST301' || msg.includes('jwt'))
    return 'Sesioni skadoi. Hyni përsëri.'

  return 'Diçka shkoi keq, provoni përsëri'
}
