import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { isValidUuid, requireAdmin } from '@/lib/supabase/admin-auth'

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  let body: { userId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçerli bir JSON gövdesi gerekli.' }, { status: 400 })
  }

  const { userId } = body
  if (!isValidUuid(userId)) {
    return NextResponse.json({ error: 'Geçerli bir kullanıcı kimliği gerekli.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}