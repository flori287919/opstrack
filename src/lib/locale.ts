import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const LOCALES = ['sq', 'en'] as const
export const DEFAULT_LOCALE = 'sq'

export type Locale = (typeof LOCALES)[number]

export async function currentLocale(): Promise<Locale> {
  const c = await cookies()
  const v = c.get('NEXT_LOCALE')?.value
  if (v && (LOCALES as readonly string[]).includes(v)) return v as Locale
  return DEFAULT_LOCALE
}

export async function localePath(path: string): Promise<string> {
  const lang = await currentLocale()
  if (path.startsWith('/')) return `/${lang}${path === '/' ? '' : path}`
  return `/${lang}/${path}`
}

export async function redirectLocal(path: string): Promise<never> {
  redirect(await localePath(path))
}
