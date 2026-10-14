import { canManageProgram } from '@/lib/supabase/admin-scope'
import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { isValidUuid, requireAdmin } from '@/lib/supabase/admin-auth'

export async function POST(req: NextRequest) {
  const { user, role, response } = await requireAdmin()
  if (response) return response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçerli bir JSON gövdesi gerekli.' }, { status: 400 })
  }

  const { email, password, ad, soyad, telefon, rol, sinif_id } = body ?? {}
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta adresi gerekli.' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Şifre en az 8 karakter olmalı.' }, { status: 400 })
  }
  if (typeof ad !== 'string' || !ad.trim()) {
    return NextResponse.json({ error: 'Ad zorunlu.' }, { status: 400 })
  }
  if (rol !== undefined && rol !== 'ogrenci') {
    return NextResponse.json({ error: 'Yalnızca öğrenci hesabı oluşturulabilir.' }, { status: 400 })
  }

  if (typeof soyad !== 'string' || !soyad.trim() || (telefon != null && typeof telefon !== 'string')) {
    return NextResponse.json({ error: 'Soyad ve telefon alanlarını kontrol edin.' }, { status: 400 })
  }
  if (!isValidUuid(sinif_id)) {
    return NextResponse.json({ error: 'Geçerli bir sınıf gerekli.' }, { status: 400 })
  }
  const { data: sinif } = await supabaseAdmin.from('siniflar')
    .select('program_id, arsivlendi').eq('id', sinif_id).maybeSingle()
  if (!sinif || sinif.arsivlendi) {
    return NextResponse.json({ error: 'Aktif bir sınıf seçin.' }, { status: 400 })
  }
  const programId = sinif.program_id
  const { data: son, error: numaraError } = await supabaseAdmin.from('ogrenciler')
    .select('numara').eq('sinif_id', sinif_id).order('numara', { ascending: false }).limit(1)
  if (numaraError) return NextResponse.json({ error: 'Öğrenci numarası alınamadı.' }, { status: 500 })
  const numara = (son?.[0]?.numara ?? 0) + 1
  if (!isValidUuid(programId) || !await canManageProgram(user.id, role, programId)) {
    return NextResponse.json({ error: 'Bu programda kullanıcı oluşturma yetkiniz yok.' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const userId = data.user.id

  const { error: kullaniciError } = await supabaseAdmin
    .from('kullanicilar')
    .insert({ id: userId, ad: ad.trim(), soyad: soyad.trim(), email: email.trim().toLowerCase(), telefon: telefon || null, rol: 'ogrenci' })
    
  if (kullaniciError) {
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'kullanicilar: ' + kullaniciError.message }, { status: 400 })
  }

  const { error: baglantiError } = await supabaseAdmin
    .from('ogrenciler').insert({ kullanici_id: userId, sinif_id, numara, aktif: true })
  if (baglantiError) {
    const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: rollbackError
      ? 'Kayıt tamamlanamadı; eksik hesabın yönetici tarafından kontrol edilmesi gerekiyor.'
      : 'Kayıt tamamlanamadı: ' + baglantiError.message }, { status: 400 })
  }
  return NextResponse.json({ user: { id: userId } })
}
