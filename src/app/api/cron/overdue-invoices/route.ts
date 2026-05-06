import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type OverdueInvoice = {
  id: string
  org_id: string
  invoice_number: string | null
  amount_no_vat: number | null
  planned_collection_date: string | null
  project: { project_code: string | null; name: string | null; client: { name: string | null } | null } | null
}

type OrgBucket = {
  orgId: string
  orgName: string
  invoices: OverdueInvoice[]
  total: number
}

const todayISO = () => new Date().toISOString().slice(0, 10)

const formatEUR = (n: number) =>
  new Intl.NumberFormat('sq-AL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function daysOverdue(planned: string | null): number {
  if (!planned) return 0
  const ms = Date.now() - new Date(planned).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

function renderHtml(orgName: string, invoices: OverdueInvoice[], total: number, baseUrl: string): string {
  const rows = invoices
    .map((inv) => {
      const project = Array.isArray(inv.project) ? inv.project[0] : inv.project
      const client = project ? (Array.isArray(project.client) ? project.client[0] : project.client) : null
      const days = daysOverdue(inv.planned_collection_date)
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;">${escapeHtml(inv.invoice_number ?? '—')}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;">${escapeHtml(client?.name ?? '—')}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">${escapeHtml(project?.project_code ?? '')} ${escapeHtml(project?.name ?? '')}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;text-align:right;">${formatEUR(Number(inv.amount_no_vat ?? 0))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#dc2626;text-align:right;">${days}</td>
        </tr>
      `
    })
    .join('')

  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8fafc;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <tr><td align="center">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="640" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
      <tr><td style="padding:24px 32px 8px 32px;">
        <h1 style="margin:0;font-size:18px;font-weight:600;color:#0f172a;">${escapeHtml(orgName)} — Fatura overdue</h1>
        <p style="margin:8px 0 0 0;font-size:13px;color:#64748b;">Përmbledhje e datës ${todayISO()}</p>
      </td></tr>
      <tr><td style="padding:16px 32px 8px 32px;">
        <p style="margin:0;font-size:14px;color:#0f172a;">Janë <strong>${invoices.length}</strong> fatura të vonuara me total <strong>${formatEUR(total)}</strong>.</p>
      </td></tr>
      <tr><td style="padding:16px 32px 24px 32px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th align="left" style="padding:10px 12px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Fatura</th>
              <th align="left" style="padding:10px 12px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Klienti</th>
              <th align="left" style="padding:10px 12px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Projekti</th>
              <th align="right" style="padding:10px 12px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Shuma</th>
              <th align="right" style="padding:10px 12px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Ditë vonesë</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 32px 32px;">
        <a href="${baseUrl}/sq/dashboard/invoices?filter=overdue" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:500;font-size:14px;padding:10px 24px;border-radius:8px;">Hape listën e plotë</a>
      </td></tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:11px;color:#94a3b8;">OpsTrack — Operations Management</p>
  </td></tr>
</table>
`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select(
      'id, org_id, invoice_number, amount_no_vat, planned_collection_date, project:projects(project_code, name, client:clients(name))'
    )
    .is('deleted_at', null)
    .is('collection_date', null)
    .lt('planned_collection_date', todayISO())

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 })
  }
  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, orgs: 0, message: 'no overdue invoices' })
  }

  const buckets = new Map<string, OrgBucket>()
  for (const inv of invoices as unknown as OverdueInvoice[]) {
    const bucket = buckets.get(inv.org_id) ?? { orgId: inv.org_id, orgName: '', invoices: [], total: 0 }
    bucket.invoices.push(inv)
    bucket.total += Number(inv.amount_no_vat ?? 0)
    buckets.set(inv.org_id, bucket)
  }

  const orgIds = Array.from(buckets.keys())
  const { data: orgs } = await supabase.from('organizations').select('id, name').in('id', orgIds)
  for (const o of orgs ?? []) {
    const b = buckets.get(o.id)
    if (b) b.orgName = o.name
  }

  const { data: members } = await supabase
    .from('org_members')
    .select('org_id, user_id')
    .eq('approved', true)
    .in('org_id', orgIds)

  const userIds = Array.from(new Set((members ?? []).map((m) => m.user_id)))
  const emailByUserId = new Map<string, string>()
  for (const id of userIds) {
    const { data, error } = await supabase.auth.admin.getUserById(id)
    if (!error && data.user?.email) emailByUserId.set(id, data.user.email)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://opstrack-xi.vercel.app'
  const results: Array<{ orgId: string; recipients: string[]; status: 'sent' | 'skipped' | 'error'; reason?: string }> = []

  for (const bucket of buckets.values()) {
    const orgMembers = (members ?? []).filter((m) => m.org_id === bucket.orgId)
    const recipients = orgMembers
      .map((m) => emailByUserId.get(m.user_id))
      .filter((e): e is string => Boolean(e))

    if (recipients.length === 0) {
      results.push({ orgId: bucket.orgId, recipients: [], status: 'skipped', reason: 'no recipients' })
      continue
    }

    try {
      await sendEmail({
        to: recipients,
        subject: `${bucket.orgName} — ${bucket.invoices.length} fatura overdue (${formatEUR(bucket.total)})`,
        html: renderHtml(bucket.orgName, bucket.invoices, bucket.total, baseUrl),
      })
      results.push({ orgId: bucket.orgId, recipients, status: 'sent' })
    } catch (err) {
      results.push({
        orgId: bucket.orgId,
        recipients,
        status: 'error',
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({
    ok: true,
    orgs: buckets.size,
    sent: results.filter((r) => r.status === 'sent').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    errors: results.filter((r) => r.status === 'error').length,
    results,
  })
}
