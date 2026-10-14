import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { epostaGondericisi } from '@/lib/email'

const resend = new Resend(process.env.RESEND_API_KEY)
const varsayilanAlici = 'siyeregitimbirim@gmail.com'

export async function POST(request: Request) {
  const yetki = request.headers.get('authorization')
  const beklenen = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!beklenen || yetki !== `Bearer ${beklenen}`) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçerli JSON gerekli.' }, { status: 400 })
  }

  const baslik = typeof body.baslik === 'string' ? body.baslik.trim() : ''
  const icerik = typeof body.icerik === 'string' ? body.icerik.trim() : ''
  if (!baslik || !icerik) {
    return NextResponse.json({ error: 'Başlık ve içerik zorunlu.' }, { status: 400 })
  }

  const alici = process.env.ATTENDANCE_ALERT_EMAIL || varsayilanAlici
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, karakter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[karakter]!)
  const { error } = await resend.emails.send({
    from: epostaGondericisi,
    to: alici,
    subject: `Siyer OBS: ${baslik}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px"><h2>${escapeHtml(baslik)}</h2><p style="line-height:1.6;white-space:pre-wrap">${escapeHtml(icerik)}</p><p style="color:#888;font-size:12px;margin-top:24px">Siyer Vakfı Öğrenci Bilgi Sistemi</p></div>`,
  })

  if (error) return NextResponse.json({ error: 'E-posta gönderilemedi.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
