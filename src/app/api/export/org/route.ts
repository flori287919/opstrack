import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TABLES = [
  'business_lines',
  'clients',
  'beneficiaries',
  'project_managers',
  'projects',
  'deliverables',
  'invoices',
  'cost_contracts',
  'cost_payments',
  'people',
  'people_allocations',
  'timesheets',
  'audit_log',
] as const

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, role, approved')
    .eq('user_id', user.id)
    .eq('approved', true)
    .limit(1)
    .maybeSingle()
  if (!membership) return new NextResponse('Forbidden', { status: 403 })

  const orgId = membership.org_id

  const [orgRow, members, ...rest] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).maybeSingle(),
    supabase.from('org_members').select('*').eq('org_id', orgId),
    ...TABLES.map((t) => supabase.from(t).select('*').eq('org_id', orgId)),
  ])

  const dump: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    schema_version: '1.0',
    organization: orgRow.data ?? null,
    org_members: members.data ?? [],
  }
  TABLES.forEach((t, i) => {
    dump[t] = rest[i]?.data ?? []
  })

  const slug = (orgRow.data as { slug?: string } | null)?.slug ?? 'org'
  const filename = `${slug}_export_${new Date().toISOString().slice(0, 10)}.json`
  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
