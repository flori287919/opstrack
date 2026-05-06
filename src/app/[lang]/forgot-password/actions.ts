'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requestReset(lang: string, fd: FormData) {
  const email = String(fd.get('email') ?? '').trim()
  if (!email) {
    redirect(`/${lang}/forgot-password?error=${encodeURIComponent(lang === 'en' ? 'Email is required' : 'Email-i është i detyrueshëm')}`)
  }

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const site = `${proto}://${host}`
  const next = encodeURIComponent(`/${lang}/reset-password`)

  const supabase = await createClient()
  // Fire and forget — never disclose whether the email exists.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/api/auth/confirm?next=${next}`,
  })

  redirect(`/${lang}/forgot-password?sent=1`)
}
