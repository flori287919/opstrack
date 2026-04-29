import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvoiceForm } from '../InvoiceForm'
import { updateInvoice, softDeleteInvoice, markInvoicePaid } from '../actions'
import { formatDate } from '@/lib/format'

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error: errorMsg } = await searchParams
  const supabase = await createClient()

  const [{ data: invoice }, { data: projects }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    supabase
      .from('projects')
      .select('id, project_code, name')
      .is('deleted_at', null)
      .order('project_code'),
  ])

  if (!invoice) notFound()

  const update = updateInvoice.bind(null, id)
  const remove = softDeleteInvoice.bind(null, id)
  const markPaid = markInvoicePaid.bind(null, id)

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/invoices" className="text-sm text-slate-500 hover:text-slate-700">
          ← Faturat
        </Link>
        <div className="flex items-center justify-between mt-2 gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            Faturë <span className="font-mono">{invoice.invoice_number || invoice.id.slice(0, 8)}</span>
          </h1>
          <div className="flex gap-2">
            {invoice.status !== 'Paid' && (
              <form action={markPaid} className="flex gap-2 items-center">
                <input
                  type="date"
                  name="collection_date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="px-2 py-1.5 text-sm border border-slate-300 rounded"
                />
                <button className="text-sm px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Shëno si Paguar
                </button>
              </form>
            )}
            <form action={remove}>
              <button className="text-sm px-3 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50">
                Fshi
              </button>
            </form>
          </div>
        </div>
        {invoice.collection_date && (
          <p className="text-sm text-emerald-700 mt-1">
            Arkëtuar më {formatDate(invoice.collection_date)}
          </p>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{errorMsg}</div>
      )}

      <InvoiceForm action={update} initial={invoice} projects={projects ?? []} submitLabel="Ruaj ndryshimet" />
    </div>
  )
}
