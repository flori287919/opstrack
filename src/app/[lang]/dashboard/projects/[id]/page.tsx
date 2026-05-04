import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectForm } from '../ProjectForm'
import { updateProject, softDeleteProject } from '../actions'
import { DeliverablesSection } from './DeliverablesSection'
import { PeopleSection } from './PeopleSection'
import { getDictionary, hasLocale } from '../../../dictionaries'
import { projectFormDict } from '../form-dict'

export default async function ProjectDetailPage({
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

  const [
    { data: project },
    { data: bls },
    { data: clients },
    { data: beneficiaries },
    { data: pms },
    { data: deliverables },
    { data: people },
    { data: allocations },
    { data: timesheets },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('business_lines').select('id, code, name').is('deleted_at', null).order('code'),
    supabase.from('clients').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('beneficiaries').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('project_managers').select('id, name').is('deleted_at', null).order('name'),
    supabase
      .from('deliverables')
      .select('id, code, name, description, planned_date, actual_date, planned_value_no_vat, status, notes')
      .eq('project_id', id)
      .is('deleted_at', null)
      .order('code'),
    supabase
      .from('people')
      .select('id, name, employment_type, monthly_salary, daily_rate, hourly_rate, default_billable_daily_rate')
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('people_allocations')
      .select('id, person_id, project_id, allocation_pct, start_date, end_date, billable_daily_rate, person:people(name, employment_type)')
      .eq('project_id', id)
      .is('deleted_at', null)
      .order('start_date', { ascending: false }),
    supabase
      .from('timesheets')
      .select('id, person_id, project_id, date, hours, description, person:people(name)')
      .eq('project_id', id)
      .is('deleted_at', null)
      .order('date', { ascending: false }),
  ])

  if (!project) notFound()

  const update = updateProject.bind(null, id)
  const remove = softDeleteProject.bind(null, id)

  const allocationRows = (allocations ?? []).map((a) => ({
    ...a,
    person: Array.isArray(a.person) ? a.person[0] : a.person,
  }))
  const timesheetRows = (timesheets ?? []).map((tt) => ({
    ...tt,
    person: Array.isArray(tt.person) ? tt.person[0] : tt.person,
  }))

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href={`/${lang}/dashboard/projects`} className="text-sm text-slate-500 hover:text-slate-700">
          ← {t.projects.title}
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            {project.project_code} <span className="text-slate-400 font-normal">— {project.name}</span>
          </h1>
          <form action={remove}>
            <button className="text-sm px-3 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50">
              {t.common.delete}
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
        submitLabel={t.common.saveChanges}
        lang={lang}
        dict={projectFormDict(t)}
      />

      <DeliverablesSection
        projectId={id}
        projectValue={Number(project.project_value_no_vat ?? 0)}
        deliverables={deliverables ?? []}
        dict={{
          title: t.projects.deliverables,
          subtitle: t.projects.deliverablesSubtitle,
          planned: t.projects.deliverablePlanned,
          remaining: t.projects.deliverableRemaining,
          empty: t.projects.noDeliverables,
          code: t.projects.deliverableCode,
          name: t.projects.deliverableName,
          plannedDate: t.projects.deliverablePlannedDate,
          valueNoVat: t.projects.valueNoVat,
          actionAdd: t.common.add,
          actionStart: t.projects.actionStart,
          actionSubmit: t.projects.actionSubmit,
          actionAccept: t.projects.actionAccept,
          actionDelete: t.common.delete,
          labelPlanned: t.projects.labelPlanned,
          labelDelivered: t.projects.labelDelivered,
        }}
      />

      <PeopleSection
        projectId={id}
        projectStart={project.project_start_date ?? project.contract_start_date ?? null}
        projectEnd={project.planned_end_date ?? project.contract_end_date ?? null}
        people={people ?? []}
        allocations={allocationRows}
        timesheets={timesheetRows}
        dict={{
          title: t.projects.peopleAllocated,
          subtitle: t.projects.peopleAllocatedSubtitle,
          peopleCost: t.projects.peopleCost,
          billable: t.projects.billable,
          peopleMargin: t.projects.peopleMargin,
          person: t.projects.person,
          allocPct: t.projects.allocPct,
          startDate: t.people.startDate,
          endDate: t.people.endDate,
          actionAdd: t.common.add,
          actionDelete: t.common.delete,
          noAllocations: t.projects.noAllocations,
          timesheets: t.projects.timesheets,
          timesheetSubtitle: t.projects.timesheetSubtitle,
          addHours: t.projects.addHours,
          noHours: t.projects.noHours,
          description: t.projects.description,
          personPlaceholder: t.common.select,
          hoursLabel: lang === 'en' ? 'Hours' : 'Orë',
          moreOthers: t.audit.moreOthers,
        }}
      />
    </div>
  )
}
