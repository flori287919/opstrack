import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const LOCALES = ['sq', 'en'] as const
const DEFAULT_LOCALE = 'sq'
const LOCALE_COOKIE = 'NEXT_LOCALE'

function pickLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
  if (cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) return cookieLocale

  const accept = request.headers.get('accept-language') ?? ''
  for (const part of accept.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase()
    if (!tag) continue
    const base = tag.split('-')[0]
    if ((LOCALES as readonly string[]).includes(base)) return base
  }
  return DEFAULT_LOCALE
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes — they don't need a locale prefix.
  if (pathname.startsWith('/api/')) {
    return await updateSession(request)
  }

  // Already prefixed with a locale → just refresh Supabase session.
  const hasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  )
  if (hasLocale) {
    return await updateSession(request)
  }

  // No locale → redirect to /<locale>/<path>
  const locale = pickLocale(request)
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  const res = NextResponse.redirect(url)
  res.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
