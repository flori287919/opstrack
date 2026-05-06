'use client'

import { useTransition, useState } from 'react'
import { loadSampleData } from './settings/actions'

export function EmptyStateBanner({
  title,
  body,
  loadButton,
  loading,
  successPrefix,
}: {
  title: string
  body: string
  loadButton: string
  loading: string
  successPrefix: string
}) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<string | null>(null)

  const onLoad = () => {
    startTransition(async () => {
      const res = await loadSampleData()
      if (res.ok) {
        setDone(`${successPrefix}: ${res.message}`)
        // Force a reload so server components re-render with fresh data
        setTimeout(() => window.location.reload(), 800)
      } else {
        setDone(res.message)
      }
    })
  }

  return (
    <div className="mb-6 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5">
      <h3 className="font-medium text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 mb-3 max-w-2xl">{body}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={onLoad}
          disabled={pending || !!done}
          className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? loading : loadButton}
        </button>
        {done && <span className="text-sm text-slate-700">{done}</span>}
      </div>
    </div>
  )
}
