import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '../login/actions'
import { getDictionary, hasLocale } from '../dictionaries'

export default async function PendingPage({
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
  if (!user) redirect(`/${lang}/login`)

  // Already approved? send them to the dashboard.
  const { data: member } = await supabase
    .from('org_members')
    .select('approved')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (member?.approved) redirect(`/${lang}/dashboard`)

  const appName = t.appName

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-2xl font-semibold text-slate-900 mb-1">{appName}</div>
        <div className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 mb-6">
          {t.pending.badge}
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-3">
          {t.pending.title}
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          {t.pending.body}
        </p>
        <div className="text-xs text-slate-500 mb-6">
          {t.pending.signedInAs} <span className="font-mono">{user.email}</span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
          >
            {t.auth.logout}
          </button>
        </form>
      </div>
    </div>
  )
}
