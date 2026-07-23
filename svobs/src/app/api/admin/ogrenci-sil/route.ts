import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { ogrenciId, kullaniciId } = await req.json()

    if (!ogrenciId || !kullaniciId) {
      return NextResponse.json({ error: 'ogrenciId ve kullaniciId zorunlu' }, { status: 400 })
    }

    // 1) Bağlı kayıtları sil (foreign key sırasına dikkat)
    await supabaseAdmin.from('yoklamalar').delete().eq('ogrenci_id', ogrenciId)
    await supabaseAdmin.from('notlar').delete().eq('ogrenci_id', ogrenciId)
    await supabaseAdmin.from('ders_sorumlulari').delete().eq('ogrenci_id', ogrenciId)

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
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Beklenmeyen hata' }, { status: 500 })
  }
}