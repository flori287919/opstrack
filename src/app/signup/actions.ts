'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { friendlyError } from '@/lib/errors'

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')
  const orgName = String(formData.get('orgName') || '')

  if (password.length < 8) {
    redirect('/signup?error=Fjalëkalimi%20duhet%20së%20paku%208%20karaktere')
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { org_name: orgName },
    },
  })
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
