import { canManageUser } from '@/lib/supabase/admin-scope'
import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { isValidUuid, requireAdmin } from '@/lib/supabase/admin-auth'

export async function POST(req: NextRequest) {
  const { user, role, response } = await requireAdmin()
  if (response) return response

  let body: { userId?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçerli bir JSON gövdesi gerekli.' }, { status: 400 })
  }

  const { userId, password } = body ?? {}
  if (!isValidUuid(userId)) {
    return NextResponse.json({ error: 'Geçerli bir kullanıcı kimliği gerekli.' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Şifre en az 8 karakter olmalı.' }, { status: 400 })
  }

  if (!await canManageUser(user.id, role, userId)) {
    return NextResponse.json({ error: 'Bu kullanıcıyı yönetme yetkiniz yok.' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}