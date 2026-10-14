import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/supabase/admin-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser()
    if (response) return response

    const { kullaniciId, subscription } = await req.json()
    if (!kullaniciId || !subscription?.endpoint) {
      return NextResponse.json({ error: 'kullaniciId ve subscription zorunlu' }, { status: 400 })
    }
    if (kullaniciId !== user.id) {
      return NextResponse.json({ error: 'Başka bir kullanıcı adına abonelik oluşturulamaz.' }, { status: 403 })
    }
    if (!subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: 'Geçersiz push aboneliği.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('push_abonelikleri').upsert(
      {
        kullanici_id: kullaniciId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        guncellenme_tarihi: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
