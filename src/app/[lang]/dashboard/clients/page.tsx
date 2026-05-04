import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClientRecord, softDeleteClient } from './actions'
import { getDictionary, hasLocale } from '../../dictionaries'
import { Field, Select } from '@/components/forms'

export default async function ClientsPage({
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
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .is('deleted_at', null)
    .order('name')

  const countryOptions = lang === 'en'
    ? ['', 'Albania', 'Kosovo', 'North Macedonia', 'Other']
    : ['', 'Shqipëri', 'Kosovë', 'Maqedoni e Veriut', 'Tjetër']
  const placeholder = t.common.select

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t.clients.title}</h1>
        <p className="text-sm text-slate-500">{t.clients.subtitle}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-medium text-slate-900 mb-4">{t.clients.addClient}</h2>
            <form action={createClientRecord} className="space-y-3">
              <Field size="md" label={`${t.common.name} *`} name="name" required />
              <Select size="md" label={t.common.country} name="country" options={countryOptions} placeholder={placeholder} />
              <Field size="md" label={t.clients.contactPerson} name="contact_person" />
              <Field size="md" label={t.common.email} name="email" type="email" />
              <Field size="md" label={t.common.phone} name="phone" />
              <Field size="md" label={t.clients.paymentTermsDays} name="payment_terms_days" type="number" />
              <Select size="md" label={t.clients.defaultModality} name="default_modality" options={['', 'Contract', 'PO']} placeholder={placeholder} />
              <button type="submit" className="w-full px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                {t.common.save}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-slate-700">
                  <th className="px-4 py-3 font-medium">{t.common.name}</th>
                  <th className="px-4 py-3 font-medium">{t.common.country}</th>
                  <th className="px-4 py-3 font-medium">{t.clients.contactCol}</th>
                  <th className="px-4 py-3 font-medium text-right">{t.clients.termsCol}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(clients ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      {t.clients.noClients}
                    </td>
                  </tr>
                ) : (
                  (clients ?? []).map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-900">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600">{c.country || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.contact_person || '—'}
                        {c.email && (
                          <div className="text-xs text-slate-500">{c.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{c.payment_terms_days ?? 0} {t.clients.days}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={softDeleteClient.bind(null, c.id)}>
                          <button className="text-xs text-red-700 hover:underline">{t.common.delete}</button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

