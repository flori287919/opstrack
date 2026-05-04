import 'server-only'

const dictionaries = {
  sq: () => import('./dictionaries/sq.json').then((m) => m.default),
  en: () => import('./dictionaries/en.json').then((m) => m.default),
}

export type Locale = keyof typeof dictionaries
export const LOCALES: Locale[] = ['sq', 'en']
export const DEFAULT_LOCALE: Locale = 'sq'

export const hasLocale = (locale: string): locale is Locale => locale in dictionaries

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)['sq']>>

export const getDictionary = async (locale: Locale): Promise<Dictionary> => dictionaries[locale]()
