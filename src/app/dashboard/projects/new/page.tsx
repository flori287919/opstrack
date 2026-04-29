import Link from 'next/link'
import { createProject } from '../actions'
import { ProjectForm } from '../ProjectForm'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/projects" className="text-sm text-slate-500 hover:text-slate-700">
          ← Projektet
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-2">Projekt i ri</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <ProjectForm action={createProject} submitLabel="Krijo projektin" />
    </div>
  )
}
