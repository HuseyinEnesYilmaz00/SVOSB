'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StudentReportView } from '@/components/student/student-report-view'
import { SorumlulukPaneli } from '@/app/ogrenci/sorumluluk'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, 
  CalendarCheck, 
  FileText, 
  Bell, 
  Inbox, 
  Camera, 
  Award, 
  Flame, 
  Star, 
  Sparkles, 
  Users, 
  TrendingUp,
  User,
  LogOut,
  CheckCheck
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { guncelAkademikDonem, tarihtenDonem } from '@/lib/donem'

const SEKMELER = [
  { id: 'program', ad: 'Program', ikon: CalendarCheck },
  { id: 'dersler', ad: 'Dersler', ikon: BookOpen },
  { id: 'duyurular', ad: 'Duyurular', ikon: Bell },
  { id: 'hesabim', ad: 'Hesabım', ikon: User },
]

export default function OgrenciPage() {
  const [kullanici, setKullanici] = useState<any>(null)
  const [ogrenci, setOgrenci] = useState<any>(null)
  const [sinif, setSinif] = useState<any>(null)
  const [program, setProgram] = useState<any>(null)
  const [duyurular, setDuyurular] = useState<any[]>([])
  const [okunmamisDuyuruVar, setOkunmamisDuyuruVar] = useState(false)
  const [dersler, setDersler] = useState<any[]>([])
  const [dersSorumluluklari, setDersSorumluluklari] = useState<any[]>([])
  const [genelOrtalama, setGenelOrtalama] = useState<number | null>(null)
  const [aktifSekme, setAktifSekme] = useState('program')
  const [avatarYukleniyor, setAvatarYukleniyor] = useState(false)
  const [secilenRozet, setSecilenRozet] = useState<{ ad: string, aciklama: string } | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/giris'); return }

      const { data: k } = await supabase
        .from('kullanicilar').select('*').eq('id', user.id).single()
      if (!k) { router.push('/giris'); return }
      if (k.rol === 'super_admin' || k.rol === 'program_admin') { router.push('/admin'); return }
      if (k.rol === 'ogretmen') { router.push('/ogretmen'); return }
      setKullanici(k)

      const { data: o } = await supabase
        .from('ogrenciler')
        .select('*, siniflar (*, programlar (*))')
        .eq('kullanici_id', user.id).single()
      if (!o) { setYukleniyor(false); return }
      if (o.aktif === false) {
        await supabase.auth.signOut()
        router.push('/giris')
        return
      }
      setOgrenci(o)
      setSinif(o.siniflar)
      setProgram(o.siniflar?.programlar)

      // Duyurular ve Okundu Kontrolü
      const sinifIdGuvenli = o.siniflar?.id || '00000000-0000-0000-0000-000000000000'
      const { data: duy } = await supabase
        .from('duyurular')
        .select('*, kullanicilar!duyurular_yayinlayan_id_fkey (ad, soyad)')
        .eq('program_id', o.siniflar?.programlar?.id)
        .or(`hedef_tipi.eq.tumu,hedef_sinif_id.eq.${sinifIdGuvenli},hedef_kullanici_id.eq.${user.id}`)
        .order('olusturulma_tarihi', { ascending: false })
      
      const gelenDuyurular = duy || []
      setDuyurular(gelenDuyurular)

      const sonOkumaZamani = localStorage.getItem('svobs_son_okunan_duyuru')
      if (gelenDuyurular.length > 0) {
        if (!sonOkumaZamani) {
          setOkunmamisDuyuruVar(true)
        } else {
          const enSonDuyuruTarihi = new Date(gelenDuyurular[0].olusturulma_tarihi).getTime()
          setOkunmamisDuyuruVar(enSonDuyuruTarihi > parseInt(sonOkumaZamani, 10))
        }
      }

      // Ders sorumluluklari
      const { data: ds } = await supabase
        .from('ders_sorumlulari')
        .select('*, dersler (ad)')
        .eq('ogrenci_id', o.id)
      setDersSorumluluklari(ds || [])

      // Dersler
      const { data: dersData } = await supabase
        .from('dersler')
        .select('*')
        .eq('sinif_id', o.siniflar?.id)
        .eq('aktif', true)
        .order('gun')

      const devamPuanlari: Record<string, number> = {
        katildi: 100, gec: 0, izinli: 0, katilmadi: 0
      }

      let tumNotlar: any[] = []
      let tumYoklamalar: any[] = []

      const dersDetaylari = await Promise.all((dersData || []).map(async (d: any) => {
        const { data: notlar } = await supabase
          .from('notlar')
          .select('*')
          .eq('ders_id', d.id)
          .eq('ogrenci_id', o.id)
          .order('tarih', { ascending: false })

        const { data: yoklamalar } = await supabase
          .from('yoklamalar')
          .select('*')
          .eq('ders_id', d.id)
          .eq('ogrenci_id', o.id)
          .order('tarih', { ascending: false })

        if (notlar) tumNotlar.push(...notlar)
        if (yoklamalar) tumYoklamalar.push(...yoklamalar)

        const sinavOrtHam = notlar && notlar.length > 0
          ? notlar.reduce((s: number, n: any) => s + n.puan, 0) / notlar.length
          : null

        const devamOrtHam = yoklamalar && yoklamalar.length > 0
          ? yoklamalar.reduce((s: number, y: any) => s + (devamPuanlari[y.durum] || 0), 0) / yoklamalar.length
          : null

        let dersPuaniHam = null
        if (sinavOrtHam !== null && devamOrtHam !== null) {
          dersPuaniHam = sinavOrtHam * 0.5 + devamOrtHam * 0.5
        } else if (sinavOrtHam !== null) {
          dersPuaniHam = sinavOrtHam
        } else if (devamOrtHam !== null) {
          dersPuaniHam = devamOrtHam
        }

        return {
          id: d.id,
          ad: d.ad,
          gun: d.gun,
          saat: d.saat,
          sinavlar: (notlar || []).map((n: any) => ({
            id: n.id,
            baslik: n.baslik,
            tarih: n.tarih,
            puan: n.puan,
          })),
          yoklamalar: (yoklamalar || []).map((y: any) => ({
            id: y.id,
            tarih: y.tarih,
            durum: y.durum,
          })),
          sinavOrtalama: sinavOrtHam !== null ? Number(sinavOrtHam.toFixed(2)) : null,
          devamPuani: devamOrtHam !== null ? Number(devamOrtHam.toFixed(2)) : null,
          dersPuani: dersPuaniHam !== null ? Number(dersPuaniHam.toFixed(2)) : null,
        }
      }))

      setDersler(dersDetaylari)

      const genelSinavOrt = tumNotlar.length > 0 ? tumNotlar.reduce((s, n) => s + n.puan, 0) / tumNotlar.length : null
      const genelDevamOrt = tumYoklamalar.length > 0 ? tumYoklamalar.reduce((s, y) => s + (devamPuanlari[y.durum] || 0), 0) / tumYoklamalar.length : null

      let gercekGenelOrt = null
      if (genelSinavOrt !== null && genelDevamOrt !== null) {
        gercekGenelOrt = genelSinavOrt * 0.5 + genelDevamOrt * 0.5
      } else if (genelSinavOrt !== null) {
        gercekGenelOrt = genelSinavOrt
      } else if (genelDevamOrt !== null) {
        gercekGenelOrt = genelDevamOrt
      }

      setGenelOrtalama(gercekGenelOrt !== null ? Number(gercekGenelOrt.toFixed(2)) : null)
      setYukleniyor(false)
    }
    yukle()
  }, [])

  function duyurulariOkunduIsaretle() {
    localStorage.setItem('svobs_son_okunan_duyuru', Date.now().toString())
    setOkunmamisDuyuruVar(false)
    toast.success('Tüm duyurular okundu sayıldı')
  }

  async function avatarYukle(file: File) {
    if (!kullanici) return
    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyası yükleyebilirsiniz')
      return
    }
    setAvatarYukleniyor(true)
    const uzanti = file.name.split('.').pop()
    const yol = `${kullanici.id}/avatar.${uzanti}`

    const { error: yuklemeHata } = await supabase.storage
      .from('avatarlar')
      .upload(yol, file, { upsert: true, cacheControl: '3600' })

    if (yuklemeHata) {
      toast.error('Fotoğraf yüklenemedi: ' + yuklemeHata.message)
      setAvatarYukleniyor(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatarlar').getPublicUrl(yol)
    const yeniUrl = urlData.publicUrl + '?t=' + Date.now()

    const { error: guncelleHata } = await supabase
      .from('kullanicilar')
      .update({ avatar_url: yeniUrl })
      .eq('id', kullanici.id)

    if (guncelleHata) {
      toast.error('Profil güncellenemedi: ' + guncelleHata.message)
      setAvatarYukleniyor(false)
      return
    }

    setKullanici((prev: any) => ({ ...prev, avatar_url: yeniUrl }))
    setAvatarYukleniyor(false)
    toast.success('Profil fotoğrafı güncellendi!')
  }

  async function cikisYap() {
    await supabase.auth.signOut()
    router.push('/giris')
  }


  if (yukleniyor) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background relative">
      {/* Ultra Kompakt Şeffaf Üst Bar (Ekranın yerini çalmaz) */}
      <header className="px-4 py-2 flex items-center justify-between sticky top-0 z-20 bg-background/60 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <img src="/sv-logo.png" alt="Siyer Vakfı" className="w-7 h-7 object-contain brightness-0 dark:invert" />
          <div>
            <p className="text-xs font-semibold leading-none">{program?.ad}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sinif?.ad}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 pr-1 border-r border-border/50">
            {kullanici?.avatar_url ? (
              <img src={kullanici.avatar_url} alt="Profil" className="w-7 h-7 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold">
                {(kullanici?.ad?.[0] || '') + (kullanici?.soyad?.[0] || '')}
              </div>
            )}
            <span className="text-xs font-medium hidden sm:inline-block text-foreground">{kullanici?.ad}</span>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
            onClick={cikisYap}
            title="Çıkış Yap"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      {/* Ana Gövde */}
      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5 has-dock">
        <OgrenciKatilimYildonumu ogrenci={ogrenci} />
        <OgrenciBuHaftaOzet ogrenciId={ogrenci?.id} dersler={dersler} supabase={supabase} />

        {aktifSekme === 'program' && (
          <OgrenciDersProgrami sinifId={sinif?.id} supabase={supabase} />
        )}

        {aktifSekme === 'dersler' && (
          <div className="space-y-5">
            <OgrenciOdevlerim ogrenciId={ogrenci?.id} dersler={dersler} supabase={supabase} />

            {dersSorumluluklari.length > 0 && (
              <SorumlulukPaneli
                ogrenciId={ogrenci?.id}
                dersler={dersSorumluluklari}
                supabase={supabase}
              />
            )}

            <StudentReportView
              dersler={dersler}
              genelOrtalama={genelOrtalama}
              ogrenciNo={ogrenci?.numara}
            />

            <OgrenciGelisimGrafigi ogrenciId={ogrenci?.id} supabase={supabase} />
            <OgrenciDevamTrendMesaji dersler={dersler} />
            <SinifTopluluk dersler={dersler} supabase={supabase} />
          </div>
        )}

        {aktifSekme === 'duyurular' && (
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-muted-foreground" />
                <h2 className="font-medium text-sm text-foreground">Duyurular</h2>
              </div>
              {duyurular.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={duyurulariOkunduIsaretle}
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
                >
                  <CheckCheck className="size-3.5" />
                  <span>Tümünü Okundu Say</span>
                </Button>
              )}
            </div>

            {duyurular.length === 0 ? (
              <div className="px-5 py-12 flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <Inbox className="size-8 opacity-40" />
                Henüz duyuru yok
              </div>
            ) : (
              <div className="divide-y divide-border">
                {duyurular.map((d) => (
                  <div key={d.id} className="px-5 py-4">
                    <p className="font-medium text-sm text-foreground">{d.baslik}</p>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{d.icerik}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {d.kullanicilar?.ad} {d.kullanicilar?.soyad} — {new Date(d.olusturulma_tarihi).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {aktifSekme === 'hesabim' && (
          <div className="space-y-5">
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-5 flex items-center gap-4">
                {kullanici?.avatar_url ? (
                  <img src={kullanici.avatar_url} alt="Profil" className="w-16 h-16 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-semibold">
                    {(kullanici?.ad?.[0] || '') + (kullanici?.soyad?.[0] || '')}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{kullanici?.ad} {kullanici?.soyad}</p>
                  <label className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer mt-1">
                    <Camera className="size-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={avatarYukleniyor}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) avatarYukle(file)
                      }}
                    />
                    {avatarYukleniyor ? 'Yükleniyor...' : 'Fotoğraf değiştir'}
                  </label>
                </div>
              </div>
            </Card>

            {(() => {
              const rozetler: { ad: string, ikon: any, renk: string, aciklama: string }[] = []
              const puanliDersler = dersler.filter((d: any) => d.dersPuani !== null)
              const tamDevam = dersler.length > 0 && dersler.every((d: any) => d.devamPuani === null || d.devamPuani === 100)
              if (tamDevam && dersler.some((d: any) => d.devamPuani !== null)) {
                rozetler.push({
                  ad: 'Tam Devam',
                  ikon: Flame,
                  renk: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40',
                  aciklama: 'Kayıtlı olduğun tüm derslerde devam oranın %100. Hiç ders kaçırmadın, tebrikler!'
                })
              }
              if (genelOrtalama !== null && genelOrtalama >= 85) {
                rozetler.push({
                  ad: 'Yüksek Başarı',
                  ikon: Star,
                  renk: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
                  aciklama: `Genel ortalaman ${genelOrtalama} — 85 ve üzeri ortalamalara verilen bir rozet.`
                })
              }
              if (puanliDersler.length > 0 && puanliDersler.every((d: any) => d.dersPuani >= 70)) {
                rozetler.push({
                  ad: 'İstikrarlı',
                  ikon: Award,
                  renk: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
                  aciklama: 'Kayıtlı olduğun bütün derslerde puanın 70 ve üzerinde. Hiçbir dersin ortalaması düşük değil.'
                })
              }
              if (rozetler.length === 0) return null
              return (
                <Card className="p-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="font-medium text-sm text-foreground">Rozetlerim</h2>
                  </div>
                  <div className="px-5 py-4 flex flex-wrap gap-2">
                    {rozetler.map((r) => (
                      <button
                        key={r.ad}
                        onClick={() => setSecilenRozet({ ad: r.ad, aciklama: r.aciklama })}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${r.renk} hover:opacity-80 transition`}
                      >
                        <r.ikon className="size-3.5" />
                        {r.ad}
                      </button>
                    ))}
                  </div>
                </Card>
              )
            })()}

            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-medium text-sm text-foreground">Hesabım</h2>
              </div>
              <div className="divide-y divide-border">
                {[
                  { label: 'Ad Soyad', value: `${kullanici?.ad} ${kullanici?.soyad}` },
                  { label: 'E-posta', value: kullanici?.email },
                  { label: 'Telefon', value: kullanici?.telefon || '—' },
                  { label: 'Öğrenci No', value: `#${ogrenci?.numara}` },
                  { label: 'Sınıf', value: sinif?.ad },
                  { label: 'Program', value: program?.ad },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-border">
                <a href="/sifre-degistir" className="text-sm text-primary hover:underline">
                  Şifre Değiştir
                </a>
              </div>
            </Card>

            <div className="flex justify-center mt-12 pb-6">
              <span className="text-[10px] text-muted-foreground/20 select-none cursor-default font-mono">
                enes°
              </span>
            </div>
          </div>
        )}
      </main>

            {/* Ekranın Altında Yüzen Sıvı Cam Navigasyon Barı */}
      <div className="fixed bottom-5 inset-x-0 mx-auto z-50 w-[92vw] max-w-[380px] pointer-events-auto">
        <motion.nav
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
            {SEKMELER.map((item) => {
              const aktif = aktifSekme === item.id;
              const Ikon = item.ikon;
              const rozetGoster = item.id === 'duyurular' && okunmamisDuyuruVar;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAktifSekme(item.id)}
                  className="relative z-10 flex-1 h-full flex flex-col items-center justify-center rounded-full cursor-pointer transition-transform duration-150 active:scale-95"
                >
                  {aktif && (
                    <motion.div
                      layoutId="ogrenci-active-mercury"
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
                    <div className="relative">
                      <Ikon
                        className={`size-4.5 transition-transform duration-200 ${aktif ? "scale-105" : "scale-100"}`}
                        style={{
                          color: aktif ? "#1b4332" : "rgba(30, 41, 59, 0.70)",
                          strokeWidth: aktif ? 2.3 : 1.85
                        }}
                      />
                      {rozetGoster && (
                        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-red-500 border border-white" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] tracking-tight leading-none text-center whitespace-nowrap transition-all duration-200 ${aktif ? "font-semibold" : "font-medium"}`}
                      style={{ color: aktif ? "#1b4332" : "rgba(30, 41, 59, 0.70)" }}
                    >
                      {item.ad}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.nav>
      </div>

      {secilenRozet && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSecilenRozet(null)}
        >
          <div
            className="bg-card border border-border rounded-xl p-5 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm text-foreground">{secilenRozet.ad}</h3>
              <button onClick={() => setSecilenRozet(null)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
            </div>
            <p className="text-sm text-muted-foreground">{secilenRozet.aciklama}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function OgrenciDersProgrami({ sinifId, supabase }: { sinifId: string, supabase: any }) {
  const [dersler, setDersler] = useState<any[]>([])
  const [iptaller, setIptaller] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    async function yukle() {
      if (!sinifId) return
      const { data } = await supabase
        .from('dersler')
        .select('*, ogretmen_dersleri (kullanicilar (ad, soyad))')
        .eq('sinif_id', sinifId)
        .eq('aktif', true)
        .order('gun')
      setDersler(data || [])

      const dersIdleri = (data || []).map((d: any) => d.id)
      if (dersIdleri.length > 0) {
        const bugun = new Date()
        const haftaBasi = new Date(bugun)
        haftaBasi.setDate(bugun.getDate() - ((bugun.getDay() + 6) % 7))
        const haftaBasiStr = haftaBasi.toISOString().split('T')[0]
        const { data: ipt } = await supabase
          .from('ders_oturumlari')
          .select('*')
          .in('ders_id', dersIdleri)
          .eq('durum', 'iptal')
          .gte('tarih', haftaBasiStr)
        setIptaller(ipt || [])
      }
      setYukleniyor(false)
    }
    yukle()
  }, [sinifId])

  const gunler = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

  function dersbuHaftaVarMi(ders: any): boolean {
    if (ders.periyot === 'haftalik') return true
    if (!ders.baslangic_tarihi) return true
    const bugun = new Date()
    const baslangic = new Date(ders.baslangic_tarihi)
    const buHaftaBasi = new Date(bugun)
    buHaftaBasi.setDate(bugun.getDate() - ((bugun.getDay() + 6) % 7))
    buHaftaBasi.setHours(0, 0, 0, 0)
    const baslangicHaftaBasi = new Date(baslangic)
    baslangicHaftaBasi.setDate(baslangic.getDate() - ((baslangic.getDay() + 6) % 7))
    baslangicHaftaBasi.setHours(0, 0, 0, 0)
    const farkHafta = Math.round((buHaftaBasi.getTime() - baslangicHaftaBasi.getTime()) / (7 * 24 * 60 * 60 * 1000))
    if (farkHafta < 0) return false
    switch (ders.periyot) {
      case '2haftada1': return farkHafta % 2 === 0
      case '3haftada1': return farkHafta % 3 === 0
      case 'ayda1': return farkHafta % 4 === 0
      default: return true
    }
  }

  if (yukleniyor) return null

  const gunlereGore = gunler.map(gun => ({
    gun,
    dersler: dersler.filter(d => d.gun === gun)
  })).filter(g => g.dersler.length > 0)

  if (gunlereGore.length === 0) return null

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-medium text-sm text-foreground">Haftalık Ders Programı</h2>
      </div>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[600px]">
          {gunler.map(gun => (
            <div key={gun} className="px-2 py-2 border-b border-r border-border bg-muted/50 last:border-r-0">
              <p className="text-xs font-medium text-muted-foreground text-center">{gun.slice(0, 3)}</p>
            </div>
          ))}
          {gunler.map(gun => {
            const gunDersleri = dersler
              .filter(d => d.gun === gun)
              .sort((a: any, b: any) => (a.saat || '').localeCompare(b.saat || ''))
            return (
              <div key={gun} className="border-r border-border last:border-r-0 min-h-[120px] p-1.5 space-y-1">
                {gunDersleri.map((d: any) => {
                  const iptal = iptaller.find(i => i.ders_id === d.id)
                  const buHafta = dersbuHaftaVarMi(d)
                  return (
                    <div
                      key={d.id}
                      className={`rounded-md px-2 py-1.5 text-xs ${
                        iptal
                          ? 'bg-destructive/10 text-destructive border border-destructive/20'
                          : !buHafta
                          ? 'bg-muted text-muted-foreground border border-border opacity-50'
                          : 'bg-primary/10 text-primary border border-primary/20'
                      }`}
                    >
                      <p className="font-medium leading-tight">{d.ad}</p>
                      <p className="opacity-70 mt-0.5">{d.saat}</p>
                      {iptal && <p className="font-medium mt-0.5">İptal</p>}
                      {!buHafta && !iptal && <p className="mt-0.5">Bu hafta yok</p>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function OgrenciOdevlerim({ ogrenciId, dersler, supabase }: { ogrenciId: string, dersler: any[], supabase: any }) {
  const [odevler, setOdevler] = useState<any[]>([])
  const [teslimler, setTeslimler] = useState<Record<string, any>>({})
  const [hocaNotlari, setHocaNotlari] = useState<Record<string, number>>({})
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yukleniyorOdevId, setYukleniyorOdevId] = useState<string | null>(null)
  const [aiYukleniyorId, setAiYukleniyorId] = useState<string | null>(null)

  useEffect(() => {
    async function yukle() {
      if (!ogrenciId || dersler.length === 0) { setYukleniyor(false); return }
      const dersIds = dersler.map(d => d.id)
      const { data: odevData } = await supabase
        .from('odevler')
        .select('*')
        .in('ders_id', dersIds)
        .order('son_teslim_tarihi', { ascending: true })

      const { data: teslimData } = await supabase
        .from('odev_teslimleri')
        .select('*')
        .eq('ogrenci_id', ogrenciId)

      const teslimMap: Record<string, any> = {}
      ;(teslimData || []).forEach((t: any) => { teslimMap[t.odev_id] = t })

      const { data: notData } = await supabase
        .from('notlar')
        .select('odev_id, puan')
        .eq('ogrenci_id', ogrenciId)
        .not('odev_id', 'is', null)

      const notMap: Record<string, number> = {}
      ;(notData || []).forEach((n: any) => { notMap[n.odev_id] = n.puan })

      setOdevler(odevData || [])
      setTeslimler(teslimMap)
      setHocaNotlari(notMap)
      setYukleniyor(false)
    }
    yukle()
  }, [ogrenciId, dersler])

  async function dosyaYukle(odevId: string, dersId: string, file: File) {
    if (!file.name.endsWith('.docx')) {
      toast.error('Sadece .docx dosyası yükleyebilirsiniz')
      return
    }
    setYukleniyorOdevId(odevId)

    const formData = new FormData()
    formData.append('dosya', file)
    formData.append('odevId', odevId)
    formData.append('dersId', dersId)
    formData.append('ogrenciId', ogrenciId)

    try {
      const res = await fetch('/api/odev-teslim', { method: 'POST', body: formData })
      const sonuc = await res.json()
      if (!res.ok) throw new Error(sonuc.hata || 'Yükleme başarısız')

      setTeslimler(prev => ({ ...prev, [odevId]: sonuc.teslim }))
      toast.success('Ödev teslim edildi!')
    } catch (err: any) {
      toast.error('Hata: ' + err.message)
    } finally {
      setYukleniyorOdevId(null)
    }
  }

  async function aiDegerlendir(teslimId: string) {
    setAiYukleniyorId(teslimId)
    try {
      const res = await fetch('/api/odev-ai-degerlendir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teslimId })
      })
      const sonuc = await res.json()
      if (!res.ok) throw new Error(sonuc.hata || 'Değerlendirme başarısız')

      setTeslimler(prev => {
        const odevId = Object.keys(prev).find(k => prev[k].id === teslimId)
        if (!odevId) return prev
        return { ...prev, [odevId]: sonuc.teslim }
      })
      toast.success('AI değerlendirmesi tamamlandı!')
    } catch (err: any) {
      toast.error('Hata: ' + err.message)
    } finally {
      setAiYukleniyorId(null)
    }
  }

  if (yukleniyor || odevler.length === 0) return null

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-medium text-sm text-foreground">Ödevlerim</h2>
      </div>
      <div className="divide-y divide-border">
        {odevler.map((o) => {
          const teslim = teslimler[o.id]
          const ders = dersler.find(d => d.id === o.ders_id)
          return (
            <div key={o.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{o.baslik}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ders?.ad} · {o.tur === 'kitap_muzakeresi' ? 'Kitap Müzakeresi' : o.tur === 'makale' ? 'Makale' : 'Diğer'} · {o.donem}
                  </p>
                  {o.son_teslim_tarihi && (
                    <p className={`text-xs mt-1 ${
                      !teslim && new Date(o.son_teslim_tarihi) < new Date()
                        ? 'text-destructive font-medium'
                        : 'text-muted-foreground'
                    }`}>
                      {!teslim && new Date(o.son_teslim_tarihi) < new Date() ? '⚠ Süresi geçti — ' : ''}
                      Son teslim: {new Date(o.son_teslim_tarihi).toLocaleDateString('tr-TR')}
                    </p>
                  )}
                  {o.aciklama && <p className="text-xs text-muted-foreground mt-2">{o.aciklama}</p>}
                </div>
              </div>

              <div className="mt-3">
                {!teslim ? (
                  <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
                    <input
                      type="file"
                      accept=".docx"
                      className="hidden"
                      disabled={yukleniyorOdevId === o.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) dosyaYukle(o.id, o.ders_id, file)
                      }}
                    />
                    {yukleniyorOdevId === o.id ? 'Yükleniyor...' : '📎 .docx dosyası yükle'}
                  </label>
                ) : (
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-foreground">
                      ✓ Teslim edildi — {new Date(teslim.teslim_tarihi).toLocaleDateString('tr-TR')}
                    </p>
                    {hocaNotlari[o.id] !== undefined && (
                      <p className="text-xs font-medium text-foreground mt-2">
                        Öğretmen Notu: {hocaNotlari[o.id]}
                      </p>
                    )}
                    {teslim.ai_degerlendirildi ? (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground font-medium">AI Değerlendirmesi</p>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{teslim.ai_degerlendirme}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => aiDegerlendir(teslim.id)}
                        disabled={aiYukleniyorId === teslim.id}
                        className="text-xs text-primary hover:underline mt-1 disabled:opacity-50"
                      >
                        {aiYukleniyorId === teslim.id ? 'Değerlendiriliyor...' : '✨ AI ile değerlendir'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function OgrenciGelisimGrafigi({ ogrenciId, supabase }: { ogrenciId: string, supabase: any }) {
  const [veri, setVeri] = useState<any[]>([])
  const [detay, setDetay] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    async function yukle() {
      if (!ogrenciId) { setYukleniyor(false); return }

      const { data: notlar } = await supabase
        .from('notlar')
        .select('puan, tarih, baslik, odev_id, odevler (donem, baslik)')
        .eq('ogrenci_id', ogrenciId)
        .not('odev_id', 'is', null)

      if (!notlar || notlar.length === 0) {
        setVeri([])
        setDetay([])
        setYukleniyor(false)
        return
      }

      const donemGruplu: Record<string, number[]> = {}
      notlar.forEach((n: any) => {
        const donem = n.odevler?.donem || 'Bilinmiyor'
        if (!donemGruplu[donem]) donemGruplu[donem] = []
        donemGruplu[donem].push(n.puan)
      })

      const donemSirala = (a: string, b: string) => {
        const ay = parseInt(a.match(/\d{4}/)?.[0] || '0')
        const by = parseInt(b.match(/\d{4}/)?.[0] || '0')
        return ay - by
      }

      const grafikVeri = Object.keys(donemGruplu)
        .sort(donemSirala)
        .map((donem) => ({
          donem,
          ortalama: Number((donemGruplu[donem].reduce((s, p) => s + p, 0) / donemGruplu[donem].length).toFixed(2)),
          odevSayisi: donemGruplu[donem].length,
        }))

      setVeri(grafikVeri)
      setDetay(
        notlar
          .map((n: any) => ({
            baslik: n.odevler?.baslik || n.baslik,
            donem: n.odevler?.donem || 'Bilinmiyor',
            puan: n.puan,
            tarih: n.tarih,
          }))
          .sort((a: any, b: any) => (a.tarih < b.tarih ? 1 : -1))
      )
      setYukleniyor(false)
    }
    yukle()
  }, [ogrenciId])

  if (yukleniyor) return null
  if (veri.length === 0) return null

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-medium text-sm text-foreground">Gelişim Grafiğim — Ödev Puanları</h2>
        <p className="text-xs text-muted-foreground mt-1">Dönemlere göre ödev puan ortalaman</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={veri}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="donem" fontSize={11} />
            <YAxis domain={[0, 100]} fontSize={11} />
            <Tooltip
              formatter={(deger: any, isim: any) => (isim === 'ortalama' ? [`${deger}`, 'Ortalama Puan'] : [deger, isim])}
            />
            <Line type="monotone" dataKey="ortalama" stroke="#344e41" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="border-t border-border divide-y divide-border">
        {detay.map((d, i) => (
          <div key={i} className="px-5 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">{d.baslik}</p>
              <p className="text-xs text-muted-foreground">{d.donem}</p>
            </div>
            <span className="text-sm font-medium text-foreground">{d.puan}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function OgrenciBuHaftaOzet({ ogrenciId, dersler, supabase }: { ogrenciId: string, dersler: any[], supabase: any }) {
  const [yaklasanOdevler, setYaklasanOdevler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    async function yukle() {
      if (!ogrenciId || dersler.length === 0) { setYukleniyor(false); return }
      const dersIds = dersler.map((d: any) => d.id)
      const bugun = new Date()
      const yediGunSonra = new Date(bugun.getTime() + 7 * 24 * 60 * 60 * 1000)

      const { data: odevData } = await supabase
        .from('odevler')
        .select('id, baslik, son_teslim_tarihi, ders_id')
        .in('ders_id', dersIds)
        .not('son_teslim_tarihi', 'is', null)
        .gte('son_teslim_tarihi', bugun.toISOString().slice(0, 10))
        .lte('son_teslim_tarihi', yediGunSonra.toISOString().slice(0, 10))

      if (!odevData || odevData.length === 0) { setYaklasanOdevler([]); setYukleniyor(false); return }

      const odevIds = odevData.map((o: any) => o.id)
      const { data: teslimData } = await supabase
        .from('odev_teslimleri')
        .select('odev_id')
        .eq('ogrenci_id', ogrenciId)
        .in('odev_id', odevIds)

      const teslimEdilenIds = new Set((teslimData || []).map((t: any) => t.odev_id))
      const bekleyenler = odevData.filter((o: any) => !teslimEdilenIds.has(o.id))
      setYaklasanOdevler(bekleyenler)
      setYukleniyor(false)
    }
    yukle()
  }, [ogrenciId, dersler])

  const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
  const bugunGunAdi = gunler[new Date().getDay()]
  const yarinGunAdi = gunler[(new Date().getDay() + 1) % 7]
  const bugunDersleri = dersler.filter((d: any) => d.gun === bugunGunAdi)
  const yarinDersleri = dersler.filter((d: any) => d.gun === yarinGunAdi)

  if (yukleniyor) return null
  if (bugunDersleri.length === 0 && yarinDersleri.length === 0 && yaklasanOdevler.length === 0) return null

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Sparkles className="size-4 text-muted-foreground" />
        <h2 className="font-medium text-sm text-foreground">Bu Hafta Ne Var?</h2>
      </div>
      <div className="px-5 py-4 space-y-3">
        {bugunDersleri.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Bugün</p>
            {bugunDersleri.map((d: any) => (
              <p key={d.id} className="text-sm text-foreground">{d.ad} — {d.saat}</p>
            ))}
          </div>
        )}
        {yarinDersleri.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Yarın</p>
            {yarinDersleri.map((d: any) => (
              <p key={d.id} className="text-sm text-foreground">{d.ad} — {d.saat}</p>
            ))}
          </div>
        )}
        {yaklasanOdevler.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Yaklaşan Ödev Teslimi</p>
            {yaklasanOdevler.map((o: any) => (
              <p key={o.id} className="text-sm text-foreground">
                {o.baslik} — {new Date(o.son_teslim_tarihi).toLocaleDateString('tr-TR')}
              </p>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function OgrenciKatilimYildonumu({ ogrenci }: { ogrenci: any }) {
  if (!ogrenci?.created_at) return null

  const kayitTarihi = new Date(ogrenci.created_at)
  const bugun = new Date()
  const yilFarki = bugun.getFullYear() - kayitTarihi.getFullYear()
  if (yilFarki < 1) return null

  const buYilkiYildonumu = new Date(bugun.getFullYear(), kayitTarihi.getMonth(), kayitTarihi.getDate())
  const farkGun = Math.abs((bugun.getTime() - buYilkiYildonumu.getTime()) / (1000 * 60 * 60 * 24))
  if (farkGun > 3) return null

  return (
    <Card className="p-0 overflow-hidden bg-primary/5 border-primary/20">
      <div className="px-5 py-4 flex items-center gap-2">
        <span className="text-lg">🎉</span>
        <p className="text-sm text-foreground">
          Aramıza katılalı <span className="font-semibold">{yilFarki} yıl</span> oldu!
        </p>
      </div>
    </Card>
  )
}

function OgrenciDevamTrendMesaji({ dersler }: { dersler: any[] }) {
  const puanlar: Record<string, number> = { katildi: 100, gec: 0, izinli: 0, katilmadi: 0 }
  const tumYoklamalar = dersler.flatMap((d: any) => d.yoklamalar || [])
  if (tumYoklamalar.length === 0) return null

  const donemGruplu: Record<string, number[]> = {}
  tumYoklamalar.forEach((y: any) => {
    const donem = tarihtenDonem(y.tarih)
    if (!donemGruplu[donem]) donemGruplu[donem] = []
    donemGruplu[donem].push(puanlar[y.durum] ?? 0)
  })

  const donemler = Object.keys(donemGruplu).sort()
  if (donemler.length < 2) return null

  const oncekiDonem = donemler[donemler.length - 2]
  const guncelDonemKey = donemler[donemler.length - 1]
  const oncekiOrt = donemGruplu[oncekiDonem].reduce((s, p) => s + p, 0) / donemGruplu[oncekiDonem].length
  const guncelOrt = donemGruplu[guncelDonemKey].reduce((s, p) => s + p, 0) / donemGruplu[guncelDonemKey].length
  const fark = Number((guncelOrt - oncekiOrt).toFixed(2))

  if (fark === 0) return null

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-2.5">
        <TrendingUp className={`size-4 ${fark > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`} />
        <p className="text-sm text-foreground">
          {fark > 0
            ? <>Geçen döneme göre devam oranın <span className="font-semibold text-emerald-600">%{fark} arttı</span> 👏</>
            : <>Geçen döneme göre devam oranın %{Math.abs(fark)} azaldı, birlikte toparlayalım 💪</>
          }
        </p>
      </div>
    </Card>
  )
}

function SinifTopluluk({ dersler, supabase }: { dersler: any[], supabase: any }) {
  const [toplamTeslim, setToplamTeslim] = useState<number | null>(null)

  useEffect(() => {
    async function yukle() {
      if (dersler.length === 0) return
      const dersIds = dersler.map((d: any) => d.id)
      const { data: odevData } = await supabase.from('odevler').select('id').in('ders_id', dersIds)
      const odevIds = (odevData || []).map((o: any) => o.id)
      if (odevIds.length === 0) { setToplamTeslim(0); return }

      const { data: teslimData } = await supabase
        .from('odev_teslimleri')
        .select('teslim_tarihi')
        .in('odev_id', odevIds)

      const guncelDonem = guncelAkademikDonem()
      const buDonemTeslim = (teslimData || []).filter((t: any) => tarihtenDonem(t.teslim_tarihi) === guncelDonem)
      setToplamTeslim(buDonemTeslim.length)
    }
    yukle()
  }, [dersler])

  if (toplamTeslim === null || toplamTeslim === 0) return null

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-2.5">
        <Users className="size-4 text-muted-foreground" />
        <p className="text-sm text-foreground">
          Sınıfımız bu dönem toplam <span className="font-semibold">{toplamTeslim} ödev</span> teslim etti 🎉
        </p>
      </div>
    </Card>
  )
}
