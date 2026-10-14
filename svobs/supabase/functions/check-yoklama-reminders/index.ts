import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAIL_WEBHOOK_URL = Deno.env.get('ATTENDANCE_ALERT_WEBHOOK_URL') || 'https://siyerobs.com/api/yoklama-uyari-mail'
const ALERT_EMAIL = Deno.env.get('ATTENDANCE_ALERT_EMAIL') || 'siyeregitimbirim@gmail.com'
const headers = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }
const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

async function rest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } })
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`)
  const text = await response.text()
  return text ? JSON.parse(text) : []
}

function tarihAnahtari(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

async function sha256(deger: string) {
  const bytes = new TextEncoder().encode(deger)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function dersBuTarihteMi(ders: any, tarih: string) {
  const gun = new Date(`${tarih}T12:00:00+03:00`)
  if (ders.gun !== gunler[gun.getUTCDay()]) return false
  if (ders.baslangic_tarihi && tarih < ders.baslangic_tarihi) return false
  if (!ders.baslangic_tarihi) return true
  const baslangic = new Date(`${ders.baslangic_tarihi}T12:00:00+03:00`)
  const hafta = Math.round((gun.getTime() - baslangic.getTime()) / 604800000)
  const aralik = ({ '2haftada1': 2, '3haftada1': 3, ayda1: 4 } as Record<string, number>)[ders.periyot] || 1
  return hafta >= 0 && hafta % aralik === 0
}

Deno.serve(async (req) => {
  try {
    const sunulanAnahtar = req.headers.get('x-cron-secret') || ''
    const kayit = (await rest('sistem_anahtarlari?select=deger_hash&anahtar=eq.attendance_cron_secret&limit=1'))[0]
    if (!sunulanAnahtar || !kayit?.deger_hash || await sha256(sunulanAnahtar) !== kayit.deger_hash) {
      return Response.json({ ok: false, error: 'Yetkisiz istek' }, { status: 401 })
    }

    const sorumluluklar = await rest('ders_sorumlulari?select=id,ogrenci_id,ders_id')
    const nuri = (await rest(`kullanicilar?select=id,email&email=eq.${encodeURIComponent(ALERT_EMAIL)}&limit=1`))[0]
    const simdi = new Date()
    const adayTarihler = [1, 2, 3].map(gun => tarihAnahtari(new Date(simdi.getTime() - gun * 86400000)))
    let olusturulan = 0

    for (const sorumluluk of sorumluluklar) {
      const ders = (await rest(`dersler?select=id,ad,gun,saat,periyot,baslangic_tarihi,sinif_id,siniflar!inner(ad,program_id)&id=eq.${sorumluluk.ders_id}&aktif=eq.true&limit=1`))[0]
      if (!ders) continue
      const sorumlu = (await rest(`ogrenciler?select=id,kullanici_id,kullanicilar!inner(ad,soyad)&id=eq.${sorumluluk.ogrenci_id}&aktif=eq.true&limit=1`))[0]
      if (!sorumlu) continue

      for (const tarih of adayTarihler) {
        if (!dersBuTarihteMi(ders, tarih)) continue
        const kapanis = new Date(`${tarih}T${(ders.saat || '23:59').slice(0, 5)}:00+03:00`).getTime() + 86400000
        if (simdi.getTime() < kapanis) continue

        const ogrenciler = await rest(`ogrenciler?select=id&sinif_id=eq.${ders.sinif_id}&aktif=eq.true`)
        const yoklamalar = await rest(`yoklamalar?select=id&ders_id=eq.${ders.id}&tarih=eq.${tarih}`)
        if (!ogrenciler.length || yoklamalar.length >= ogrenciler.length) continue

        let uyari = (await rest(`yoklama_uyarilari?select=*&ders_id=eq.${ders.id}&ders_tarihi=eq.${tarih}&limit=1`))[0]
        if (!uyari) {
          const eklenen = await rest('yoklama_uyarilari?select=*', {
            method: 'POST',
            headers: { Prefer: 'return=representation,resolution=ignore-duplicates' },
            body: JSON.stringify({ ders_id: ders.id, ders_tarihi: tarih, sorumlu_ogrenci_id: sorumlu.id }),
          })
          uyari = eklenen[0] || (await rest(`yoklama_uyarilari?select=*&ders_id=eq.${ders.id}&ders_tarihi=eq.${tarih}&limit=1`))[0]
        }
        if (!uyari) continue

        const sorumluAdi = `${sorumlu.kullanicilar?.ad || ''} ${sorumlu.kullanicilar?.soyad || ''}`.trim()
        const baslik = `Eksik yoklama: ${ders.ad}`
        const icerik = `${ders.siniflar?.ad || 'Sınıf'} sınıfındaki ${ders.ad} dersinin ${tarih} tarihli yoklaması 24 saat içinde tamamlanmadı.\n\nSorumlu öğrenci: ${sorumluAdi || 'Belirtilmedi'}\nGirilen kayıt: ${yoklamalar.length}/${ogrenciler.length}`

        if (!uyari.duyuru_id && nuri?.id) {
          const duyurular = await rest('duyurular?select=id', {
            method: 'POST', headers: { Prefer: 'return=representation' },
            body: JSON.stringify({ program_id: ders.siniflar.program_id, baslik, icerik, yayinlayan_id: nuri.id, hedef_tipi: 'ogrenci', hedef_kullanici_id: nuri.id }),
          })
          if (duyurular[0]?.id) {
            await rest(`yoklama_uyarilari?id=eq.${uyari.id}`, { method: 'PATCH', body: JSON.stringify({ duyuru_id: duyurular[0].id }) })
          }
        }

        if (!uyari.email_gonderildi) {
          const mail = await fetch(MAIL_WEBHOOK_URL, { method: 'POST', headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ baslik, icerik }) })
          if (mail.ok) await rest(`yoklama_uyarilari?id=eq.${uyari.id}`, { method: 'PATCH', body: JSON.stringify({ email_gonderildi: true }) })
        }
        olusturulan++
      }
    }
    return Response.json({ ok: true, processed: olusturulan })
  } catch (error) {
    console.error('check-yoklama-reminders:', error)
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' }, { status: 500 })
  }
})
