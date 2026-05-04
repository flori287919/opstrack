import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createInvoice } from '../actions'
import { InvoiceForm } from '../InvoiceForm'
import { getDictionary, hasLocale } from '../../../dictionaries'
import { invoiceFormDict } from '../form-dict'

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const { error } = await searchParams
  const supabase = await createClient()
  const [{ data: projects }, { data: deliverables }] = await Promise.all([
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

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href={`/${lang}/dashboard/invoices`} className="text-sm text-slate-500 hover:text-slate-700">
          ← {t.invoices.title}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-2">{t.invoices.newTitle}</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {(projects ?? []).length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
          <p className="font-medium">{t.invoices.noProjects}</p>
          <p className="text-sm mt-1">
            {t.invoices.noProjectsHint}{' '}
            <Link href={`/${lang}/dashboard/projects/new`} className="underline">
              {t.invoices.noProjectsLink}
            </Link>
            .
          </p>
        </div>
      ) : (
        <InvoiceForm
          action={createInvoice}
          projects={projects ?? []}
          deliverables={deliverables ?? []}
          submitLabel={t.invoices.createButton}
          dict={invoiceFormDict(t)}
        />
      )}
    </div>
  )
}
