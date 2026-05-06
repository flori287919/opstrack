'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { friendlyError } from '@/lib/errors'

export async function setNewPassword(lang: string, fd: FormData) {
  const password = String(fd.get('password') ?? '')
  const confirm = String(fd.get('confirm') ?? '')

  if (password.length < 8) {
    redirect(
      `/${lang}/reset-password?error=${encodeURIComponent(
        lang === 'en' ? 'Password must be at least 8 characters' : 'Fjalëkalimi duhet së paku 8 karaktere'
      )}`
    )
  }
  if (password !== confirm) {
    redirect(
      `/${lang}/reset-password?error=${encodeURIComponent(
        lang === 'en' ? 'Passwords do not match' : 'Fjalëkalimet nuk përputhen'
      )}`
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    redirect(`/${lang}/reset-password?error=${encodeURIComponent(friendlyError(error))}`)
  }

  await supabase.auth.signOut()
  redirect(`/${lang}/login?info=password_updated`)
}
