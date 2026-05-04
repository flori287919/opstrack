'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/admin'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user.email)) {
    throw new Error('Forbidden')
  }
  return supabase
}

export async function approveMembership(orgId: string, userId: string) {
  const supabase = await requireSuperAdmin()
  const { error } = await supabase.rpc('approve_signup', {
    p_org_id: orgId,
    p_user_id: userId,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
}

export async function rejectMembership(orgId: string) {
  const supabase = await requireSuperAdmin()
  const { error } = await supabase.rpc('reject_signup', { p_org_id: orgId })
  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
}
