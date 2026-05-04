// Shared form primitives. Three visual sizes, same structure across the app.
//   "lg" — full-page forms (Project, Invoice, Cost contract)
//   "md" — inline / sidebar forms (clients, people sidebar)
//   "sm" — tight tables / lookups grid
import type { ReactNode } from 'react'

type Size = 'lg' | 'md' | 'sm'

const LABEL_CLS: Record<Size, string> = {
  lg: 'block text-sm font-medium text-slate-700 mb-1',
  md: 'block text-xs font-medium text-slate-600 mb-1',
  sm: 'block text-xs font-medium text-slate-600 mb-1',
}

const INPUT_CLS: Record<Size, string> = {
  lg: 'w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-slate-900',
  md: 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-slate-900',
  sm: 'w-full px-3 py-1.5 text-sm border border-slate-300 rounded text-slate-900 outline-none focus:ring-2 focus:ring-slate-900',
}

const SELECT_CLS: Record<Size, string> = {
  lg: 'w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white outline-none focus:ring-2 focus:ring-slate-900',
  md: 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white outline-none focus:ring-2 focus:ring-slate-900',
  sm: 'w-full px-3 py-1.5 text-sm border border-slate-300 rounded text-slate-900 bg-white outline-none focus:ring-2 focus:ring-slate-900',
}

export function Section({
  title,
  children,
  cols = 2,
}: {
  title: string
  children: ReactNode
  cols?: 1 | 2
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">{title}</div>
      <div className={`grid gap-4 ${cols === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {children}
      </div>
    </div>
  )
}

export function Field({
  label,
  name,
  type = 'text',
  defaultValue = '',
  placeholder,
  required,
  step,
  size = 'lg',
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  step?: string
  size?: Size
}) {
  return (
    <label className="block">
      <span className={LABEL_CLS[size]}>{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        step={step}
        className={INPUT_CLS[size]}
      />
    </label>
  )
}

export function Select({
  label,
  name,
  options,
  optionLabels,
  defaultValue = '',
  placeholder,
  size = 'lg',
}: {
  label: string
  name: string
  options: string[]
  optionLabels?: string[]
  defaultValue?: string
  placeholder?: string
  size?: Size
}) {
  return (
    <label className="block">
      <span className={LABEL_CLS[size]}>{label}</span>
      <select name={name} defaultValue={defaultValue} className={SELECT_CLS[size]}>
        {options.map((o, i) => (
          <option key={o || `__empty_${i}`} value={o}>
            {o ? optionLabels?.[i] || o : placeholder ?? ''}
          </option>
        ))}
      </select>
    </label>
  )
}

export type LookupOption = { id: string; label: string }

export function LookupSelect({
  label,
  name,
  options,
  defaultValue = '',
  hrefAdd,
  addLabel,
  placeholder,
  size = 'lg',
}: {
  label: string
  name: string
  options: LookupOption[]
  defaultValue?: string
  hrefAdd?: string
  addLabel?: string
  placeholder: string
  size?: Size
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className={size === 'lg' ? 'text-sm font-medium text-slate-700' : 'text-xs font-medium text-slate-600'}>
          {label}
        </span>
        {hrefAdd && addLabel && (
          <a
            href={hrefAdd}
            target="_blank"
            rel="noopener"
            className="text-xs text-slate-500 hover:text-slate-900 underline"
          >
            {addLabel}
          </a>
        )}
      </div>
      <select name={name} defaultValue={defaultValue} className={SELECT_CLS[size]}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
