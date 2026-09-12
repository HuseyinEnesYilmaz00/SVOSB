'use client'
// Glass tasarım sistemine geçirildi: ui.* token'ları + glass-btn-primary/secondary,
// modallar ui.modalOverlay/modalCard'a taşındı, sekme + modal geçişlerine framer-motion animasyonu eklendi.
import { toast } from 'sonner'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ui } from '@/lib/ui'
import { programTema } from '@/lib/tema'
import { DockItem } from '@/components/FloatingDock'
import { CalendarCheck, FileText, BookOpen, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const OGRETMEN_SEKMELER: DockItem[] = [
  { id: "yoklama", ad: "Yoklama", ikon: CalendarCheck },
  { id: "notlar", ad: "Notlar", ikon: FileText },
  { id: "odevler", ad: "Ödevler", ikon: BookOpen },
  { id: "duyurular", ad: "Duyurular", ikon: Bell },
]

export default function OgretmenPage() {
  const [kullanici, setKullanici] = useState<any>(null)
  const [dersler, setDersler] = useState<any[]>([])
  const [secilenDers, setSecilenDers] = useState<any>(null)
  const [aktifSekme, setAktifSekme] = useState('yoklama')
  const [yukleniyor, setYukleniyor] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/giris'); return }

      const { data: k } = await supabase
        .from('kullanicilar')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!k || k.rol !== 'ogretmen') { router.push('/giris'); return }
      setKullanici(k)

      const { data: od } = await supabase
        .from('ogretmen_dersleri')
        .select('ders_id')
        .eq('ogretmen_id', user.id)

      const dersIdleri = (od || []).map((x: any) => x.ders_id)

      let dersDetaylari: any[] = []
      if (dersIdleri.length > 0) {
        const { data: dd } = await supabase
          .from('dersler')
          .select('id, ad, sinif_id, siniflar (id, ad, program_id, programlar (ad))')
          .in('id', dersIdleri)

        dersDetaylari = (dd || []).map((ders: any) => ({
          ders_id: ders.id,
          dersler: ders
        }))
      }

      setDersler(dersDetaylari)
      if (dersDetaylari.length > 0) setSecilenDers(dersDetaylari[0])

      setYukleniyor(false)
    }
    yukle()
  }, [])

  async function cikisYap() {
    await supabase.auth.signOut()
    router.push('/giris')
  }

  if (yukleniyor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Yükleniyor...</p>
      </div>
    )
  }

  const tema = programTema(dersler[0]?.dersler?.siniflar?.programlar?.ad || '')

  return (
    <div className={`tema-${tema} min-h-svh bg-background text-foreground transition-colors duration-200`}>
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/sv-logo.png" alt="Siyer Vakfı" className="w-15 h-15 object-contain brightness-0 dark:inverter" />
          <div>
            <p className="text-xs text-muted-foreground">Öğrenci Bilgi Sistemi — Öğretmen Paneli</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{kullanici?.ad} {kullanici?.soyad}</p>
            <p className="text-xs text-muted-foreground">Öğretmen</p>
          </div>

          <div className="flex gap-1.5">
            <a
              href="/sifre-degistir"
              className="px-2.5 py-1 rounded-xl text-[10px] font-medium text-slate-700 bg-white/40 hover:bg-white/70 border border-white/60 shadow-sm transition active:scale-95"
            >
              Şifre
            </a>
            <button
              type="button"
              onClick={cikisYap}
              className="px-2.5 py-1 rounded-xl text-[10px] font-medium text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 shadow-sm transition active:scale-95 cursor-pointer"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Ders Seçici - Sıvı Cam Segmentli Ray (referans glass — değişmedi) */}
      {dersler.length > 1 && (
        <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center justify-start sm:justify-center overflow-x-auto">
          <div
            className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_20px_-4px_rgba(0,0,0,0.05)] select-none"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.50)",
              backdropFilter: "blur(20px) saturate(190%)",
              WebkitBackdropFilter: "blur(20px) saturate(190%)"
            }}
          >
            {dersler.map((d) => {
              const aktif = secilenDers?.ders_id === d.ders_id;
              return (
                <button
                  key={d.ders_id}
                  onClick={() => setSecilenDers(d)}
                  className={`relative px-4 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-2 ${
                    aktif
                      ? "text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_6px_16px_-2px_rgba(0,0,0,0.16)] border border-white/40"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent"
                  }`}
                  style={aktif ? { backgroundColor: "var(--tema-accent)" } : {}}
                >
                  {aktif && (
                    <span
                      className="size-1.5 rounded-full"
                      style={{
                        backgroundColor: "var(--tema-accent)",
                        boxShadow: "0 0 8px rgba(var(--tema-accent-rgb), 0.6)"
                      }}
                    />
                  )}
                  <span>{d.dersler?.ad}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {dersler.length === 0 ? (
        <div className="p-8 text-center text-gray-400">Henüz size atanmış ders yok</div>
      ) : (
        <>
          <div className="pb-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={aktifSekme}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              >
                {aktifSekme === 'yoklama' && secilenDers && (
                  <OgretmenYoklama
                    dersId={secilenDers.ders_id}
                    sinifId={secilenDers.dersler?.siniflar?.id}
                    supabase={supabase}
                    kullanici={kullanici}
                  />
                )}
                {aktifSekme === 'notlar' && secilenDers && (
                  <OgretmenNotlar
                    dersId={secilenDers.ders_id}
                    sinifId={secilenDers.dersler?.siniflar?.id}
                    dersAd={secilenDers.dersler?.ad}
                    supabase={supabase}
                  />
                )}
                {aktifSekme === 'odevler' && secilenDers && (
                  <OgretmenOdevler
                    dersId={secilenDers.ders_id}
                    sinifId={secilenDers.dersler?.siniflar?.id}
                    dersAd={secilenDers.dersler?.ad}
                    supabase={supabase}
                    kullanici={kullanici}
                  />
                )}
                {aktifSekme === 'duyurular' && secilenDers && (
                  <OgretmenDuyurular
                    dersId={secilenDers.ders_id}
                    sinifId={secilenDers.dersler?.siniflar?.id}
                    supabase={supabase}
                    kullanici={kullanici}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Yukarıya Doğru Akışkan Sıvı Cam Dock — referans glass, değişmedi */}
          <div className="fixed bottom-5 inset-x-0 mx-auto z-50 w-[92vw] max-w-[380px] pointer-events-auto">
            <nav
              className="relative p-1.5 select-none overflow-hidden rounded-full"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                backdropFilter: "blur(10px) saturate(210%) contrast(105%)",
                WebkitBackdropFilter: "blur(24px) saturate(210%) contrast(105%)",
                border: "1px solid rgba(255, 255, 255, 0.28)",
                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.50), inset 0 -1px 1px rgba(0, 0, 0, 0.05)"
              }}
            >
              <div className="relative flex items-center w-full h-[44px]">
                {OGRETMEN_SEKMELER.map((item) => {
                  const aktif = aktifSekme === item.id;
                  const Ikon = item.ikon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAktifSekme(item.id)}
                      className="relative z-10 flex-1 h-full flex flex-col items-center justify-center rounded-full cursor-pointer transition-transform duration-150 active:scale-95"
                    >
                      {aktif && (
                        <motion.div
                          layoutId="ogretmen-active-mercury"
                          className="absolute inset-0 rounded-full z-0"
                          style={{
                            backgroundColor: "rgba(27, 67, 50, 0.20)",
                            border: "1px solid rgba(27, 67, 50, 0.35)",
                            boxShadow: "0 2px 8px rgba(27, 67, 50, 0.10), inset 0 1px 1px rgba(255, 255, 255, 0.45)"
                          }}
                          transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        />
                      )}

                      <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
                        <Ikon
                          className="size-4.5 transition-transform duration-200"
                          style={{
                            color: aktif ? "var(--tema-accent)" : "rgba(30, 41, 59, 0.70)",
                            strokeWidth: aktif ? 2.3 : 1.85
                          }}
                        />
                        <span
                          className="text-[10px] tracking-tight leading-none text-center whitespace-nowrap transition-all duration-200"
                          style={{
                            color: aktif ? "var(--tema-accent)" : "rgba(30, 41, 59, 0.70)",
                            fontWeight: aktif ? 600 : 500
                          }}
                        >
                          {item.ad}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  )
}


// ===== YOKLAMA =====
function OgretmenYoklama({ dersId, sinifId, supabase, kullanici }: any) {
  const [ogrenciler, setOgrenciler] = useState<any[]>([])
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0])
  const [yoklamalar, setYoklamalar] = useState<Record<string, string>>({})
  const [mevcutYoklamalar, setMevcutYoklamalar] = useState<any[]>([])
  const [kaydediyor, setKaydediyor] = useState(false)

  useEffect(() => {
    async function yukle() {
      if (!sinifId) return
      const { data: ogr } = await supabase
        .from('ogrenciler')
        .select('id, numara, kullanici_id')
        .eq('sinif_id', sinifId)
        .eq('aktif', true)
        .order('numara')

      if (ogr && ogr.length > 0) {
        const kullaniciIdleri = ogr.map((o: any) => o.kullanici_id)
        const { data: kull } = await supabase
          .from('kullanicilar')
          .select('id, ad, soyad, avatar_url')
          .in('id', kullaniciIdleri)

        const birlesik = ogr.map((o: any) => ({
          ...o,
          kullanicilar: kull?.find((k: any) => k.id === o.kullanici_id)
        }))
        setOgrenciler(birlesik)
      } else {
        setOgrenciler([])
      }
    }
    yukle()
  }, [sinifId])

  useEffect(() => {
    async function yukle() {
      if (!dersId || !tarih) return
      const { data } = await supabase
        .from('yoklamalar')
        .select('*')
        .eq('ders_id', dersId)
        .eq('tarih', tarih)
      setMevcutYoklamalar(data || [])
      const map: Record<string, string> = {}
      ;(data || []).forEach((y: any) => { map[y.ogrenci_id] = y.durum })
      setYoklamalar(map)
    }
    yukle()
  }, [dersId, tarih])

  async function kaydet() {
    setKaydediyor(true)
    for (const o of ogrenciler) {
      const durum = yoklamalar[o.id]
      if (!durum) continue
      const mevcut = mevcutYoklamalar.find(y => y.ogrenci_id === o.id)
      if (mevcut) {
        await supabase.from('yoklamalar').update({ durum }).eq('id', mevcut.id)
      } else {
        await supabase.from('yoklamalar').insert({
          ogrenci_id: o.id, ders_id: dersId, tarih, durum
        })
      }
    }
    setKaydediyor(false)
    toast('Yoklama kaydedildi!')
  }

  const durumlar = [
    { value: 'katildi', label: 'Katıldı', renk: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'katilmadi', label: 'Katılmadı', renk: 'bg-red-100 text-red-700 border-red-300' },
    { value: 'gec', label: 'Geç', renk: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'izinli', label: 'İzinli', renk: 'bg-blue-100 text-blue-700 border-blue-300' },
  ]

  return (
    <div className={`${ui.card} max-w-6xl mx-auto mt-6`}>
      <div className={ui.cardHeader}>
        <p className={ui.cardTitle}>Yoklama</p>
        <div className="flex items-center gap-3">
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)}
            className={ui.select} />
          <button onClick={kaydet} disabled={kaydediyor} className="glass-btn-primary">
            {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
      {ogrenciler.length === 0 ? (
        <div className={ui.cardEmpty}>Bu sınıfta öğrenci yok</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {ogrenciler.map((o) => (
            <div key={o.id} className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
                {o.kullanicilar?.avatar_url ? (
                  <img src={o.kullanicilar.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[9px] font-semibold">
                    {(o.kullanicilar?.ad?.[0] || '') + (o.kullanicilar?.soyad?.[0] || '')}
                  </span>
                )}
                #{o.numara} {o.kullanicilar?.ad} {o.kullanicilar?.soyad}
                {mevcutYoklamalar.find(y => y.ogrenci_id === o.id) && (
                  <span className="ml-2 text-xs text-gray-400">kaydedildi</span>
                )}
              </span>
              <div className="flex gap-1">
                {durumlar.map((d) => (
                  <button key={d.value}
                    onClick={() => setYoklamalar(prev => ({ ...prev, [o.id]: d.value }))}
                    className={`text-xs px-2 py-1 rounded-lg border transition ${
                      yoklamalar[o.id] === d.value ? d.renk + ' font-medium' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== NOTLAR =====
function OgretmenNotlar({ dersId, sinifId, dersAd, supabase }: any) {
  const [ogrenciler, setOgrenciler] = useState<any[]>([])
  const [sinavlar, setSinavlar] = useState<any[]>([])
  const [secilenSinav, setSecilenSinav] = useState<any>(null)
  const [notlar, setNotlar] = useState<Record<string, string>>({})
  const [gecmisNotlar, setGecmisNotlar] = useState<any[]>([])
  const [sekme, setSekme] = useState<'sinavlar' | 'not_giris' | 'gecmis'>('sinavlar')
  const [sinavModalAcik, setSinavModalAcik] = useState(false)
  const [sinavForm, setSinavForm] = useState({ baslik: '', tarih: '', saat: '', konum: '', aciklama: '' })
  const [kaydediyor, setKaydediyor] = useState(false)
  const [kullaniciId, setKullaniciId] = useState<string>('')
  const [programId, setProgramId] = useState<string>('')

  useEffect(() => {
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setKullaniciId(user.id)

      if (!sinifId) return

      const { data: ogr } = await supabase
        .from('ogrenciler')
        .select('id, numara, kullanici_id')
        .eq('sinif_id', sinifId)
        .eq('aktif', true)
        .order('numara')

      if (ogr && ogr.length > 0) {
        const ids = ogr.map((o: any) => o.kullanici_id)
        const { data: kull } = await supabase.from('kullanicilar').select('id, ad, soyad').in('id', ids)
        setOgrenciler(ogr.map((o: any) => ({
          ...o,
          kullanicilar: kull?.find((k: any) => k.id === o.kullanici_id)
        })))
      }

      const { data: sinif } = await supabase.from('siniflar').select('program_id').eq('id', sinifId).single()
      if (sinif) setProgramId(sinif.program_id)
    }
    yukle()
  }, [sinifId])

  useEffect(() => {
    async function yukle() {
      if (!dersId) return
      const { data } = await supabase.from('sinavlar').select('*').eq('ders_id', dersId).order('tarih', { ascending: false })
      setSinavlar(data || [])

      const { data: notData } = await supabase
        .from('notlar')
        .select('*, ogrenciler (numara, kullanici_id), sinavlar (baslik, tarih)')
        .eq('ders_id', dersId)
        .order('olusturulma_tarihi', { ascending: false })
      setGecmisNotlar(notData || [])
    }
    yukle()
  }, [dersId])

  async function sinavEkle() {
    if (!sinavForm.baslik || !sinavForm.tarih) { toast('Başlık ve tarih zorunlu!'); return }
    setKaydediyor(true)

    await supabase.from('sinavlar').insert({
      ders_id: dersId,
      baslik: sinavForm.baslik,
      tarih: sinavForm.tarih,
      saat: sinavForm.saat || null,
      konum: sinavForm.konum || null,
      aciklama: sinavForm.aciklama || null,
      olusturan_id: kullaniciId
    })

    const duyuruIcerik = `${dersAd} dersi için sınav duyurusu:\n\nBaşlık: ${sinavForm.baslik}\nTarih: ${new Date(sinavForm.tarih).toLocaleDateString('tr-TR')}${sinavForm.saat ? '\nSaat: ' + sinavForm.saat : ''}${sinavForm.konum ? '\nKonum: ' + sinavForm.konum : ''}${sinavForm.aciklama ? '\n\nAçıklama: ' + sinavForm.aciklama : ''}`

    if (programId) {
      await supabase.from('duyurular').insert({
        program_id: programId,
        baslik: `Sınav Duyurusu: ${sinavForm.baslik}`,
        icerik: duyuruIcerik,
        yayinlayan_id: kullaniciId
      })
    }

    setSinavForm({ baslik: '', tarih: '', saat: '', konum: '', aciklama: '' })
    setSinavModalAcik(false)
    setKaydediyor(false)

    const { data } = await supabase.from('sinavlar').select('*').eq('ders_id', dersId).order('tarih', { ascending: false })
    setSinavlar(data || [])
    toast('Sınav eklendi ve duyuru yapıldı!')
  }

  async function notKaydet() {
    if (!secilenSinav) { toast('Önce bir sınav seç!'); return }
    setKaydediyor(true)
    for (const o of ogrenciler) {
      const puan = notlar[o.id]
      if (!puan && puan !== '0') continue
      await supabase.from('notlar').insert({
        ogrenci_id: o.id,
        ders_id: dersId,
        sinav_id: secilenSinav.id,
        baslik: secilenSinav.baslik,
        puan: parseFloat(puan),
        tarih: secilenSinav.tarih
      })
    }
    setNotlar({})
    setKaydediyor(false)
    const { data } = await supabase.from('notlar').select('*, ogrenciler (numara, kullanici_id), sinavlar (baslik, tarih)').eq('ders_id', dersId).order('olusturulma_tarihi', { ascending: false })
    setGecmisNotlar(data || [])
    toast('Notlar kaydedildi!')
  }

  const sekmeler = [
    { id: 'sinavlar', ad: 'Sınavlar' },
    { id: 'not_giris', ad: 'Not Girişi' },
    { id: 'gecmis', ad: 'Geçmiş Notlar' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex gap-2 px-4 sm:px-12 pt-4">
        {sekmeler.map(s => (
          <button key={s.id} onClick={() => setSekme(s.id)}
            className={sekme === s.id ? 'glass-btn-primary' : 'glass-btn-secondary'}>
            {s.ad}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={sekme}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16 }}
          className="max-w-6xl mx-auto"
        >
          {sekme === 'sinavlar' && (
            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <p className={ui.cardTitle}>Sınavlar</p>
                <button onClick={() => setSinavModalAcik(true)} className="glass-btn-primary">
                  + Sınav Ekle
                </button>
              </div>
              {sinavlar.length === 0 ? (
                <div className={ui.cardEmpty}>Henüz sınav eklenmemiş</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sinavlar.map((s) => (
                    <div key={s.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800">{s.baslik}</p>
                        <span className="text-xs text-gray-400">{new Date(s.tarih).toLocaleDateString('tr-TR')}</span>
                      </div>
                      {s.saat && <p className="text-sm text-gray-500 mt-1">Saat: {s.saat}</p>}
                      {s.konum && <p className="text-sm text-gray-500">Konum: {s.konum}</p>}
                      {s.aciklama && <p className="text-sm text-gray-400 mt-1">{s.aciklama}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sekme === 'not_giris' && (
            <div className={ui.card}>
              <div className="p-4 border-b border-gray-100">
                <p className={`${ui.cardTitle} mb-3`}>Not Girişi</p>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className={ui.label}>Sınav Seç</label>
                    <select value={secilenSinav?.id || ''} onChange={(e) => setSecilenSinav(sinavlar.find(s => s.id === e.target.value))}
                      className={`${ui.select} w-full`}>
                      <option value="">Sınav seç...</option>
                      {sinavlar.map(s => <option key={s.id} value={s.id}>{s.baslik} — {new Date(s.tarih).toLocaleDateString('tr-TR')}</option>)}
                    </select>
                  </div>
                  <button onClick={notKaydet} disabled={kaydediyor || !secilenSinav} className="glass-btn-primary">
                    {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>
              {ogrenciler.length === 0 ? (
                <div className={ui.cardEmpty}>Bu sınıfta öğrenci yok</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {ogrenciler.map((o) => (
                    <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">
                        #{o.numara} {o.kullanicilar?.ad} {o.kullanicilar?.soyad}
                      </span>
                      <input type="number" min="0" max="100"
                        value={notlar[o.id] || ''}
                        onChange={(e) => setNotlar(prev => ({ ...prev, [o.id]: e.target.value }))}
                        className={`${ui.select} w-20 text-center`}
                        placeholder="—" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sekme === 'gecmis' && (
            gecmisNotlar.length === 0 ? (
              <div className={ui.card}>
                <div className={ui.cardEmpty}>Henüz not girilmemiş</div>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const gruplu = gecmisNotlar.reduce((acc: any, n: any) => {
                    const key = n.sinav_id || n.baslik
                    if (!acc[key]) acc[key] = { baslik: n.baslik, tarih: n.tarih, notlar: [] }
                    acc[key].notlar.push(n)
                    return acc
                  }, {})
                  return Object.values(gruplu).map((grup: any) => (
                    <div key={grup.baslik + grup.tarih} className={ui.card}>
                      <div className={ui.cardHeader}>
                        <p className={ui.cardTitle}>{grup.baslik}</p>
                        <span className="text-xs text-gray-400">{grup.tarih}</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {grup.notlar.map((n: any) => (
                          <div key={n.id} className="px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-gray-700">#{n.ogrenciler?.numara}</span>
                            <span className="text-sm font-medium text-gray-800">{n.puan}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {sinavModalAcik && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={ui.modalOverlay}
          >
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Sınav Ekle</p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <div>
                  <label className={ui.label}>Başlık</label>
                  <input value={sinavForm.baslik} onChange={(e) => setSinavForm({...sinavForm, baslik: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="örn: 1. Dönem Sınavı" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={ui.label}>Tarih</label>
                    <input type="date" value={sinavForm.tarih} onChange={(e) => setSinavForm({...sinavForm, tarih: e.target.value})}
                      className={`${ui.select} w-full`} />
                  </div>
                  <div className="flex-1">
                    <label className={ui.label}>Saat</label>
                    <input type="time" value={sinavForm.saat} onChange={(e) => setSinavForm({...sinavForm, saat: e.target.value})}
                      className={`${ui.select} w-full`} />
                  </div>
                </div>
                <div>
                  <label className={ui.label}>Konum</label>
                  <input value={sinavForm.konum} onChange={(e) => setSinavForm({...sinavForm, konum: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="örn: Dershane, Online..." />
                </div>
                <div>
                  <label className={ui.label}>Açıklama (isteğe bağlı)</label>
                  <textarea value={sinavForm.aciklama} onChange={(e) => setSinavForm({...sinavForm, aciklama: e.target.value})}
                    rows={3}
                    className={`${ui.select} w-full resize-none`}
                    placeholder="Sınav hakkında ek bilgi..." />
                </div>
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setSinavModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>
                  İptal
                </button>
                <button onClick={sinavEkle} disabled={kaydediyor} className="glass-btn-primary flex-1">
                  {kaydediyor ? 'Ekleniyor...' : 'Ekle ve Duyur'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== DUYURULAR =====
function OgretmenDuyurular({ dersId, sinifId, supabase, kullanici }: any) {
  const [duyurular, setDuyurular] = useState<any[]>([])
  const [modalAcik, setModalAcik] = useState(false)
  const [form, setForm] = useState({ baslik: '', icerik: '' })
  const [kaydediyor, setKaydediyor] = useState(false)
  const [sinifProgramId, setSinifProgramId] = useState<string>('')

  useEffect(() => {
    async function yukle() {
      if (!sinifId) return
      const { data: sinif } = await supabase
        .from('siniflar')
        .select('program_id')
        .eq('id', sinifId)
        .single()
      if (sinif) {
        setSinifProgramId(sinif.program_id)
        const { data } = await supabase
          .from('duyurular')
          .select('*, kullanicilar (ad, soyad)')
          .eq('program_id', sinif.program_id)
          .order('olusturulma_tarihi', { ascending: false })
        setDuyurular(data || [])
      }
    }
    yukle()
  }, [sinifId])

  async function duyuruEkle() {
    if (!form.baslik.trim() || !form.icerik.trim()) { toast('Başlık ve içerik zorunlu!'); return }
    setKaydediyor(true)
    await supabase.from('duyurular').insert({
      program_id: sinifProgramId,
      baslik: form.baslik.trim(),
      icerik: form.icerik.trim(),
      yayinlayan_id: kullanici.id
    })
    setForm({ baslik: '', icerik: '' })
    setModalAcik(false)
    setKaydediyor(false)
    const { data } = await supabase
      .from('duyurular')
      .select('*, kullanicilar (ad, soyad)')
      .eq('program_id', sinifProgramId)
      .order('olusturulma_tarihi', { ascending: false })
    setDuyurular(data || [])
  }

  return (
    <div className="max-w-6xl mx-auto mt-6">
      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <p className={ui.cardTitle}>Duyurular</p>
          <button onClick={() => setModalAcik(true)} className="glass-btn-primary">
            + Duyuru Ekle
          </button>
        </div>
        {duyurular.length === 0 ? (
          <div className={ui.cardEmpty}>Henüz duyuru yok</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {duyurular.map((d) => (
              <div key={d.id} className="p-4">
                <h3 className="font-medium text-gray-800 mb-1">{d.baslik}</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{d.icerik}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {d.kullanicilar?.ad} {d.kullanicilar?.soyad} — {new Date(d.olusturulma_tarihi).toLocaleDateString('tr-TR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={ui.modalOverlay}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Yeni Duyuru</p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <div>
                  <label className={ui.label}>Başlık</label>
                  <input value={form.baslik} onChange={(e) => setForm({...form, baslik: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="Duyuru başlığı..." />
                </div>
                <div>
                  <label className={ui.label}>İçerik</label>
                  <textarea value={form.icerik} onChange={(e) => setForm({...form, icerik: e.target.value})}
                    rows={5}
                    className={`${ui.select} w-full resize-none`}
                    placeholder="Duyuru içeriği..." />
                </div>
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>
                  İptal
                </button>
                <button onClick={duyuruEkle} disabled={kaydediyor} className="glass-btn-primary flex-1">
                  {kaydediyor ? 'Yayınlanıyor...' : 'Yayınla'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== ÖDEVLER (Hoca) =====
function OgretmenOdevler({ dersId, sinifId, dersAd, supabase, kullanici }: any) {
  const [odevler, setOdevler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [odevModalAcik, setOdevModalAcik] = useState(false)
  const [teslimModalAcik, setTeslimModalAcik] = useState(false)
  const [aktifOdev, setAktifOdev] = useState<any>(null)
  const [teslimler, setTeslimler] = useState<any[]>([])
  const [teslimYukleniyor, setTeslimYukleniyor] = useState(false)
  const [puanlar, setPuanlar] = useState<Record<string, string>>({})
  const [programId, setProgramId] = useState<string>('')
  const [odevForm, setOdevForm] = useState({ baslik: '', tur: 'kitap_muzakeresi', donem: '', son_teslim_tarihi: '', aciklama: '' })

  useEffect(() => {
    async function yukle() {
      if (!sinifId) return
      const { data: sinif } = await supabase.from('siniflar').select('program_id').eq('id', sinifId).single()
      if (sinif) setProgramId(sinif.program_id)
    }
    yukle()
  }, [sinifId])

  async function odevleriYukle() {
    if (!dersId) return
    const { data } = await supabase
      .from('odevler')
      .select('*')
      .eq('ders_id', dersId)
      .order('son_teslim_tarihi', { ascending: false })
    setOdevler(data || [])
    setYukleniyor(false)
  }

  useEffect(() => { odevleriYukle() }, [dersId])

  async function odevEkle() {
    if (!odevForm.baslik || !odevForm.donem) { toast('Başlık ve dönem zorunlu!'); return }
    setKaydediyor(true)

    const { error } = await supabase.from('odevler').insert({
      program_id: programId,
      ders_id: dersId,
      baslik: odevForm.baslik,
      tur: odevForm.tur,
      donem: odevForm.donem,
      son_teslim_tarihi: odevForm.son_teslim_tarihi || null,
      aciklama: odevForm.aciklama || null,
      olusturan_id: kullanici.id
    })

    if (error) {
      toast.error('Ödev eklenemedi: ' + error.message)
      setKaydediyor(false)
      return
    }

    const turAdi = odevForm.tur === 'kitap_muzakeresi' ? 'Kitap Müzakeresi' : odevForm.tur === 'makale' ? 'Makale' : 'Ödev'
    const duyuruIcerik = `${dersAd} dersi için ${turAdi.toLowerCase()} duyurusu:\n\nBaşlık: ${odevForm.baslik}\nDönem: ${odevForm.donem}${odevForm.son_teslim_tarihi ? '\nSon Teslim: ' + new Date(odevForm.son_teslim_tarihi).toLocaleDateString('tr-TR') : ''}${odevForm.aciklama ? '\n\nAçıklama: ' + odevForm.aciklama : ''}`

    if (programId) {
      await supabase.from('duyurular').insert({
        program_id: programId,
        baslik: `${turAdi} Duyurusu: ${odevForm.baslik}`,
        icerik: duyuruIcerik,
        yayinlayan_id: kullanici.id
      })
    }

    setOdevForm({ baslik: '', tur: 'kitap_muzakeresi', donem: '', son_teslim_tarihi: '', aciklama: '' })
    setOdevModalAcik(false)
    setKaydediyor(false)
    odevleriYukle()
    toast.success('Ödev eklendi ve duyuru yapıldı!')
  }

  async function teslimleriAc(odev: any) {
    setAktifOdev(odev)
    setTeslimModalAcik(true)
    setTeslimYukleniyor(true)

    const { data: teslimData } = await supabase
      .from('odev_teslimleri')
      .select('*')
      .eq('odev_id', odev.id)
      .order('teslim_tarihi', { ascending: false })

    if (teslimData && teslimData.length > 0) {
      const ogrenciIds = [...new Set(teslimData.map((t: any) => t.ogrenci_id))]
      const { data: ogr } = await supabase.from('ogrenciler').select('id, numara, kullanici_id').in('id', ogrenciIds)
      const kullaniciIds = [...new Set((ogr || []).map((o: any) => o.kullanici_id))]
      const { data: kull } = await supabase.from('kullanicilar').select('id, ad, soyad').in('id', kullaniciIds)

      const { data: notData } = await supabase
        .from('notlar')
        .select('*')
        .eq('odev_id', odev.id)

      const zenginTeslim = teslimData.map((t: any) => {
        const ogrenci = ogr?.find((o: any) => o.id === t.ogrenci_id)
        const kullanici2 = kull?.find((k: any) => k.id === ogrenci?.kullanici_id)
        const mevcutNot = notData?.find((n: any) => n.ogrenci_id === t.ogrenci_id)
        return {
          ...t,
          ogrenciAdi: `${kullanici2?.ad || ''} ${kullanici2?.soyad || ''}`,
          ogrenciNo: ogrenci?.numara,
          mevcutPuan: mevcutNot?.puan
        }
      })
      setTeslimler(zenginTeslim)

      const baslangicPuanlar: Record<string, string> = {}
      zenginTeslim.forEach((t: any) => {
        if (t.mevcutPuan !== undefined) baslangicPuanlar[t.ogrenci_id] = String(t.mevcutPuan)
      })
      setPuanlar(baslangicPuanlar)
    } else {
      setTeslimler([])
    }
    setTeslimYukleniyor(false)
  }

  async function notuKaydet(ogrenciId: string) {
    const puan = puanlar[ogrenciId]
    if (!puan) { toast('Önce bir puan gir!'); return }

    const { data: mevcut } = await supabase
      .from('notlar')
      .select('id')
      .eq('ogrenci_id', ogrenciId)
      .eq('odev_id', aktifOdev.id)
      .maybeSingle()

    if (mevcut) {
      await supabase.from('notlar').update({ puan: parseFloat(puan) }).eq('id', mevcut.id)
    } else {
      await supabase.from('notlar').insert({
        ogrenci_id: ogrenciId,
        ders_id: dersId,
        odev_id: aktifOdev.id,
        baslik: aktifOdev.baslik,
        puan: parseFloat(puan),
        tarih: aktifOdev.son_teslim_tarihi || new Date().toISOString().slice(0, 10)
      })
    }
    toast.success('Not kaydedildi!')
  }

  function odevSil(id: string) {
    toast('Bu ödev silinecek', {
      description: 'Bu işlem geri alınamaz.',
      action: {
        label: 'Sil',
        onClick: async () => {
          const { error } = await supabase.from('odevler').delete().eq('id', id)
          if (error) { toast.error('Silinemedi: ' + error.message); return }
          toast.success('Ödev silindi')
          odevleriYukle()
        },
      },
      cancel: { label: 'Vazgeç', onClick: () => {} },
    })
  }

  if (yukleniyor) return <p className="text-gray-500 max-w-6xl mx-auto mt-6">Yükleniyor...</p>

  return (
    <div className="max-w-6xl mx-auto mt-6 space-y-4">
      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <p className={ui.cardTitle}>Ödevler — {dersAd}</p>
          <button onClick={() => setOdevModalAcik(true)} className="glass-btn-primary">
            + Ödev Ekle
          </button>
        </div>
        {odevler.length === 0 ? (
          <div className={ui.cardEmpty}>Henüz ödev eklenmemiş</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {odevler.map((o) => (
              <div key={o.id} className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{o.baslik}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {o.tur === 'kitap_muzakeresi' ? 'Kitap Müzakeresi' : o.tur === 'makale' ? 'Makale' : 'Diğer'} · {o.donem}
                  </p>
                  {o.son_teslim_tarihi && (
                    <p className={`text-xs mt-1 ${new Date(o.son_teslim_tarihi) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      {new Date(o.son_teslim_tarihi) < new Date() ? '⚠ Süresi geçti — ' : ''}
                      Son teslim: {new Date(o.son_teslim_tarihi).toLocaleDateString('tr-TR')}
                    </p>
                  )}
                  {o.aciklama && <p className="text-sm text-gray-400 mt-1">{o.aciklama}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => teslimleriAc(o)} className={ui.btnGhost}>
                    Teslimler
                  </button>
                  <button onClick={() => odevSil(o.id)} className={ui.btnDanger}>
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {odevModalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={ui.modalOverlay}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Ödev Ekle</p>
                <p className="text-xs text-gray-400 mt-0.5">{dersAd}</p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <div>
                  <label className={ui.label}>Başlık</label>
                  <input value={odevForm.baslik} onChange={(e) => setOdevForm({...odevForm, baslik: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="örn: Siyer Kitabı Müzakeresi" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={ui.label}>Tür</label>
                    <select value={odevForm.tur} onChange={(e) => setOdevForm({...odevForm, tur: e.target.value})}
                      className={`${ui.select} w-full`}>
                      <option value="kitap_muzakeresi">Kitap Müzakeresi</option>
                      <option value="makale">Makale</option>
                      <option value="diger">Diğer</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className={ui.label}>Dönem</label>
                    <input value={odevForm.donem} onChange={(e) => setOdevForm({...odevForm, donem: e.target.value})}
                      className={`${ui.select} w-full`}
                      placeholder="örn: 2025-2026 Güz" />
                  </div>
                </div>
                <div>
                  <label className={ui.label}>Son Teslim Tarihi (isteğe bağlı)</label>
                  <input type="date" value={odevForm.son_teslim_tarihi} onChange={(e) => setOdevForm({...odevForm, son_teslim_tarihi: e.target.value})}
                    className={`${ui.select} w-full`} />
                </div>
                <div>
                  <label className={ui.label}>Açıklama (isteğe bağlı)</label>
                  <textarea value={odevForm.aciklama} onChange={(e) => setOdevForm({...odevForm, aciklama: e.target.value})}
                    rows={3}
                    className={`${ui.select} w-full resize-none`}
                    placeholder="Ödev hakkında ek bilgi..." />
                </div>
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setOdevModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>
                  İptal
                </button>
                <button onClick={odevEkle} disabled={kaydediyor} className="glass-btn-primary flex-1">
                  {kaydediyor ? 'Ekleniyor...' : 'Ekle ve Duyur'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teslimModalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={ui.modalOverlay}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={`${ui.modalCard} max-w-2xl max-h-[85vh] overflow-y-auto`}
            >
              <div className={ui.modalHeader}>
                <div className="flex items-center justify-between">
                  <p className={ui.modalTitle}>{aktifOdev?.baslik} — Teslimler</p>
                  <button onClick={() => setTeslimModalAcik(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
              </div>

              <div className={ui.modalBody}>
                {teslimYukleniyor ? (
                  <p className="text-gray-500">Yükleniyor...</p>
                ) : teslimler.length === 0 ? (
                  <p className="text-gray-500">Henüz teslim yok.</p>
                ) : (
                  <div className="space-y-4">
                    {teslimler.map((t) => (
                      <div key={t.ogrenci_id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{t.ogrenciAdi}</p>
                            <p className="text-sm text-gray-500">No: {t.ogrenciNo}</p>
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(t.teslim_tarihi).toLocaleDateString('tr-TR')}
                          </p>
                        </div>

                        <details className="mb-3">
                          <summary className="cursor-pointer text-sm text-[#344e41]">Metni görüntüle</summary>
                          <div
                            className="prose prose-sm max-w-none mt-2 border-t pt-2"
                            dangerouslySetInnerHTML={{ __html: t.icerik_html || '' }}
                          />
                        </details>

                        <a
                          href={`/api/odev-export-docx?id=${t.id}`}
                          className={`${ui.btnGhost} mb-3 inline-block`}
                        >
                          Dosyayı indir (.docx)
                        </a>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className={`${ui.select} w-24`}
                            placeholder="Puan"
                            value={puanlar[t.ogrenci_id] || ''}
                            onChange={(e) =>
                              setPuanlar((prev) => ({ ...prev, [t.ogrenci_id]: e.target.value }))
                            }
                          />
                          <button
                            onClick={() => notuKaydet(t.ogrenci_id)}
                            className="glass-btn-primary"
                          >
                            Kaydet
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}