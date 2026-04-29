'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
  return { supabase, orgId: data.org_id, userId: user.id }
}

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

function date(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

function buildPayload(fd: FormData) {
  return {
    project_code: str(fd.get('project_code')),
    name: str(fd.get('name')),
    bl_id: str(fd.get('bl_id')),
    client_id: str(fd.get('client_id')),
    beneficiary_id: str(fd.get('beneficiary_id')),
    project_manager_id: str(fd.get('project_manager_id')),
    contract_start_date: date(fd.get('contract_start_date')),
    contract_end_date: date(fd.get('contract_end_date')),
    project_start_date: date(fd.get('project_start_date')),
    planned_end_date: date(fd.get('planned_end_date')),
    modality: str(fd.get('modality')),
    project_approval_form: str(fd.get('project_approval_form')),
    project_charter: str(fd.get('project_charter')),
    approved_cost_sheets: str(fd.get('approved_cost_sheets')),
    project_value_no_vat: num(fd.get('project_value_no_vat')) ?? 0,
    submission_profit_margin: num(fd.get('submission_profit_margin')) ?? 0,
    client_payment_terms_days: num(fd.get('client_payment_terms_days')) ?? 0,
    payment_terms_condition: str(fd.get('payment_terms_condition')),
    notes: str(fd.get('notes')),
  }
}

export async function createProject(fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  const payload = buildPayload(fd)
  if (!payload.project_code || !payload.name) {
    redirect('/dashboard/projects/new?error=Project%20code%20dhe%20Name%20jane%20te%20detyrueshem')
  }
  const { error } = await supabase
    .from('projects')
    .insert({ ...payload, org_id: orgId })
  if (error) {
    redirect(`/dashboard/projects/new?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard')
  redirect('/dashboard/projects')
}

export async function updateProject(id: string, fd: FormData) {
  const { supabase } = await getOrgId()
  const payload = buildPayload(fd)
  const { error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', id)
  if (error) {
    redirect(`/dashboard/projects/${id}?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard')
  redirect(`/dashboard/projects/${id}`)
}

export async function softDeleteProject(id: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard')
  redirect('/dashboard/projects')
}

export async function restoreProject(id: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/projects')
}
