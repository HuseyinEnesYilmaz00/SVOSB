// supabase/functions/send-duyuru-push/index.ts olarak konmalı.
// Tetikleyici: Supabase Dashboard > Database > Webhooks
//   Table: duyurular, Event: Insert, Type: Supabase Edge Function, Function: send-duyuru-push
//
// Gerekli secret'lar (supabase secrets set ile):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  (npx web-push generate-vapid-keys ile üret)
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY zaten Edge Function ortamında hazır gelir.
//
// NOT: web-push paketinin Deno'nun npm uyumluluk katmanında (npm: specifier) tam
// sorunsuz çalıştığını buradan doğrulayamıyorum — deploy etmeden önce
// `supabase functions serve send-duyuru-push` ile lokal test etmen lazım.

import webpush from "npm:web-push@3.6.7"

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

webpush.setVapidDetails(
  "huseyinenesyilmaz@gmail.com", // gerçek bir iletişim adresiyle değiştir
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

const restHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const duyuru = payload.record

    if (!duyuru) return new Response("ok")

    let kullaniciIdleri: string[] = []

    if (duyuru.hedef_tipi === "ogrenci" && duyuru.hedef_kullanici_id) {
      kullaniciIdleri = [duyuru.hedef_kullanici_id]
    } else if (duyuru.hedef_tipi === "sinif" && duyuru.hedef_sinif_id) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/ogrenciler?select=kullanici_id&sinif_id=eq.${duyuru.hedef_sinif_id}&aktif=eq.true`,
        { headers: restHeaders }
      )
      const rows = await res.json()
      kullaniciIdleri = rows.map((r: any) => r.kullanici_id)
    } else {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/ogrenciler?select=kullanici_id,siniflar!inner(program_id)&siniflar.program_id=eq.${duyuru.program_id}&aktif=eq.true`,
        { headers: restHeaders }
      )
      const rows = await res.json()
      kullaniciIdleri = rows.map((r: any) => r.kullanici_id)
    }

    if (kullaniciIdleri.length === 0) return new Response("ok")

    const idFilter = kullaniciIdleri.map((id) => `"${id}"`).join(",")
    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/push_abonelikleri?select=*&kullanici_id=in.(${idFilter})`,
      { headers: restHeaders }
    )
    const abonelikler = await subRes.json()

    const bildirim = JSON.stringify({
      title: duyuru.baslik,
      body: (duyuru.icerik || "").slice(0, 120),
      url: "/ogrenci",
    })

    await Promise.all(
      abonelikler.map((a: any) =>
        webpush
          .sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, bildirim)
          .catch(async (err: any) => {
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              await fetch(`${SUPABASE_URL}/rest/v1/push_abonelikleri?id=eq.${a.id}`, {
                method: "DELETE",
                headers: restHeaders,
              })
            } else {
              console.error("push gönderilemedi:", err)
            }
          })
      )
    )

    return new Response("ok")
  } catch (err) {
    console.error("send-duyuru-push hata:", err)
    return new Response("hata", { status: 500 })
  }
})
