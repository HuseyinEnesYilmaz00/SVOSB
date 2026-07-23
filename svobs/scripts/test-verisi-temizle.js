const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function calistir() {
  console.log('Admin olmayan kullanıcılar bulunuyor...')
  const { data: silinecekler, error: hataOku } = await supabase
    .from('kullanicilar')
    .select('id, email, rol')
    .not('rol', 'in', '(super_admin,program_admin)')

  if (hataOku) { console.error('Okuma hatası:', hataOku.message); return }

  const silinecekIdler = silinecekler.map(k => k.id)
  console.log(`${silinecekIdler.length} kullanıcı (öğretmen/öğrenci) silinecek.`)

  if (silinecekIdler.length === 0) {
    console.log('Silinecek admin-dışı kullanıcı yok, sadece veri tabloları temizlenecek.')
  }

  const tablolar = [
    'notlar', 'yoklamalar', 'odev_teslimleri', 'odevler', 'sinavlar',
    'ders_oturumlari', 'ogretmen_dersleri', 'ders_sorumlulari', 'duyurular',
    'dersler', 'ogrenciler', 'siniflar', 'kullanici_programlar'
  ]

  for (const tablo of tablolar) {
    const { error } = await supabase.from(tablo).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) console.error(`${tablo} silinirken hata:`, error.message)
    else console.log(`${tablo} temizlendi.`)
  }

  if (silinecekIdler.length > 0) {
    const { error: kullaniciSilHata } = await supabase
      .from('kullanicilar')
      .delete()
      .in('id', silinecekIdler)
    if (kullaniciSilHata) console.error('kullanicilar silinirken hata:', kullaniciSilHata.message)
    else console.log('kullanicilar tablosu (admin dışı) temizlendi.')

    console.log('Auth kullanıcıları siliniyor...')
    for (const id of silinecekIdler) {
      const { error } = await supabase.auth.admin.deleteUser(id)
      if (error) console.error(`Auth kullanıcı ${id} silinemedi:`, error.message)
    }
    console.log('Auth kullanıcıları temizlendi.')
  }

  console.log('✅ Tamamlandı. Admin hesapları ve "programlar" tablosu korundu.')
}

calistir()