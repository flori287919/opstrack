import Link from 'next/link'
import { notFound } from 'next/navigation'
import { signup } from './actions'
import { getDictionary, hasLocale } from '../dictionaries'

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  const { error } = await searchParams
  const appName = process.env.NEXT_PUBLIC_APP_NAME || t.appName

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">{appName}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.auth.signupTitle}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form action={signup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t.auth.orgNameLabel}
            </label>
            <input
              name="orgName"
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900"
            />
          </div>
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
            {t.auth.signupButton}
          </button>
        </form>

        <p className="text-sm text-center text-slate-600 mt-6">
          {t.auth.haveAccount}{' '}
          <Link href={`/${lang}/login`} className="text-slate-900 font-medium hover:underline">
            {t.auth.loginButton}
          </Link>
        </p>
      </div>
    </div>
  )
}
