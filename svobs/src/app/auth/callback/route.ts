import type { EmailOtpType } from '@supabase/supabase-js'
import { safeAuthRedirect } from '@/lib/auth-redirect'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const DEFAULT_REDIRECT = '/sifre-degistir'

export async function GET(request: NextRequest) {
  const redirectPath = safeAuthRedirect(request.nextUrl.searchParams.get('next'))
  // Next's dev server can expose its bind address (0.0.0.0) in request.url.
  // Never redirect a browser there: the session cookie belongs to localhost.
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0].toLowerCase()
  const productionHostname = hostname === 'www.siyerobs.com'
    ? 'siyerobs.com'
    : ['siyerobs.com', 'svobs.siyerobs.workers.dev'].includes(hostname)
      ? hostname
      : 'siyerobs.com'
  const origin = process.env.NODE_ENV === 'development' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
    ? `http://${host}`
    : `https://${productionHostname}`
  const successUrl = new URL(redirectPath, origin)
  const errorUrl = new URL(DEFAULT_REDIRECT, origin)
  errorUrl.searchParams.set('hata', 'gecersiz-link')

  const supabase = createServerSupabaseClient(await cookies())
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null

  let error: Error | null = null

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    error = result.error
  } else {
    error = new Error('Eksik doğrulama bilgisi')
  }

  const response = NextResponse.redirect(error ? errorUrl : successUrl)
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}
