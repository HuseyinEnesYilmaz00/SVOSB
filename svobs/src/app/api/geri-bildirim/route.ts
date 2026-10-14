import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { epostaGondericisi } from '@/lib/email'

const resend = new Resend(process.env.RESEND_API_KEY)
const feedbackRecipient = process.env.FEEDBACK_RECIPIENT_EMAIL
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { mesaj, sayfa } = await request.json()

    if (!mesaj || typeof mesaj !== 'string' || mesaj.trim().length < 5) {
      return NextResponse.json({ hata: 'Mesaj çok kısa' }, { status: 400 })
    }

    const authorization = request.headers.get('authorization')
    const accessToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : null
    if (!accessToken) {
      return NextResponse.json({ hata: 'Oturum bulunamadı' }, { status: 401 })
    }
    if (!feedbackRecipient) {
      return NextResponse.json({ hata: 'Geri bildirim alıcısı yapılandırılmamış' }, { status: 503 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
    if (userError || !user?.email) {
      return NextResponse.json({ hata: 'Oturum doğrulanamadı' }, { status: 401 })
    }

    const { error: mailError } = await resend.emails.send({
      from: epostaGondericisi,
      to: feedbackRecipient,
      replyTo: user.email,
      subject: `Yeni Geri Bildirim — ${sayfa || 'bilinmiyor'}`,
      text: [
        `Sayfa: ${sayfa || 'bilinmiyor'}`,
        `Gönderen: ${user.email}`,
        '',
        mesaj.trim(),
      ].join('\n'),
    })

    if (mailError) return NextResponse.json({ hata: 'Mail gönderilemedi' }, { status: 502 })
    return NextResponse.json({ basarili: true })
  } catch (err: unknown) {
    console.error('geri-bildirim mail hatası:', err)
    return NextResponse.json({ hata: 'Mail gönderilemedi' }, { status: 500 })
  }
}
