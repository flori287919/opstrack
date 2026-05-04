'use client'

import { usePathname, useRouter } from 'next/navigation'

const LOCALES = [
  { code: 'sq', label: 'SQ' },
  { code: 'en', label: 'EN' },
] as const

export function LocaleSwitcher({ current }: { current: string }) {
  const router = useRouter()
  const pathname = usePathname()

  function switchTo(code: string) {
    if (code === current) return
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}`
    // Replace the first segment of the path with the new locale
    const parts = pathname.split('/')
    if (parts.length > 1 && (parts[1] === 'sq' || parts[1] === 'en')) {
      parts[1] = code
    } else {
      parts.splice(1, 0, code)
    }
    router.push(parts.join('/') || `/${code}`)
    router.refresh()
  }

  return (
    <div className="flex gap-1 px-1">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => switchTo(l.code)}
          className={`flex-1 px-2 py-1 text-xs font-medium rounded ${
            current === l.code
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
