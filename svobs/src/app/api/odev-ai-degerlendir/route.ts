import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { teslimId } = await req.json()
    if (!teslimId) return NextResponse.json({ hata: 'teslimId eksik' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: teslim, error: teslimHata } = await supabase
      .from('odev_teslimleri')
      .select('*, odevler (baslik, tur, aciklama)')
      .eq('id', teslimId)
      .single()

    if (teslimHata || !teslim) {
      return NextResponse.json({ hata: 'Teslim bulunamadı' }, { status: 404 })
    }

    const duzMetin = (teslim.icerik_html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    if (!duzMetin) {
      return NextResponse.json({ hata: 'Metin boş' }, { status: 400 })
    }

    const odevBaslik = teslim.odevler?.baslik || 'Ödev'
    const odevTur = teslim.odevler?.tur === 'kitap_muzakeresi' ? 'kitap müzakeresi' : teslim.odevler?.tur === 'makale' ? 'makale' : 'ödev'
    const odevAciklama = teslim.odevler?.aciklama || ''

    const prompt = `Sen bir İslam eğitimi kurumunda öğretmen asistanısın. Aşağıdaki öğrenci ${odevTur} ödevini değerlendir.

Ödev Başlığı: ${odevBaslik}
${odevAciklama ? 'Ödev Açıklaması: ' + odevAciklama : ''}

Öğrenci Metni:
"""
${duzMetin}
"""

Bu bir puanlama değil, öğrenciye yönelik gelişim odaklı bir geri bildirim. Puan verme,
sadece güçlü yönleri, eksik/geliştirilmesi gereken noktaları ve önerileri belirt.
Değerlendirmeni şu JSON formatında, SADECE JSON olarak döndür (başka hiçbir metin ekleme, markdown code fence kullanma):
{"yorum": "<Türkçe, yapıcı, öğrenciyi geliştirici 3-5 cümlelik geri bildirim, puan/sayı içermesin>"}`

    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    })

    const orData = await orRes.json()
    const yanit = orData?.choices?.[0]?.message?.content || ''

    const temizYanit = yanit.replace(/```json|```/g, '').trim()
    let sonuc
    try {
      sonuc = JSON.parse(temizYanit)
    } catch {
      return NextResponse.json({ hata: 'AI yanıtı işlenemedi', ham: yanit, tamYanit: orData }, { status: 500 })
    }

    const { data: guncellenen, error: guncelleHata } = await supabase
      .from('odev_teslimleri')
      .update({
        ai_degerlendirme: sonuc.yorum,
        ai_degerlendirildi: true
      })
      .eq('id', teslimId)
      .select()
      .single()

    if (guncelleHata) {
      return NextResponse.json({ hata: guncelleHata.message }, { status: 500 })
    }

    return NextResponse.json({ teslim: guncellenen })
  } catch (err: any) {
    return NextResponse.json({ hata: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}
