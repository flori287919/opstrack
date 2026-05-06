import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '../../dictionaries'
import { ImportTabs } from './ImportTabs'

export default async function ImportPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = await getDictionary(lang)
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t.import.title}</h1>
        <p className="text-sm text-slate-500">{t.import.subtitle}</p>
      </div>
      <ImportTabs t={t.import} />
    </div>
  )
}
