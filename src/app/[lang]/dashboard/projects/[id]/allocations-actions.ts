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

export async function createAllocation(projectId: string, fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  const personId = str(fd.get('person_id'))
  const startDate = str(fd.get('start_date'))
  const pct = num(fd.get('allocation_pct'))

  if (!personId || !startDate) {
    redirect(
      `/dashboard/projects/${projectId}?error=Personi%20dhe%20Start%20Date%20jane%20te%20detyrueshem`
    )
  }

  const payload = {
    org_id: orgId,
    project_id: projectId,
    person_id: personId,
    allocation_pct: pct ?? 1.0,
    start_date: startDate,
    end_date: str(fd.get('end_date')),
    billable_daily_rate: num(fd.get('billable_daily_rate')),
    notes: str(fd.get('notes')),
  }

  const { error } = await supabase.from('people_allocations').insert(payload)
  if (error) {
    redirect(`/dashboard/projects/${projectId}?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard')
  redirect(`/dashboard/projects/${projectId}`)
}

export async function softDeleteAllocation(projectId: string, allocationId: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('people_allocations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', allocationId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard')
}

export async function createTimesheet(projectId: string, fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  const personId = str(fd.get('person_id'))
  const date = str(fd.get('date'))
  const hours = num(fd.get('hours'))

  if (!personId || !date || !hours || hours <= 0) {
    redirect(
      `/dashboard/projects/${projectId}?error=Personi%2C%20data%20dhe%20oret%20%28%3E0%29%20jane%20te%20detyrueshem`
    )
  }

  const { error } = await supabase.from('timesheets').insert({
    org_id: orgId,
    project_id: projectId,
    person_id: personId,
    date,
    hours,
    description: str(fd.get('description')),
  })
  if (error) {
    redirect(`/dashboard/projects/${projectId}?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath(`/dashboard/projects/${projectId}`)
  redirect(`/dashboard/projects/${projectId}`)
}

export async function softDeleteTimesheet(projectId: string, timesheetId: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('timesheets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', timesheetId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/projects/${projectId}`)
}
