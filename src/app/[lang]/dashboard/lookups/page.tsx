import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  createBL, deleteBL,
  createBeneficiary, deleteBeneficiary,
  createPM, deletePM,
} from './actions'
import { getDictionary, hasLocale } from '../../dictionaries'

export default async function LookupsPage({
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
  const [{ data: bls }, { data: beneficiaries }, { data: pms }] = await Promise.all([
    supabase.from('business_lines').select('*').is('deleted_at', null).order('code'),
    supabase.from('beneficiaries').select('*').is('deleted_at', null).order('name'),
    supabase.from('project_managers').select('*').is('deleted_at', null).order('name'),
  ])

  const countryOptions = lang === 'en'
    ? ['', 'Albania', 'Kosovo', 'North Macedonia', 'Other']
    : ['', 'Shqipëri', 'Kosovë', 'Maqedoni e Veriut', 'Tjetër']

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t.lookups.title}</h1>
        <p className="text-sm text-slate-500">{t.lookups.subtitle}</p>
      </div>

      {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section
          title={t.lookups.businessLines}
          rows={bls ?? []}
          renderRow={(b) => (
            <>
              <span className="font-mono text-slate-900">{b.code}</span>
              <span className="text-slate-700 ml-2">{b.name}</span>
            </>
          )}
          onDelete={(id) => deleteBL.bind(null, id)}
          emptyText={t.lookups.noEntries}
          deleteLabel={t.common.delete}
          form={
            <form action={createBL} className="space-y-2">
              <Field label={`${t.lookups.code} *`} name="code" placeholder="IN" required />
              <Field label={`${t.common.name} *`} name="name" placeholder="Innovation" required />
              <Field label={t.lookups.description} name="description" />
              <Submit label={t.lookups.addNew} />
            </form>
          }
        />

        <Section
          title={t.lookups.beneficiaries}
          rows={beneficiaries ?? []}
          renderRow={(b) => (
            <>
              <span className="text-slate-900">{b.name}</span>
              {b.country && <span className="text-xs text-slate-500 ml-2">{b.country}</span>}
            </>
          )}
          onDelete={(id) => deleteBeneficiary.bind(null, id)}
          emptyText={t.lookups.noEntries}
          deleteLabel={t.common.delete}
          form={
            <form action={createBeneficiary} className="space-y-2">
              <Field label={`${t.common.name} *`} name="name" required />
              <Select label={t.common.country} name="country" options={countryOptions} placeholder={t.common.select} />
              <Field label={t.common.notes} name="notes" />
              <Submit label={t.lookups.addNew} />
            </form>
          }
        />

        <Section
          title={t.lookups.projectManagers}
          rows={pms ?? []}
          renderRow={(p) => (
            <>
              <span className="text-slate-900">{p.name}</span>
              {p.role && <span className="text-xs text-slate-500 ml-2">{p.role}</span>}
            </>
          )}
          onDelete={(id) => deletePM.bind(null, id)}
          emptyText={t.lookups.noEntries}
          deleteLabel={t.common.delete}
          form={
            <form action={createPM} className="space-y-2">
              <Field label={`${t.common.name} *`} name="name" required />
              <Field label={t.common.email} name="email" type="email" />
              <Select label={t.common.role} name="role" options={['', 'Senior PM', 'PM', 'Junior PM', 'Other']} placeholder={t.common.select} />
              <Submit label={t.lookups.addNew} />
            </form>
          }
        />
      </div>
    </div>
  )
}

function Section<T extends { id: string }>({
  title,
  rows,
  renderRow,
  onDelete,
  form,
  emptyText,
  deleteLabel,
}: {
  title: string
  rows: T[]
  renderRow: (row: T) => React.ReactNode
  onDelete: (id: string) => (() => Promise<void>)
  form: React.ReactNode
  emptyText: string
  deleteLabel: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="font-medium text-slate-900">{title}</h2>
      </div>
      <div className="p-5">
        {form}
        <div className="mt-5 -mx-5 -mb-5 px-5 py-3 bg-slate-50 border-t border-slate-200 max-h-72 overflow-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-3">{emptyText}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="py-2 flex items-center justify-between text-sm">
                  <div>{renderRow(r)}</div>
                  <form action={onDelete(r.id)}>
                    <button className="text-xs text-red-700 hover:underline">{deleteLabel}</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label, name, type = 'text', placeholder, required,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
      />
    </label>
  )
}

function Select({ label, name, options, placeholder }: { label: string; name: string; options: string[]; placeholder: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <select name={name} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded text-slate-900 bg-white outline-none focus:ring-2 focus:ring-slate-900">
        {options.map((o) => (
          <option key={o} value={o}>{o || placeholder}</option>
        ))}
      </select>
    </label>
  )
}

function Submit({ label }: { label: string }) {
  return (
    <button type="submit" className="w-full px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-800">
      {label}
    </button>
  )
}
