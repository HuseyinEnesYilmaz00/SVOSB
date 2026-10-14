import supabaseAdmin from '@/lib/supabase/admin'
import { canManageUser } from '@/lib/supabase/admin-scope'
import { NextResponse } from 'next/server'
import { isValidUuid, requireAdmin } from '@/lib/supabase/admin-auth'

export async function POST(req: Request) {
  try {
    const { user, role, response } = await requireAdmin()
    if (response) return response

    const { ogrenciId, kullaniciId } = await req.json()

    if (!isValidUuid(ogrenciId) || !isValidUuid(kullaniciId)) {
      return NextResponse.json({ error: 'Geçerli ogrenciId ve kullaniciId gerekli.' }, { status: 400 })
    }

    const { data: ogrenci, error: ogrenciKontrolHatasi } = await supabaseAdmin
      .from('ogrenciler')
      .select('id, kullanici_id')
      .eq('id', ogrenciId)
      .eq('kullanici_id', kullaniciId)
      .maybeSingle()

    if (ogrenciKontrolHatasi) {
      return NextResponse.json({ error: 'Öğrenci doğrulanamadı: ' + ogrenciKontrolHatasi.message }, { status: 400 })
    }
    if (!ogrenci) {
      return NextResponse.json({ error: 'Öğrenci ve kullanıcı eşleşmiyor.' }, { status: 400 })
    }

    if (!await canManageUser(user.id, role, kullaniciId)) {
      return NextResponse.json({ error: 'Bu öğrenciyi yönetme yetkiniz yok.' }, { status: 403 })
    }

    // One database statement: cascading deletes either all succeed or all roll back.
    // Restrictive foreign keys preserve submissions instead of partially deleting records.
    const { error: authHata } = await supabaseAdmin.auth.admin.deleteUser(kullaniciId)
    if (authHata) {
      return NextResponse.json({ error: 'Öğrenci silinemedi: ' + authHata.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Beklenmeyen hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}