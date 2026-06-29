import { type NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareSupabaseClient(request)

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/giris', '/'],
}
