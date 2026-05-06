import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '../dictionaries'
import { requestReset } from './actions'

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const { sent, error } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">{t.appName}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.auth.forgotPasswordTitle}</p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            {t.auth.resetEmailSent}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-4">{t.auth.forgotPasswordDesc}</p>
            {error && (
              <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
            )}
            <form action={requestReset.bind(null, lang)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.auth.emailLabel}
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition"
              >
                {t.auth.sendResetLink}
              </button>
            </form>
          </>
        )}

        <p className="text-sm text-center text-slate-600 mt-6">
          <Link href={`/${lang}/login`} className="text-slate-900 font-medium hover:underline">
            {t.auth.backToLogin}
          </Link>
        </p>
      </div>
    </div>
  )
}
