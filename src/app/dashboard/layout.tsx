import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/login/actions'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/projects', label: 'Projektet' },
  { href: '/dashboard/invoices', label: 'Faturat' },
  { href: '/dashboard/costs', label: 'Kostot' },
  { href: '/dashboard/clients', label: 'Klientët' },
  { href: '/dashboard/audit', label: 'Histori' },
  { href: '/dashboard/settings', label: 'Settings' },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Operations1'

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(1)
  const orgName = orgs?.[0]?.name ?? '—'

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
        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 text-xs text-slate-500 truncate">
            {user.email}
          </div>
          <form action={logout}>
            <button className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100">
              Dil
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
