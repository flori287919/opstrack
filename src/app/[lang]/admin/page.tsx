import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/admin'
import { getDictionary, hasLocale } from '../dictionaries'
import { formatDate } from '@/lib/format'
import { approveMembership, rejectMembership } from './actions'

export default async function AdminPage({
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
  if (!isSuperAdmin(user.email)) notFound()

  const { data: pending, error } = await supabase.rpc('list_pending_signups')

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link href={`/${lang}/dashboard`} className="text-sm text-slate-500 hover:text-slate-700">
          ← {t.nav.dashboard}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-2">{t.admin.title}</h1>
        <p className="text-sm text-slate-500">{t.admin.subtitle}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error.message}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-slate-700">
              <th className="px-4 py-3 font-medium">{t.common.email}</th>
              <th className="px-4 py-3 font-medium">{t.admin.orgName}</th>
              <th className="px-4 py-3 font-medium">{t.admin.requestedAt}</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {(pending ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                  {t.admin.empty}
                </td>
              </tr>
            ) : (
              (pending ?? []).map((p: { org_id: string; user_id: string; email: string; org_name: string; created_at: string }) => {
                const approve = approveMembership.bind(null, p.org_id, p.user_id)
                const reject = rejectMembership.bind(null, p.org_id)
                return (
                  <tr key={p.user_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{p.email}</td>
                    <td className="px-4 py-3 text-slate-700">{p.org_name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <form action={approve}>
                          <button className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700">
                            {t.admin.approve}
                          </button>
                        </form>
                        <form action={reject}>
                          <button className="text-xs px-3 py-1.5 border border-red-200 text-red-700 rounded hover:bg-red-50">
                            {t.admin.reject}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
