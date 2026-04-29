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
const date = (v: FormDataEntryValue | null): string | null => str(v)

function buildPayload(fd: FormData) {
  return {
    project_id: str(fd.get('project_id')),
    invoice_number: str(fd.get('invoice_number')),
    deliverable_number: str(fd.get('deliverable_number')),
    planned_issue_date: date(fd.get('planned_issue_date')),
    actual_issue_date: date(fd.get('actual_issue_date')),
    planned_collection_date: date(fd.get('planned_collection_date')),
    expected_collection_date: date(fd.get('expected_collection_date')),
    collection_date: date(fd.get('collection_date')),
    amount_no_vat: num(fd.get('amount_no_vat')) ?? 0,
    status: str(fd.get('status')) ?? 'Scheduled',
    notes: str(fd.get('notes')),
  }
}

export async function createInvoice(fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  const payload = buildPayload(fd)
  if (!payload.project_id) {
    redirect('/dashboard/invoices/new?error=Zgjidh%20nje%20projekt')
  }
  const { error } = await supabase.from('invoices').insert({ ...payload, org_id: orgId })
  if (error) {
    redirect(`/dashboard/invoices/new?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard')
  redirect('/dashboard/invoices')
}

export async function updateInvoice(id: string, fd: FormData) {
  const { supabase } = await getOrgId()
  const payload = buildPayload(fd)
  const { error } = await supabase.from('invoices').update(payload).eq('id', id)
  if (error) {
    redirect(`/dashboard/invoices/${id}?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard')
  redirect(`/dashboard/invoices/${id}`)
}

export async function softDeleteInvoice(id: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard')
  redirect('/dashboard/invoices')
}

export async function restoreInvoice(id: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('invoices')
    .update({ deleted_at: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/invoices')
}

export async function markInvoicePaid(id: string, fd: FormData) {
  const { supabase } = await getOrgId()
  const collection_date = str(fd.get('collection_date')) ?? new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('invoices')
    .update({ collection_date, status: 'Paid' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard')
  redirect(`/dashboard/invoices/${id}`)
}
