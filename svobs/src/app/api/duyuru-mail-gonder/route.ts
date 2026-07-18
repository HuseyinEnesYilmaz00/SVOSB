import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { baslik, icerik, hedefTipi, hedefSinifId, hedefKullaniciId, programId } = await req.json()

    let aliciIdler: string[] = []

    if (hedefTipi === 'ogrenci' && hedefKullaniciId) {
      aliciIdler = [hedefKullaniciId]
    } else if (hedefTipi === 'sinif' && hedefSinifId) {
      const { data: ogrenciler } = await supabaseAdmin
        .from('ogrenciler')
        .select('kullanici_id')
        .eq('sinif_id', hedefSinifId)
        .eq('aktif', true)
      aliciIdler = (ogrenciler || []).map((o: any) => o.kullanici_id)
    } else {
      const { data: siniflar } = await supabaseAdmin
        .from('siniflar')
        .select('id')
        .eq('program_id', programId)
      const sinifIdleri = (siniflar || []).map((s: any) => s.id)

      const { data: ogrenciler } = await supabaseAdmin
        .from('ogrenciler')
        .select('kullanici_id')
        .in('sinif_id', sinifIdleri)
        .eq('aktif', true)
      aliciIdler = (ogrenciler || []).map((o: any) => o.kullanici_id)
    }

    if (aliciIdler.length === 0) {
      return NextResponse.json({ gonderilen: 0 })
    }

    const { data: kullanicilar } = await supabaseAdmin
      .from('kullanicilar')
      .select('email, ad')
      .in('id', aliciIdler)

    const emailListesi = (kullanicilar || []).map((k: any) => k.email).filter(Boolean)

    if (emailListesi.length === 0) {
      return NextResponse.json({ gonderilen: 0 })
    }

    await resend.emails.send({
      from: 'Siyer Vakfı Öğrenci Bilgi Sistemi <bildirim@mail.enesinsanaldefteri.com.tr>',
      to: emailListesi,
      subject: `Siyer OBS Duyuru: ${baslik}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">${baslik}</h2>
          <p style="color: #555555; line-height: 1.6; white-space: pre-wrap;">${icerik}</p>
          <p style="color: #999999; font-size: 12px; margin-top: 24px;">Siyer Vakfı Öğrenci Bilgi Sistemi</p>
        </div>
      `,
    })

    return NextResponse.json({ gonderilen: emailListesi.length })
  } catch (err: any) {
    console.error('Mail gönderme hatası:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
