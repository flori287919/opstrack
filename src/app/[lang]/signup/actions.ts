'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { friendlyError } from '@/lib/errors'
import { currentLocale } from '@/lib/locale'

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')
  const passwordConfirm = String(formData.get('password_confirm') || '')
  const orgName = String(formData.get('orgName') || '')
  const lang = await currentLocale()

  if (password.length < 8) {
    redirect(`/${lang}/signup?error=${encodeURIComponent('Password must be at least 8 characters / Fjalëkalimi duhet së paku 8 karaktere')}`)
  }

  if (password !== passwordConfirm) {
    redirect(`/${lang}/signup?error=${encodeURIComponent(lang === 'en' ? 'Passwords do not match' : 'Fjalëkalimet nuk përputhen')}`)
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { org_name: orgName },
    },
  })
  if (error) {
    redirect(`/${lang}/signup?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath('/', 'layout')
  redirect(`/${lang}/dashboard`)
}
