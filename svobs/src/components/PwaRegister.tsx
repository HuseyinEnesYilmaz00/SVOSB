'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { BellRing, X } from 'lucide-react'
import { toast } from 'sonner'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const SERVICE_WORKER_URL = '/sw.js?v=push-7'
const SERVICE_WORKER_VERSION = 'push-7'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function pushAbonesiOlustur(registration: ServiceWorkerRegistration) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    if (!VAPID_PUBLIC_KEY || !('Notification' in window) || !('PushManager' in window)) return false
    if (Notification.permission !== 'granted') return false

    const beklenenAnahtar = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    let subscription = await registration.pushManager.getSubscription()
    const mevcutAnahtar = subscription?.options.applicationServerKey
    if (subscription && mevcutAnahtar) {
      const mevcut = new Uint8Array(mevcutAnahtar)
      const anahtarDegisti = mevcut.length !== beklenenAnahtar.length || mevcut.some((deger, index) => deger !== beklenenAnahtar[index])
      if (anahtarDegisti) {
        await subscription.unsubscribe()
        subscription = null
      }
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: beklenenAnahtar,
      })
    }

    const response = await fetch('/api/push-abone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kullaniciId: user.id, subscription: subscription.toJSON() }),
    })
    if (!response.ok) throw new Error('Push aboneliği kaydedilemedi.')
    return true
  } catch (err) {
    console.error('Push abonelik hatası:', err)
    return false
  }
}

export function PwaRegister() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [izinIstenebilir, setIzinIstenebilir] = useState(false)
  const [bekliyor, setBekliyor] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let aktifKayit: ServiceWorkerRegistration | null = null
    let yenilemeZamani: number | undefined
    const supabase = createClient()
    const durumuGuncelle = async (kayit: ServiceWorkerRegistration) => {
      if (!VAPID_PUBLIC_KEY || !('Notification' in window) || !('PushManager' in window)) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIzinIstenebilir(false); return }
      if (Notification.permission === 'granted') {
        const basarili = await pushAbonesiOlustur(kayit)
        setIzinIstenebilir(!basarili)
      } else if (Notification.permission === 'default') {
        setIzinIstenebilir(true)
      } else {
        setIzinIstenebilir(false)
      }
    }
    const aboneligiYenile = () => {
      if (!aktifKayit || document.visibilityState === 'hidden') return
      void aktifKayit.update().catch(() => undefined)
      void durumuGuncelle(aktifKayit)
    }
    const mesajDinleyici = (event: MessageEvent) => {
      if (event.data?.type === 'DUYURU_YENILE') window.dispatchEvent(new Event('svobs:duyuru-yenile'))
    }
    const gorunurlukDinleyici = () => {
      if (document.visibilityState === 'visible') aboneligiYenile()
    }
    const register = () => {
      void (async () => {
        const mevcutKayit = await navigator.serviceWorker.getRegistration('/')
        const mevcutCalisanUrl = mevcutKayit?.active?.scriptURL || mevcutKayit?.waiting?.scriptURL || mevcutKayit?.installing?.scriptURL || ''
        if (mevcutKayit && !mevcutCalisanUrl.includes(`v=${SERVICE_WORKER_VERSION}`)) {
          const eskiAbonelik = await mevcutKayit.pushManager.getSubscription().catch(() => null)
          await eskiAbonelik?.unsubscribe().catch(() => false)
          await mevcutKayit.unregister()
        }

        const kayit = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
          scope: '/',
          updateViaCache: 'none',
        })
        await kayit.update().catch(() => undefined)
        const hazirKayit = await navigator.serviceWorker.ready
        aktifKayit = hazirKayit
        setRegistration(hazirKayit)
        await durumuGuncelle(hazirKayit)
        yenilemeZamani = window.setInterval(aboneligiYenile, 15 * 60 * 1000)
      })()
        .catch(err => console.error('PWA Service Worker kayıt hatası:', err))
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
    const { data: authDinleyici } = supabase.auth.onAuthStateChange((event: string) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && aktifKayit) window.setTimeout(() => { if (aktifKayit) void durumuGuncelle(aktifKayit) }, 0)
      if (event === 'SIGNED_OUT') setIzinIstenebilir(false)
    })
    navigator.serviceWorker.addEventListener('message', mesajDinleyici)
    document.addEventListener('visibilitychange', gorunurlukDinleyici)
    window.addEventListener('focus', aboneligiYenile)
    window.addEventListener('online', aboneligiYenile)
    window.addEventListener('pageshow', aboneligiYenile)
    return () => {
      window.removeEventListener('load', register)
      navigator.serviceWorker.removeEventListener('message', mesajDinleyici)
      document.removeEventListener('visibilitychange', gorunurlukDinleyici)
      window.removeEventListener('focus', aboneligiYenile)
      window.removeEventListener('online', aboneligiYenile)
      window.removeEventListener('pageshow', aboneligiYenile)
      if (yenilemeZamani) window.clearInterval(yenilemeZamani)
      authDinleyici.subscription.unsubscribe()
    }

  }, [])

  async function bildirimleriAc() {
    if (!registration || bekliyor) return
    setBekliyor(true)
    const izin = await Notification.requestPermission()
    if (izin !== 'granted') {
      setIzinIstenebilir(false)
      setBekliyor(false)
      toast.error('Bildirim izni verilmedi. İstersen tarayıcı ayarlarından daha sonra açabilirsin.')
      return
    }
    const basarili = await pushAbonesiOlustur(registration)
    setBekliyor(false)
    setIzinIstenebilir(!basarili)
    if (basarili) toast.success('Duyuru bildirimleri açıldı.')
    else toast.error('Bildirimler şu anda açılamadı. Lütfen tekrar dene.')
  }

  if (!izinIstenebilir) return null

  return (
    <div className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-primary/15 bg-white/95 p-3 shadow-xl backdrop-blur-xl">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BellRing className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Duyurulardan anında haberdar ol</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Yeni duyurular için cihaz bildirimlerini aç.</p>
      </div>
      <button type="button" onClick={bildirimleriAc} disabled={bekliyor} className="min-h-10 shrink-0 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60">
        {bekliyor ? 'Açılıyor…' : 'Bildirimleri aç'}
      </button>
      <button type="button" aria-label="Bildirim önerisini kapat" onClick={() => setIzinIstenebilir(false)} className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
    </div>
  )
}
