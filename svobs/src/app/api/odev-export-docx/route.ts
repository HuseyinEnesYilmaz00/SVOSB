import { sanitizeAssignment } from '@/lib/sanitize-assignment'
import { canManageClass } from '@/lib/supabase/admin-scope'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import HTMLtoDOCX from '@turbodocx/html-to-docx'
import { isValidUuid, requireUser } from '@/lib/supabase/admin-auth'

const DOWNLOAD_ROLES = new Set(['super_admin', 'program_admin', 'ogretmen', 'ogrenci'])

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!isValidUuid(id)) {
    return NextResponse.json({ hata: 'Geçerli bir teslim kimliği gerekli.' }, { status: 400 })
  }

  const { user, role, response } = await requireUser()
  if (response) return response
  if (!DOWNLOAD_ROLES.has(role)) {
    return NextResponse.json({ hata: 'Bu dosyayı indirme yetkiniz yok.' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: teslim, error } = await supabase
    .from('odev_teslimleri')
    .select('icerik_html, ogrenci_id, odev_id, ders_id')
    .eq('id', id)
    .single()

  if (error || !teslim) {
    return NextResponse.json({ hata: 'teslim bulunamadı' }, { status: 404 })
  }

  if (role === 'program_admin') {
    const { data: ders } = await supabase.from('dersler').select('sinif_id').eq('id', teslim.ders_id).maybeSingle()
    if (!ders || !await canManageClass(user.id, role, ders.sinif_id)) {
      return NextResponse.json({ hata: 'Bu dosyayı indirme yetkiniz yok.' }, { status: 403 })
    }
  }

  if (role === 'ogrenci') {
    const { data: ogrenci } = await supabase
      .from('ogrenciler')
      .select('id')
      .eq('id', teslim.ogrenci_id)
      .eq('kullanici_id', user.id)
      .maybeSingle()
    if (!ogrenci) {
      return NextResponse.json({ hata: 'Bu dosyayı indirme yetkiniz yok.' }, { status: 403 })
    }
  }

  if (role === 'ogretmen') {
    const { data: atama } = await supabase
      .from('ogretmen_dersleri')
      .select('ders_id')
      .eq('ogretmen_id', user.id)
      .eq('ders_id', teslim.ders_id)
      .maybeSingle()
    if (!atama) {
      return NextResponse.json({ hata: 'Bu dosyayı indirme yetkiniz yok.' }, { status: 403 })
    }
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

  const buffer = await HTMLtoDOCX(sanitizeAssignment(teslim.icerik_html || ''), null, {
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

  return new NextResponse(new Uint8Array(buffer instanceof Blob ? await buffer.arrayBuffer() : buffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${guvenliAd}.docx"; filename*=UTF-8''${encodeURIComponent(dosyaAdi)}.docx`,
    },
  })
}
