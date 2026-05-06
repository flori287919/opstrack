import Link from 'next/link'
import { notFound } from 'next/navigation'
import { login } from './actions'
import { getDictionary, hasLocale } from '../dictionaries'

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ error?: string; info?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const { error, info } = await searchParams
  const appName = t.appName
  const infoMessage = info === 'password_updated' ? t.auth.passwordUpdatedInfo : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">{appName}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.auth.loginTitle}</p>
        </div>

        {infoMessage && (
          <div className="mb-4 p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            {infoMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form action={login} className="space-y-4">
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t.auth.passwordLabel}
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition"
          >
            {t.auth.loginButton}
          </button>
        </form>

        <p className="text-sm text-center text-slate-600 mt-4">
          <Link href={`/${lang}/forgot-password`} className="hover:underline">
            {t.auth.forgotPasswordLink}
          </Link>
        </p>

        <p className="text-sm text-center text-slate-600 mt-4">
          {t.auth.noAccount}{' '}
          <Link href={`/${lang}/signup`} className="text-slate-900 font-medium hover:underline">
            {t.auth.signupButton}
          </Link>
        </p>
      </div>
    </div>
  )
}
