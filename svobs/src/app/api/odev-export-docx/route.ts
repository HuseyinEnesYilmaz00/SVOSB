import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import HTMLtoDOCX from 'html-to-docx'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ hata: 'id gerekli' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: teslim, error } = await supabase
    .from('odev_teslimleri')
    .select('icerik_html, ogrenci_id, odev_id')
    .eq('id', id)
    .single()

  if (error || !teslim) {
    return NextResponse.json({ hata: 'teslim bulunamadı' }, { status: 404 })
  }

  const { data: ogrenci } = await supabase
    .from('ogrenciler')
    .select('kullanici_id')
    .eq('id', teslim.ogrenci_id)
    .single()

  let dosyaAdi = 'teslim'
  if (ogrenci?.kullanici_id) {
    const { data: kullanici } = await supabase
      .from('kullanicilar')
      .select('ad, soyad')
      .eq('id', ogrenci.kullanici_id)
      .single()
    if (kullanici) {
      dosyaAdi = `${kullanici.ad}_${kullanici.soyad}`.replace(/\s+/g, '_')
    }
  }

  const buffer = await HTMLtoDOCX(teslim.icerik_html || '', null, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
  })

  const guvenliAd = dosyaAdi
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/[^a-zA-Z0-9_-]/g, '_')

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${guvenliAd}.docx"; filename*=UTF-8''${encodeURIComponent(dosyaAdi)}.docx`,
    },
  })
}
