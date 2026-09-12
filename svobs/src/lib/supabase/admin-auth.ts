import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from './server'

const ADMIN_ROLES = new Set(['super_admin', 'program_admin'])

export async function requireAdmin() {
  const supabase = createServerSupabaseClient(await cookies())
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 }),
    }
  }

  const { data: kullanici, error: kullaniciError } = await supabase
    .from('kullanicilar')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (kullaniciError || !kullanici || !ADMIN_ROLES.has(kullanici.rol)) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor.' }, { status: 403 }),
    }
  }

  return { user, response: null }
}

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}