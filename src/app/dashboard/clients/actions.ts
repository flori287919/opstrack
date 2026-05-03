'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { friendlyError } from '@/lib/errors'

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
const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export async function createClientRecord(fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  const name = str(fd.get('name'))
  if (!name) {
    redirect('/dashboard/clients?error=Emri%20eshte%20i%20detyrueshem')
  }
  const { error } = await supabase.from('clients').insert({
    org_id: orgId,
    name,
    country: str(fd.get('country')),
    contact_person: str(fd.get('contact_person')),
    email: str(fd.get('email')),
    phone: str(fd.get('phone')),
    payment_terms_days: num(fd.get('payment_terms_days')) ?? 0,
    default_modality: str(fd.get('default_modality')),
    notes: str(fd.get('notes')),
  })
  if (error) {
    redirect(`/dashboard/clients?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath('/dashboard/clients')
  redirect('/dashboard/clients')
}

export async function softDeleteClient(id: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/clients')
}
