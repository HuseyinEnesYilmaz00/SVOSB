import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import mammoth from 'mammoth'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const dosya = formData.get('dosya') as File
    const odevId = formData.get('odevId') as string
    const dersId = formData.get('dersId') as string
    const ogrenciId = formData.get('ogrenciId') as string

    if (!dosya || !odevId || !dersId || !ogrenciId) {
      return NextResponse.json({ hata: 'Eksik veri' }, { status: 400 })
    }

    const arrayBuffer = await dosya.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { value: html } = await mammoth.convertToHtml({ buffer })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('odev_teslimleri')
      .upsert({
        odev_id: odevId,
        ders_id: dersId,
        ogrenci_id: ogrenciId,
        icerik_html: html,
        teslim_tarihi: new Date().toISOString(),
      }, { onConflict: 'odev_id,ogrenci_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ hata: error.message }, { status: 500 })
    }

    return NextResponse.json({ teslim: data })
  } catch (err: any) {
    return NextResponse.json({ hata: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}
