import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isValidUuid, requireAdmin } from '@/lib/supabase/admin-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { response } = await requireAdmin()
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

    // 1) Bağlı kayıtları sil (foreign key sırasına dikkat)
    const childDeletes = await Promise.all([
      supabaseAdmin.from('yoklamalar').delete().eq('ogrenci_id', ogrenciId),
      supabaseAdmin.from('notlar').delete().eq('ogrenci_id', ogrenciId),
      supabaseAdmin.from('ders_sorumlulari').delete().eq('ogrenci_id', ogrenciId),
    ])
    const childDeleteError = childDeletes.find(({ error }) => error)?.error
    if (childDeleteError) {
      return NextResponse.json({ error: 'Öğrenciye bağlı kayıtlar silinemedi: ' + childDeleteError.message }, { status: 400 })
    }

    // 2) Öğrenci satırını sil
    const { error: ogrenciHata } = await supabaseAdmin.from('ogrenciler').delete().eq('id', ogrenciId)
    if (ogrenciHata) {
      return NextResponse.json({ error: 'Öğrenci silinemedi: ' + ogrenciHata.message }, { status: 400 })
    }

    // 3) kullanicilar satırını sil
    const { error: kullaniciHata } = await supabaseAdmin.from('kullanicilar').delete().eq('id', kullaniciId)
    if (kullaniciHata) {
      return NextResponse.json({ error: 'Kullanıcı kaydı silinemedi: ' + kullaniciHata.message }, { status: 400 })
    }

    // 4) Auth hesabını sil
    const { error: authHata } = await supabaseAdmin.auth.admin.deleteUser(kullaniciId)
    if (authHata) {
      return NextResponse.json({ error: 'Auth hesabı silinemedi: ' + authHata.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Beklenmeyen hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}