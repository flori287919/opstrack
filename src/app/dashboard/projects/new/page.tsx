import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createProject } from '../actions'
import { ProjectForm } from '../ProjectForm'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const [{ data: bls }, { data: clients }, { data: beneficiaries }, { data: pms }] = await Promise.all([
    supabase.from('business_lines').select('id, code, name').is('deleted_at', null).order('code'),
    supabase.from('clients').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('beneficiaries').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('project_managers').select('id, name').is('deleted_at', null).order('name'),
  ])

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/projects" className="text-sm text-slate-500 hover:text-slate-700">
          ← Projektet
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-2">Projekt i ri</h1>
      </div>

      {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

      <ProjectForm
        action={createProject}
        bls={(bls ?? []).map((b) => ({ id: b.id, label: `${b.code} — ${b.name}` }))}
        clients={(clients ?? []).map((c) => ({ id: c.id, label: c.name }))}
        beneficiaries={(beneficiaries ?? []).map((b) => ({ id: b.id, label: b.name }))}
        pms={(pms ?? []).map((p) => ({ id: p.id, label: p.name }))}
        submitLabel="Krijo projektin"
      />
    </div>
  )
}
