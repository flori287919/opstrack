'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')
  const orgName = String(formData.get('orgName') || '')

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { org_name: orgName },
    },
  })
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
