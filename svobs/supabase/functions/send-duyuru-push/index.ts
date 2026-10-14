// Duyuru ekleme webhook'u bu fonksiyonu çağırır. VAPID anahtarları Supabase
// Edge Function secret'larında tutulur; kaynak koduna yazılmaz.

import webpush from "npm:web-push@3.6.7"
import { Buffer } from "node:buffer"
import { createECDH } from "node:crypto"

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!
const vapidEcdh = createECDH("prime256v1")
vapidEcdh.setPrivateKey(Buffer.from(VAPID_PRIVATE_KEY, "base64url"))
const VAPID_PUBLIC_KEY = vapidEcdh.getPublicKey().toString("base64url")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

webpush.setVapidDetails(
  "mailto:siyeregitimbirim@gmail.com",
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
      kullaniciIdleri = Array.isArray(rows) ? rows.map((r: any) => r.kullanici_id) : []
    } else {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/ogrenciler?select=kullanici_id,siniflar!inner(program_id)&siniflar.program_id=eq.${duyuru.program_id}&aktif=eq.true`,
        { headers: restHeaders }
      )
      const rows = await res.json()
      kullaniciIdleri = Array.isArray(rows) ? rows.map((r: any) => r.kullanici_id) : []
    }

    kullaniciIdleri = [...new Set(kullaniciIdleri.filter(Boolean))]
    if (kullaniciIdleri.length === 0) return new Response("ok")

    const idFilter = kullaniciIdleri.map((id) => `"${id}"`).join(",")
    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/push_abonelikleri?select=*&kullanici_id=in.(${idFilter})`,
      { headers: restHeaders }
    )
    const abonelikYaniti = await subRes.json()
    const abonelikler = Array.isArray(abonelikYaniti) ? abonelikYaniti : []

    let yayinlayan = "SVOBS"
    if (duyuru.yayinlayan_id) {
      const yayinlayanRes = await fetch(
        `${SUPABASE_URL}/rest/v1/kullanicilar?select=ad,soyad&id=eq.${duyuru.yayinlayan_id}&limit=1`,
        { headers: restHeaders }
      )
      const yayinlayanlar = await yayinlayanRes.json()
      if (Array.isArray(yayinlayanlar) && yayinlayanlar[0]) {
        yayinlayan = `${yayinlayanlar[0].ad || ""} ${yayinlayanlar[0].soyad || ""}`.trim() || yayinlayan
      }
    }

    const bildirim = JSON.stringify({
      title: duyuru.baslik,
      body: `${yayinlayan} tarafından gönderildi`,
      duyuruId: duyuru.id,
      url: `/ogrenci?sekme=duyurular&duyuru=${duyuru.id}`,
    })

    let gonderildi = 0
    let basarisiz = 0
    await Promise.all(abonelikler.map(async (a: any) => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, bildirim)
        gonderildi++
      } catch (err: any) {
        basarisiz++
        if ([400, 404, 410].includes(err?.statusCode)) {
          await fetch(`${SUPABASE_URL}/rest/v1/push_abonelikleri?id=eq.${a.id}`, {
            method: "DELETE",
            headers: restHeaders,
          })
        } else {
          console.error("push gönderilemedi:", err)
        }
      }
    }))

    console.log(JSON.stringify({ duyuruId: duyuru.id, hedefKullanici: kullaniciIdleri.length, abonelik: abonelikler.length, gonderildi, basarisiz }))
    return Response.json({ ok: true, vapidPublicKey: VAPID_PUBLIC_KEY, hedefKullanici: kullaniciIdleri.length, abonelik: abonelikler.length, gonderildi, basarisiz })
  } catch (err) {
    console.error("send-duyuru-push hata:", err)
    return new Response("hata", { status: 500 })
  }
})
