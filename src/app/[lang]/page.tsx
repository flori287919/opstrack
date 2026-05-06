import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDictionary, hasLocale } from './dictionaries'

export default async function Home({
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

  if (user) {
    redirect(`/${lang}/dashboard`)
  }

  const appName = t.appName

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">{appName}</h1>
          <div className="flex gap-3">
            <Link
              href={`/${lang}/login`}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              {t.landing.signIn}
            </Link>
            <Link
              href={`/${lang}/signup`}
              className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              {t.landing.signUp}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-semibold text-slate-900 leading-tight">
            {t.landing.heroTitle}
          </h2>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            {t.landing.heroSubtitle}
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <Link
              href={`/${lang}/signup`}
              className="px-6 py-3 text-base font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              {t.landing.ctaSignup}
            </Link>
            <Link
              href={`/${lang}/login`}
              className="px-6 py-3 text-base font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
            >
              {t.landing.signIn}
            </Link>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: t.landing.feature1Title, text: t.landing.feature1Text },
            { title: t.landing.feature2Title, text: t.landing.feature2Text },
            { title: t.landing.feature3Title, text: t.landing.feature3Text },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white border border-slate-200 rounded-xl p-6"
            >
              <h3 className="font-medium text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-600 mt-2">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
