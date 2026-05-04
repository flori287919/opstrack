import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDictionary, hasLocale } from '../../dictionaries'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: orgs } = await supabase.from('organizations').select('*').limit(1)
  const org = orgs?.[0]
  const localeTag = lang === 'en' ? 'en-US' : 'sq-AL'

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t.settings.title}</h1>
        <p className="text-sm text-slate-500">{t.settings.subtitle}</p>
      </div>

      <div className="space-y-4">
        <Card title={t.settings.organization}>
          <Row label={t.common.name} value={org?.name ?? '—'} />
          <Row label="Slug" value={org?.slug ?? '—'} mono />
          <Row label={t.settings.createdAt} value={org?.created_at ? new Date(org.created_at).toLocaleString(localeTag) : '—'} />
        </Card>

        <Card title={t.settings.yourAccount}>
          <Row label={t.common.email} value={user?.email ?? '—'} />
          <Row label={t.settings.userId} value={user?.id ?? '—'} mono small />
          <Row label={t.common.role} value={t.settings.director} />
        </Card>

        <Card title={t.settings.aboutApp}>
          <Row label={t.settings.appName} value={process.env.NEXT_PUBLIC_APP_NAME || t.appName} />
          <Row label={t.settings.version} value="0.1.0 (MVP)" />
        </Card>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="font-medium text-slate-900">{title}</h2>
      </div>
      <div className="p-5 space-y-2">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  small,
}: {
  label: string
  value: string
  mono?: boolean
  small?: boolean
}) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <div className="text-slate-500">{label}</div>
      <div className={`col-span-2 text-slate-900 ${mono ? 'font-mono' : ''} ${small ? 'text-xs' : ''}`}>
        {value}
      </div>
    </div>
  )
}
