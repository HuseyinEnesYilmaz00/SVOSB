import { canManageProgram, canManageClass, canManageUser } from '@/lib/supabase/admin-scope'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isValidUuid, requireAdmin } from '@/lib/supabase/admin-auth'
import { epostaGondericisi } from '@/lib/email'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { user, role, response } = await requireAdmin()
    if (response) return response

    const { baslik, icerik, hedefTipi, hedefSinifId, hedefKullaniciId, programId } = await req.json()

    if (typeof baslik !== 'string' || !baslik.trim() || typeof icerik !== 'string' || !icerik.trim()) {
      return NextResponse.json({ error: 'Başlık ve içerik zorunlu.' }, { status: 400 })
    }
    if (!['ogrenci', 'sinif', 'tumu'].includes(hedefTipi)) {
      return NextResponse.json({ error: 'Geçersiz hedef tipi.' }, { status: 400 })
    }
    if (hedefTipi === 'ogrenci' && !isValidUuid(hedefKullaniciId)) {
      return NextResponse.json({ error: 'Geçerli bir öğrenci seçilmelidir.' }, { status: 400 })
    }
    if (hedefTipi === 'sinif' && !isValidUuid(hedefSinifId)) {
      return NextResponse.json({ error: 'Geçerli bir sınıf seçilmelidir.' }, { status: 400 })
    }
    if (hedefTipi === 'tumu' && !isValidUuid(programId)) {
      return NextResponse.json({ error: 'Geçerli bir program gerekli.' }, { status: 400 })
    }

    const permitted = hedefTipi === 'ogrenci'
      ? await canManageUser(user.id, role, hedefKullaniciId)
      : hedefTipi === 'sinif'
        ? await canManageClass(user.id, role, hedefSinifId)
        : await canManageProgram(user.id, role, programId)
    if (!permitted) return NextResponse.json({ error: 'Bu hedefe duyuru gönderme yetkiniz yok.' }, { status: 403 })
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
    let aliciIdler: string[] = []

    if (hedefTipi === 'ogrenci') {
      aliciIdler = [hedefKullaniciId]
    } else if (hedefTipi === 'sinif') {
      const { data: ogrenciler } = await supabaseAdmin
        .from('ogrenciler')
        .select('kullanici_id')
        .eq('sinif_id', hedefSinifId)
        .eq('aktif', true)
      aliciIdler = (ogrenciler || []).map((ogrenci) => ogrenci.kullanici_id)
    } else {
      const { data: siniflar } = await supabaseAdmin
        .from('siniflar')
        .select('id')
        .eq('program_id', programId)
      const sinifIdleri = (siniflar || []).map((sinif) => sinif.id)

      if (sinifIdleri.length === 0) {
        return NextResponse.json({ gonderilen: 0 })
      }

      const { data: ogrenciler } = await supabaseAdmin
        .from('ogrenciler')
        .select('kullanici_id')
        .in('sinif_id', sinifIdleri)
        .eq('aktif', true)
      aliciIdler = (ogrenciler || []).map((ogrenci) => ogrenci.kullanici_id)
    }

    if (aliciIdler.length === 0) {
      return NextResponse.json({ gonderilen: 0 })
    }

    const { data: kullanicilar } = await supabaseAdmin
      .from('kullanicilar')
      .select('email, ad')
      .in('id', aliciIdler)

    const emailListesi = (kullanicilar || []).map((kullanici) => kullanici.email).filter(Boolean)

    if (emailListesi.length === 0) {
      return NextResponse.json({ gonderilen: 0 })
    }

    for (let offset = 0; offset < emailListesi.length; offset += 100) {
    const { error: mailError } = await resend.batch.send(emailListesi.slice(offset, offset + 100).map(email => ({
      from: epostaGondericisi,
      to: email,
      subject: `Siyer OBS Duyuru: ${baslik}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">${escapeHtml(baslik)}</h2>
          <p style="color: #555555; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(icerik)}</p>
          <p style="color: #999999; font-size: 12px; margin-top: 24px;">Siyer Vakfı Öğrenci Bilgi Sistemi</p>
        </div>
      `,
    })))

    if (mailError) return NextResponse.json({ error: 'Mail gönderilemedi.' }, { status: 502 })
    }
    return NextResponse.json({ gonderilen: emailListesi.length })
  } catch (err) {
    console.error('Mail gönderme hatası:', err)
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
