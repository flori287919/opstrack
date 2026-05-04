'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { friendlyError } from '@/lib/errors'
import { currentLocale } from '@/lib/locale'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')
  const lang = await currentLocale()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    redirect(`/${lang}/login?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath('/', 'layout')
  redirect(`/${lang}/dashboard`)
}

export async function logout() {
  const supabase = await createClient()
  const lang = await currentLocale()
  await supabase.auth.signOut()
  redirect(`/${lang}/login`)
}
