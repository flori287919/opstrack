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
  const { error } = await supabase
    .from('org_members')
    .update({ approved: true })
    .eq('org_id', orgId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
}

export async function rejectMembership(orgId: string, userId: string) {
  const supabase = await requireSuperAdmin()
  // Reject = delete the membership AND the org (since the org was auto-created
  // for that single user). The auth.users row stays so they can re-apply.
  const { error: orgErr } = await supabase
    .from('organizations')
    .delete()
    .eq('id', orgId)
  if (orgErr) throw new Error(orgErr.message)
  revalidatePath('/', 'layout')
}
