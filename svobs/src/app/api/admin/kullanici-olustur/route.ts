import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/admin-auth'

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçerli bir JSON gövdesi gerekli.' }, { status: 400 })
  }

  const { email, password, ad, soyad, telefon, rol } = body
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta adresi gerekli.' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Şifre en az 8 karakter olmalı.' }, { status: 400 })
  }
  if (typeof ad !== 'string' || !ad.trim()) {
    return NextResponse.json({ error: 'Ad zorunlu.' }, { status: 400 })
  }
  if (rol !== undefined && rol !== 'ogrenci' && rol !== 'ogretmen') {
    return NextResponse.json({ error: 'Geçersiz kullanıcı rolü.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const userId = data.user.id

  const { error: kullaniciError } = await supabaseAdmin
    .from('kullanicilar')
    .insert({ id: userId, ad: ad.trim(), soyad, email, telefon, rol: rol || 'ogrenci' })
    
  if (kullaniciError) {
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'kullanicilar: ' + kullaniciError.message }, { status: 400 })
  }

  return NextResponse.json({ user: data.user })
}
