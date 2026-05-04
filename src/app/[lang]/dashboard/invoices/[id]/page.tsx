import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvoiceForm } from '../InvoiceForm'
import { updateInvoice, softDeleteInvoice, markInvoicePaid } from '../actions'
import { formatDate } from '@/lib/format'
import { getDictionary, hasLocale } from '../../../dictionaries'
import { invoiceFormDict } from '../form-dict'

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const { error: errorMsg } = await searchParams
  const supabase = await createClient()

  const [{ data: invoice }, { data: projects }, { data: deliverables }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    supabase
      .from('projects')
      .select('id, project_code, name')
      .is('deleted_at', null)
      .order('project_code'),
    supabase
      .from('deliverables')
      .select('id, project_id, code, name, status')
      .is('deleted_at', null)
      .order('code'),
  ])

  if (!invoice) notFound()

  const update = updateInvoice.bind(null, id)
  const remove = softDeleteInvoice.bind(null, id)
  const markPaid = markInvoicePaid.bind(null, id)
  const invoiceWord = lang === 'en' ? 'Invoice' : 'Faturë'

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href={`/${lang}/dashboard/invoices`} className="text-sm text-slate-500 hover:text-slate-700">
          ← {t.invoices.title}
        </Link>
        <div className="flex items-center justify-between mt-2 gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            {invoiceWord} <span className="font-mono">{invoice.invoice_number || invoice.id.slice(0, 8)}</span>
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
                  {t.invoices.markPaid}
                </button>
              </form>
            )}
            <form action={remove}>
              <button className="text-sm px-3 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50">
                {t.common.delete}
              </button>
            </form>
          </div>
        </div>
        {invoice.collection_date && (
          <p className="text-sm text-emerald-700 mt-1">
            {t.invoices.collectedOn} {formatDate(invoice.collection_date)}
          </p>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{errorMsg}</div>
      )}

      <InvoiceForm
        action={update}
        initial={invoice}
        projects={projects ?? []}
        deliverables={deliverables ?? []}
        submitLabel={t.common.saveChanges}
        dict={invoiceFormDict(t)}
      />
    </div>
  )
}
