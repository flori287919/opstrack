import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '../login/actions'
import { getDictionary, hasLocale } from '../dictionaries'
import { LocaleSwitcher } from './LocaleSwitcher'
import { isSuperAdmin } from '@/lib/admin'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/login`)

  // Block non-approved users from the dashboard.
  const { data: member } = await supabase
    .from('org_members')
    .select('approved')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!member?.approved) redirect(`/${lang}/pending`)

  const superAdmin = isSuperAdmin(user.email)

  const appName = t.appName

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(1)
  const orgName = orgs?.[0]?.name ?? '—'

  const NAV = [
    { href: `/${lang}/dashboard`, label: t.nav.dashboard },
    { href: `/${lang}/dashboard/projects`, label: t.nav.projects },
    { href: `/${lang}/dashboard/invoices`, label: t.nav.invoices },
    { href: `/${lang}/dashboard/costs`, label: t.nav.costs },
    { href: `/${lang}/dashboard/people`, label: t.nav.people },
    { href: `/${lang}/dashboard/clients`, label: t.nav.clients },
    { href: `/${lang}/dashboard/lookups`, label: t.nav.lookups },
    { href: `/${lang}/dashboard/import`, label: t.nav.import },
    { href: `/${lang}/dashboard/audit`, label: t.nav.audit },
    { href: `/${lang}/dashboard/settings`, label: t.nav.settings },
    ...(superAdmin ? [{ href: `/${lang}/admin`, label: t.nav.admin }] : []),
  ]

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="text-lg font-semibold text-slate-900">{appName}</div>
          <div className="text-xs text-slate-500 truncate" title={orgName}>
            {orgName}
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200 space-y-2">
          <div className="px-3 py-1 text-xs text-slate-500 truncate">
            {user.email}
          </div>
          <LocaleSwitcher current={lang} />
          <form action={logout}>
            <button className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100">
              {t.auth.logout}
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
