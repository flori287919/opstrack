'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { friendlyError } from '@/lib/errors'
import { redirectLocal } from '@/lib/locale'

async function getOrgId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (error || !data) throw new Error('No organization found')
  return { supabase, orgId: data.org_id }
}

const str = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

export async function createBL(fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  const code = str(fd.get('code'))
  const name = str(fd.get('name'))
  if (!code || !name) {
    await redirectLocal('/dashboard/lookups?error=Code%20dhe%20Name%20jane%20te%20detyrueshem')
  }
  const { error } = await supabase.from('business_lines').insert({
    org_id: orgId,
    code,
    name,
    description: str(fd.get('description')),
  })
  if (error) await redirectLocal(`/dashboard/lookups?error=${encodeURIComponent(friendlyError(error))}`)
  revalidatePath('/dashboard/lookups')
  revalidatePath('/dashboard/projects/new')
  await redirectLocal('/dashboard/lookups')
}

export async function deleteBL(id: string) {
  const { supabase } = await getOrgId()
  await supabase.from('business_lines').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/dashboard/lookups')
}

export async function createBeneficiary(fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  const name = str(fd.get('name'))
  if (!name) await redirectLocal('/dashboard/lookups?error=Emri%20i%20detyrueshem')
  const { error } = await supabase.from('beneficiaries').insert({
    org_id: orgId,
    name,
    country: str(fd.get('country')),
    notes: str(fd.get('notes')),
  })
  if (error) await redirectLocal(`/dashboard/lookups?error=${encodeURIComponent(friendlyError(error))}`)
  revalidatePath('/dashboard/lookups')
  await redirectLocal('/dashboard/lookups')
}

export async function deleteBeneficiary(id: string) {
  const { supabase } = await getOrgId()
  await supabase.from('beneficiaries').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/dashboard/lookups')
}

export async function createPM(fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  const name = str(fd.get('name'))
  if (!name) await redirectLocal('/dashboard/lookups?error=Emri%20i%20detyrueshem')
  const { error } = await supabase.from('project_managers').insert({
    org_id: orgId,
    name,
    email: str(fd.get('email')),
    role: str(fd.get('role')),
  })
  if (error) await redirectLocal(`/dashboard/lookups?error=${encodeURIComponent(friendlyError(error))}`)
  revalidatePath('/dashboard/lookups')
  await redirectLocal('/dashboard/lookups')
}

export async function deletePM(id: string) {
  const { supabase } = await getOrgId()
  await supabase.from('project_managers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/dashboard/lookups')
}
