import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: orgs } = await supabase.from('organizations').select('*').limit(1)
  const org = orgs?.[0]

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Konfigurimet e organizatës dhe llogarisë</p>
      </div>

      <div className="space-y-4">
        <Card title="Organizata">
          <Row label="Emri" value={org?.name ?? '—'} />
          <Row label="Slug" value={org?.slug ?? '—'} mono />
          <Row label="Krijuar" value={org?.created_at ? new Date(org.created_at).toLocaleString('sq-AL') : '—'} />
        </Card>

        <Card title="Llogaria juaj">
          <Row label="Email" value={user?.email ?? '—'} />
          <Row label="User ID" value={user?.id ?? '—'} mono small />
          <Row label="Roli" value="Drejtor" />
        </Card>

        <Card title="Mbi aplikacionin">
          <Row label="App Name" value={process.env.NEXT_PUBLIC_APP_NAME || 'Operations1'} />
          <Row label="Versioni" value="0.1.0 (MVP)" />
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
