import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createInvoice } from '../actions'
import { InvoiceForm } from '../InvoiceForm'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_code, name')
    .is('deleted_at', null)
    .order('project_code')

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/invoices" className="text-sm text-slate-500 hover:text-slate-700">
          ← Faturat
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-2">Faturë e re</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {(projects ?? []).length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
          <p className="font-medium">S&apos;ke ende projekt.</p>
          <p className="text-sm mt-1">
            Krijo një projekt fillimisht te{' '}
            <Link href="/dashboard/projects/new" className="underline">
              Projektet → Projekt i ri
            </Link>
            .
          </p>
        </div>
      ) : (
        <InvoiceForm action={createInvoice} projects={projects ?? []} submitLabel="Krijo faturën" />
      )}
    </div>
  )
}
