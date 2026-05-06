'use client'

import { useState, useTransition } from 'react'
import { commitImport, previewImport } from './actions'
import type { ImportEntity } from '@/lib/excel-templates'

type ImportDict = {
  title: string
  subtitle: string
  order: string
  download: string
  upload: string
  preview: string
  commit: string
  reset: string
  noFile: string
  loading: string
  errors: string
  validRows: string
  totalRows: string
  insertedOk: string
  group: { lookups: string; clients: string; people: string; projects: string; invoices: string; costs: string }
  entity: Record<ImportEntity, string>
  hint: Record<ImportEntity, string>
}

type Tab = { entity: ImportEntity; group: keyof ImportDict['group'] }

const TABS: Tab[] = [
  { entity: 'business_lines', group: 'lookups' },
  { entity: 'beneficiaries', group: 'lookups' },
  { entity: 'project_managers', group: 'lookups' },
  { entity: 'clients', group: 'clients' },
  { entity: 'people', group: 'people' },
  { entity: 'projects', group: 'projects' },
  { entity: 'invoices', group: 'invoices' },
  { entity: 'cost_contracts', group: 'costs' },
  { entity: 'cost_payments', group: 'costs' },
  { entity: 'allocations', group: 'people' },
  { entity: 'timesheets', group: 'people' },
]

type PreviewState = {
  ok: boolean
  total: number
  validCount: number
  errors: Array<{ row: number; message: string }>
  preview: Array<Record<string, unknown>>
}

type CommitState = {
  ok: boolean
  inserted: number
  errors: Array<{ row: number; message: string }>
}

export function ImportTabs({ t }: { t: ImportDict }) {
  const [active, setActive] = useState<ImportEntity>('business_lines')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [commit, setCommit] = useState<CommitState | null>(null)
  const [pending, startTransition] = useTransition()

  const reset = () => {
    setFile(null)
    setPreview(null)
    setCommit(null)
  }

  const onPreview = () => {
    if (!file) return
    setCommit(null)
    const fd = new FormData()
    fd.set('file', file)
    startTransition(async () => {
      const res = await previewImport(active, fd)
      setPreview({
        ok: res.ok,
        total: res.total,
        validCount: res.validRows.length,
        errors: res.errors,
        preview: res.preview,
      })
    })
  }

  const onCommit = () => {
    if (!file) return
    const fd = new FormData()
    fd.set('file', file)
    startTransition(async () => {
      const res = await commitImport(active, fd)
      setCommit(res)
      if (res.ok) {
        // Clear file after successful import so user doesn't double-submit
        setPreview(null)
        setFile(null)
      }
    })
  }

  return (
    <div>
      <p className="text-xs text-slate-500 mb-3">{t.order}</p>
      <div className="flex flex-wrap gap-1 mb-6 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.entity}
            onClick={() => {
              setActive(tab.entity)
              reset()
            }}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              active === tab.entity
                ? 'border-slate-900 text-slate-900 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t.entity[tab.entity]}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="font-medium text-slate-900">{t.entity[active]}</h2>
          <p className="text-xs text-slate-500 mt-1">{t.hint[active]}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/import/template/${active}`}
            className="inline-flex items-center px-3 py-2 rounded-md bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
          >
            ↓ {t.download}
          </a>
          <label className="inline-flex items-center px-3 py-2 rounded-md bg-white border border-slate-300 text-sm cursor-pointer hover:bg-slate-50">
            {t.upload}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setPreview(null)
                setCommit(null)
              }}
            />
          </label>
          {file && (
            <span className="text-xs text-slate-600 truncate max-w-xs" title={file.name}>
              {file.name}
            </span>
          )}
        </div>

        {file && (
          <div className="flex gap-2">
            <button
              onClick={onPreview}
              disabled={pending}
              className="px-3 py-2 rounded-md bg-slate-900 text-white text-sm hover:bg-slate-700 disabled:opacity-50"
            >
              {pending && !commit ? t.loading : t.preview}
            </button>
            {preview && preview.validCount > 0 && (
              <button
                onClick={onCommit}
                disabled={pending}
                className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {pending && commit === null ? t.loading : `${t.commit} (${preview.validCount})`}
              </button>
            )}
            <button
              onClick={reset}
              disabled={pending}
              className="px-3 py-2 rounded-md bg-white border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {t.reset}
            </button>
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
              <span>
                {t.totalRows}: <strong>{preview.total}</strong>
              </span>
              <span>
                {t.validRows}: <strong className="text-emerald-700">{preview.validCount}</strong>
              </span>
              <span>
                {t.errors}: <strong className={preview.errors.length > 0 ? 'text-red-700' : 'text-slate-700'}>{preview.errors.length}</strong>
              </span>
            </div>
            {preview.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-48 overflow-auto">
                <ul className="text-xs text-red-800 space-y-1">
                  {preview.errors.slice(0, 50).map((e, i) => (
                    <li key={i}>
                      <strong>Rresht {e.row}:</strong> {e.message}
                    </li>
                  ))}
                  {preview.errors.length > 50 && (
                    <li className="italic">… +{preview.errors.length - 50}</li>
                  )}
                </ul>
              </div>
            )}
            {preview.preview.length > 0 && (
              <div className="border border-slate-200 rounded-md overflow-auto max-h-72">
                <table className="text-xs w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {Object.keys(preview.preview[0]).map((k) => (
                        <th key={k} className="px-2 py-1 text-left font-medium text-slate-600 border-b border-slate-200">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Object.keys(preview.preview[0]).map((k) => (
                          <td key={k} className="px-2 py-1 text-slate-700">
                            {String(row[k] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {commit && (
          <div
            className={`rounded-md p-3 text-sm ${
              commit.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {commit.ok ? `${t.insertedOk}: ${commit.inserted}` : commit.errors.map((e) => `Rresht ${e.row}: ${e.message}`).join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}
