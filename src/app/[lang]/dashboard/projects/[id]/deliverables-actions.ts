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

function buildPayload(fd: FormData) {
  return {
    code: str(fd.get('code')),
    name: str(fd.get('name')),
    description: str(fd.get('description')),
    planned_date: str(fd.get('planned_date')),
    actual_date: str(fd.get('actual_date')),
    planned_value_no_vat: num(fd.get('planned_value_no_vat')) ?? 0,
    status: str(fd.get('status')) ?? 'Planned',
    notes: str(fd.get('notes')),
  }
}

export async function createDeliverable(projectId: string, fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  const payload = buildPayload(fd)
  if (!payload.code || !payload.name) {
    redirect(`/dashboard/projects/${projectId}?error=Kodi%20dhe%20Emri%20jane%20te%20detyrueshem`)
  }
  const { error } = await supabase
    .from('deliverables')
    .insert({ ...payload, project_id: projectId, org_id: orgId })
  if (error) {
    redirect(`/dashboard/projects/${projectId}?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/invoices')
  redirect(`/dashboard/projects/${projectId}`)
}

export async function updateDeliverable(projectId: string, deliverableId: string, fd: FormData) {
  const { supabase } = await getOrgId()
  const payload = buildPayload(fd)
  const { error } = await supabase
    .from('deliverables')
    .update(payload)
    .eq('id', deliverableId)
  if (error) {
    redirect(`/dashboard/projects/${projectId}?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/invoices')
  redirect(`/dashboard/projects/${projectId}`)
}

export async function setDeliverableStatus(
  projectId: string,
  deliverableId: string,
  status: 'Planned' | 'In Progress' | 'Submitted' | 'Accepted' | 'Rejected' | 'Cancelled',
  markActualToday = false
) {
  const { supabase } = await getOrgId()
  const update: { status: string; actual_date?: string } = { status }
  if (markActualToday) update.actual_date = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('deliverables')
    .update(update)
    .eq('id', deliverableId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function softDeleteDeliverable(projectId: string, deliverableId: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('deliverables')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', deliverableId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/invoices')
}
