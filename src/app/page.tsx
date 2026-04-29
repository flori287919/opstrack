import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Operations1'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">{appName}</h1>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Hyr
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              Regjistrohu
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-semibold text-slate-900 leading-tight">
            Operacionet e biznesit, pa kaosin e Excel-it.
          </h2>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Ndiq projekte, fatura, kosto, dhe arkëtime në një vend.
            Histori e plotë e ndryshimeve. Pa të dhëna që humbasin.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <Link
              href="/signup"
              className="px-6 py-3 text-base font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              Fillo falas
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 text-base font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
            >
              Hyr
            </Link>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Faturat dhe arkëtimi',
              text: 'Shih çdo faturë, statusin, dhe sa para janë "mbërthyer" te klientët.',
            },
            {
              title: 'Kosto subko / non-people',
              text: 'Ndiq pagesat ndaj furnitorëve, datat e pritura, WHT, VAT.',
            },
            {
              title: 'Histori dhe restaurim',
              text: 'Çdo ndryshim regjistrohet. Të dhëna të fshira mund të kthehen.',
            },
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
