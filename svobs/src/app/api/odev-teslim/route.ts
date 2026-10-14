import { sanitizeAssignment } from '@/lib/sanitize-assignment'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import mammoth from 'mammoth'
import { isValidUuid, requireUser } from '@/lib/supabase/admin-auth'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireUser()
    if (response) return response

    const formData = await req.formData()
    const dosya = formData.get('dosya')
    const odevId = formData.get('odevId')
    const dersId = formData.get('dersId')
    const ogrenciId = formData.get('ogrenciId')

    if (!(dosya instanceof File) || !isValidUuid(odevId) || !isValidUuid(dersId) || !isValidUuid(ogrenciId)) {
      return NextResponse.json({ hata: 'Eksik veya geçersiz veri.' }, { status: 400 })
    }
    if (dosya.size === 0 || dosya.size > MAX_FILE_SIZE) {
      return NextResponse.json({ hata: 'Dosya 10 MB’dan küçük ve boş olmayan bir .docx olmalı.' }, { status: 400 })
    }
    if (dosya.type !== DOCX_MIME_TYPE && !dosya.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ hata: 'Yalnızca .docx dosyaları yüklenebilir.' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const [{ data: ogrenci }, { data: ders }, { data: odev }] = await Promise.all([
      supabase
        .from('ogrenciler')
        .select('id, sinif_id, aktif')
        .eq('id', ogrenciId)
        .eq('kullanici_id', user.id)
        .maybeSingle(),
      supabase.from('dersler').select('id, sinif_id').eq('id', dersId).maybeSingle(),
      supabase.from('odevler').select('id').eq('id', odevId).eq('ders_id', dersId).maybeSingle(),
    ])

    if (!ogrenci || !ogrenci.aktif || !ders || ogrenci.sinif_id !== ders.sinif_id || !odev) {
      return NextResponse.json({ hata: 'Bu ödevi teslim etme yetkiniz yok.' }, { status: 403 })
    }

    const arrayBuffer = await dosya.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const { value: html } = await mammoth.convertToHtml({ buffer })

    const { data, error } = await supabase
      .from('odev_teslimleri')
      .upsert({
        odev_id: odevId,
        ders_id: dersId,
        ogrenci_id: ogrenciId,
        icerik_html: sanitizeAssignment(html),
        teslim_tarihi: new Date().toISOString(),
      }, { onConflict: 'odev_id,ogrenci_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ hata: error.message }, { status: 500 })
    }

    return NextResponse.json({ teslim: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ hata: message }, { status: 500 })
  }
}
