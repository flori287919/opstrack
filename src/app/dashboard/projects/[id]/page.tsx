import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectForm } from '../ProjectForm'
import { updateProject, softDeleteProject } from '../actions'

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error: errorMsg } = await searchParams
  const supabase = await createClient()

  const [{ data: project }, { data: bls }, { data: clients }, { data: beneficiaries }, { data: pms }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('business_lines').select('id, code, name').is('deleted_at', null).order('code'),
    supabase.from('clients').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('beneficiaries').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('project_managers').select('id, name').is('deleted_at', null).order('name'),
  ])

  if (!project) notFound()

  const update = updateProject.bind(null, id)
  const remove = softDeleteProject.bind(null, id)

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/projects" className="text-sm text-slate-500 hover:text-slate-700">
          ← Projektet
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            {project.project_code} <span className="text-slate-400 font-normal">— {project.name}</span>
          </h1>
          <form action={remove}>
            <button className="text-sm px-3 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50">
              Fshi
            </button>
          </form>
        </div>
      </div>

      {errorMsg && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{errorMsg}</div>}

      <ProjectForm
        action={update}
        initial={project}
        bls={(bls ?? []).map((b) => ({ id: b.id, label: `${b.code} — ${b.name}` }))}
        clients={(clients ?? []).map((c) => ({ id: c.id, label: c.name }))}
        beneficiaries={(beneficiaries ?? []).map((b) => ({ id: b.id, label: b.name }))}
        pms={(pms ?? []).map((p) => ({ id: p.id, label: p.name }))}
        submitLabel="Ruaj ndryshimet"
      />
    </div>
  )
}
