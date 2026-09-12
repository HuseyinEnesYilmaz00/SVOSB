import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
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

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
    if (userError || !user?.email) {
      return NextResponse.json({ hata: 'Oturum doğrulanamadı' }, { status: 401 })
    }

    await resend.emails.send({
      from: 'Siyer Vakfı Öğrenci Bilgi Sistemi <bildirim@mail.enesinsanaldefteri.com.tr>',
      to: 'huseyinenesyilmaz@gmail.com',
      replyTo: user.email,
      subject: `Yeni Geri Bildirim — ${sayfa || 'bilinmiyor'}`,
      text: [
        `Sayfa: ${sayfa || 'bilinmiyor'}`,
        `Gönderen: ${user.email}`,
        '',
        mesaj.trim(),
      ].join('\n'),
    })

    return NextResponse.json({ basarili: true })
  } catch (err: any) {
    console.error('geri-bildirim mail hatası:', err)
    return NextResponse.json({ hata: 'Mail gönderilemedi' }, { status: 500 })
  }
}