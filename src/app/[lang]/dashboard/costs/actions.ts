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
const bool = (v: FormDataEntryValue | null) => String(v ?? '') === 'on'

// ===== Cost Contracts =====
function buildContractPayload(fd: FormData) {
  return {
    project_id: str(fd.get('project_id')),
    beneficiary_name: str(fd.get('beneficiary_name')),
    contract_name: str(fd.get('contract_name')),
    modality: str(fd.get('modality')),
    status: str(fd.get('status')) ?? 'Active',
    contract_value_no_taxes: num(fd.get('contract_value_no_taxes')) ?? 0,
    tax_label: str(fd.get('tax_label')),
    wht_applicable: bool(fd.get('wht_applicable')),
    wht_value: num(fd.get('wht_value')) ?? 0,
    contract_value_with_taxes: num(fd.get('contract_value_with_taxes')) ?? 0,
    subco_payment_terms_days: num(fd.get('subco_payment_terms_days')) ?? 0,
    subco_payment_terms_condition: str(fd.get('subco_payment_terms_condition')),
    notes: str(fd.get('notes')),
  }
}

export async function createCostContract(fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  const payload = buildContractPayload(fd)
  if (!payload.project_id || !payload.contract_name) {
    await redirectLocal('/dashboard/costs/new?error=Projekti%20dhe%20Emri%20i%20kontrates%20jane%20te%20detyrueshem')
  }
  const { error } = await supabase
    .from('cost_contracts')
    .insert({ ...payload, org_id: orgId })
  if (error) {
    await redirectLocal(`/dashboard/costs/new?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath('/dashboard/costs')
  revalidatePath('/dashboard')
  await redirectLocal('/dashboard/costs')
}

export async function updateCostContract(id: string, fd: FormData) {
  const { supabase } = await getOrgId()
  const payload = buildContractPayload(fd)
  const { error } = await supabase.from('cost_contracts').update(payload).eq('id', id)
  if (error) {
    await redirectLocal(`/dashboard/costs/${id}?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath('/dashboard/costs')
  revalidatePath('/dashboard')
  await redirectLocal(`/dashboard/costs/${id}`)
}

export async function softDeleteCostContract(id: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('cost_contracts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/costs')
  revalidatePath('/dashboard')
  await redirectLocal('/dashboard/costs')
}

export async function restoreCostContract(id: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('cost_contracts')
    .update({ deleted_at: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/costs')
}

// ===== Cost Payments =====
function buildPaymentPayload(fd: FormData) {
  return {
    cost_contract_id: str(fd.get('cost_contract_id')),
    receipt_number: str(fd.get('receipt_number')),
    payment_schedule_pct: num(fd.get('payment_schedule_pct')),
    invoice_expected_date: str(fd.get('invoice_expected_date')),
    due_payment_date: str(fd.get('due_payment_date')),
    actual_payment_date: str(fd.get('actual_payment_date')),
    amount: num(fd.get('amount')) ?? 0,
    cost_no_taxes: num(fd.get('cost_no_taxes')) ?? 0,
    wht: num(fd.get('wht')) ?? 0,
    status: str(fd.get('status')) ?? 'Scheduled',
    notes: str(fd.get('notes')),
  }
}

export async function createCostPayment(contractId: string, fd: FormData) {
  const { supabase, orgId } = await getOrgId()
  fd.set('cost_contract_id', contractId)
  const payload = buildPaymentPayload(fd)
  const { error } = await supabase
    .from('cost_payments')
    .insert({ ...payload, org_id: orgId })
  if (error) {
    await redirectLocal(`/dashboard/costs/${contractId}?error=${encodeURIComponent(friendlyError(error))}`)
  }
  revalidatePath(`/dashboard/costs/${contractId}`)
  revalidatePath('/dashboard')
  await redirectLocal(`/dashboard/costs/${contractId}`)
}

export async function markPaymentPaid(paymentId: string, contractId: string, fd: FormData) {
  const { supabase } = await getOrgId()
  const actual_payment_date = str(fd.get('actual_payment_date')) ?? new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('cost_payments')
    .update({ actual_payment_date, status: 'Paid' })
    .eq('id', paymentId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/costs/${contractId}`)
  revalidatePath('/dashboard')
}

export async function softDeleteCostPayment(paymentId: string, contractId: string) {
  const { supabase } = await getOrgId()
  const { error } = await supabase
    .from('cost_payments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', paymentId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/costs/${contractId}`)
  revalidatePath('/dashboard')
}
