import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { email, password, ad, soyad, telefon, sinif_id, rol } = await req.json()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const userId = data.user.id

  const { error: kullaniciError } = await supabaseAdmin
    .from('kullanicilar')
    .insert({ id: userId, ad, soyad, email, telefon, rol: rol || 'ogrenci' }) 
    
  if (kullaniciError) {
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'kullanicilar: ' + kullaniciError.message }, { status: 400 })
  }

  return NextResponse.json({ user: data.user })
}
