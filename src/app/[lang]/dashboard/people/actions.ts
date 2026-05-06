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

const num = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? '').trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
const str = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

function buildPayload(fd: FormData) {
  return {
    name: str(fd.get('name')),
    role: str(fd.get('role')),
    email: str(fd.get('email')),
    employment_type: str(fd.get('employment_type')) ?? 'Salaried',
    monthly_salary: num(fd.get('monthly_salary')),
    daily_rate: num(fd.get('daily_rate')),
    hourly_rate: num(fd.get('hourly_rate')),
    default_billable_daily_rate: num(fd.get('default_billable_daily_rate')),
    start_date: str(fd.get('start_date')),
    end_date: str(fd.get('end_date')),
    notes: str(fd.get('notes')),
  }
}

export async function createPerson(fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  const payload = buildPayload(fd)
  if (!payload.name) {
    await redirectLocal('/dashboard/people?error=Emri%20eshte%20i%20detyrueshem')
  }
  const { error } = await supabase.from('people').insert({ ...payload, org_id: orgId })
  if (error) {
    await redirectLocal(`/dashboard/people?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath('/dashboard/people')
  await redirectLocal('/dashboard/people')
}

export async function updatePerson(id: string, fd: FormData) {
  const { supabase } = await getOrgId()
  const payload = buildPayload(fd)
  const { error } = await supabase.from('people').update(payload).eq('id', id)
  if (error) {
    await redirectLocal(`/dashboard/people/${id}?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath('/dashboard/people')
  revalidatePath(`/dashboard/people/${id}`)
  await redirectLocal(`/dashboard/people/${id}`)
}

export async function softDeletePerson(id: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('people')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/people')
  await redirectLocal('/dashboard/people')
}
