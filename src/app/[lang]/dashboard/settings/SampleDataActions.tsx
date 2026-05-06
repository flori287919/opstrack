'use client'

import { useState, useTransition } from 'react'
import { clearSampleData, loadSampleData } from './actions'

type Labels = {
  loadButton: string
  clearButton: string
  loading: string
  confirmClear: string
}

export function SampleDataActions({ initialHasSample, labels }: { initialHasSample: boolean; labels: Labels }) {
  const [hasSample, setHasSample] = useState(initialHasSample)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const onLoad = () => {
    setMessage(null)
    startTransition(async () => {
      const res = await loadSampleData()
      setMessage({ ok: res.ok, text: res.message })
      if (res.ok) setHasSample(true)
    })
  }

  const onClear = () => {
    if (!confirm(labels.confirmClear)) return
    setMessage(null)
    startTransition(async () => {
      const res = await clearSampleData()
      setMessage({ ok: res.ok, text: res.message })
      if (res.ok) setHasSample(false)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {!hasSample && (
          <button
            onClick={onLoad}
            disabled={pending}
            className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending ? labels.loading : labels.loadButton}
          </button>
        )}
        {hasSample && (
          <button
            onClick={onClear}
            disabled={pending}
            className="px-4 py-2 text-sm font-medium bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            {pending ? labels.loading : labels.clearButton}
          </button>
        )}
      </div>
      {message && (
        <div
          className={`text-sm rounded-md p-3 ${
            message.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
