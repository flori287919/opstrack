import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const rawNext = searchParams.get('next') ?? '/sq'
  // Reject anything that isn't a same-origin relative path. `new URL(absolute, base)`
  // resolves to `absolute` when `absolute` is itself a full URL — so an unvalidated
  // `?next=https://evil.com` produces a cross-origin 302 (open redirect + session
  // fixation, since verifyOtp also sets the attacker's session cookies on the
  // victim's browser). Block protocol-relative (`//`) and Windows backslash escapes.
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\')
      ? rawNext
      : '/sq'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }
  return NextResponse.redirect(
    new URL('/sq/login?error=' + encodeURIComponent('Linku ka skaduar ose është i pavlefshëm'), request.url)
  )
}
