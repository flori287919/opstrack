import { createClient } from '@/lib/supabase/server'
import { createClientRecord, softDeleteClient } from './actions'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Klientët</h1>
        <p className="text-sm text-slate-500">Lista e klientëve dhe termave të tyre të pagesës</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-medium text-slate-900 mb-4">Shto klient</h2>
            <form action={createClientRecord} className="space-y-3">
              <Field label="Emri *" name="name" required />
              <Select label="Vendi" name="country" options={['', 'Shqipëri', 'Kosovë', 'Maqedoni e Veriut', 'Tjetër']} />
              <Field label="Kontakt person" name="contact_person" />
              <Field label="Email" name="email" type="email" />
              <Field label="Telefon" name="phone" />
              <Field label="Payment Terms (ditë)" name="payment_terms_days" type="number" />
              <Select label="Modaliteti default" name="default_modality" options={['', 'Contract', 'PO']} />
              <button type="submit" className="w-full px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                Ruaj
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-slate-700">
                  <th className="px-4 py-3 font-medium">Emri</th>
                  <th className="px-4 py-3 font-medium">Vendi</th>
                  <th className="px-4 py-3 font-medium">Kontakti</th>
                  <th className="px-4 py-3 font-medium text-right">Terms</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(clients ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      Asnjë klient akoma.
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
                      <td className="px-4 py-3 text-right text-slate-600">{c.payment_terms_days ?? 0} ditë</td>
                      <td className="px-4 py-3 text-right">
                        <form action={softDeleteClient.bind(null, c.id)}>
                          <button className="text-xs text-red-700 hover:underline">Fshi</button>
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

function Field({
  label,
  name,
  type = 'text',
  required,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
      />
    </label>
  )
}

function Select({
  label,
  name,
  options,
}: {
  label: string
  name: string
  options: string[]
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <select
        name={name}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white outline-none focus:ring-2 focus:ring-slate-900"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || '— Zgjidh —'}
          </option>
        ))}
      </select>
    </label>
  )
}
