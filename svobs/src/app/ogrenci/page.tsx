'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StudentReportView } from '@/components/student/student-report-view'
import { SorumlulukPaneli } from '@/app/ogrenci/sorumluluk'
import { BookOpen, CalendarCheck, FileText, Bell } from 'lucide-react'

export default function OgrenciPage() {
  const [kullanici, setKullanici] = useState<any>(null)
  const [ogrenci, setOgrenci] = useState<any>(null)
  const [sinif, setSinif] = useState<any>(null)
  const [program, setProgram] = useState<any>(null)
  const [duyurular, setDuyurular] = useState<any[]>([])
  const [dersler, setDersler] = useState<any[]>([])
  const [dersSorumluluklari, setDersSorumluluklari] = useState<any[]>([])
  const [genelOrtalama, setGenelOrtalama] = useState<number | null>(null)
  const [duyuruAcik, setDuyuruAcik] = useState(false)
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

      
      // Duyurular
      const sinifIdGuvenli = o.siniflar?.id || '00000000-0000-0000-0000-000000000000'
      const { data: duy } = await supabase
        .from('duyurular')
        .select('*, kullanicilar!duyurular_yayinlayan_id_fkey (ad, soyad)')
        .eq('program_id', o.siniflar?.programlar?.id)
        .or(`hedef_tipi.eq.tumu,hedef_sinif_id.eq.${sinifIdGuvenli},hedef_kullanici_id.eq.${user.id}`)
        .order('olusturulma_tarihi', { ascending: false })
      setDuyurular(duy || [])

      // Ders sorumluluklari
      const { data: ds } = await supabase
        .from('ders_sorumlulari')
        .select('*, dersler (ad)')
        .eq('ogrenci_id', o.id)
      setDersSorumluluklari(ds || [])

      // Dersler - siniftaki tüm dersler
      const { data: dersData } = await supabase
        .from('dersler')
        .select('*')
        .eq('sinif_id', o.siniflar?.id)
        .eq('aktif', true)
        .order('gun')

      // Her ders için sınav ve yoklama verileri
      const devamPuanlari: Record<string, number> = {
        katildi: 100, gec: 75, izinli: 50, katilmadi: 0
      }

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

        const sinavOrtalama = notlar && notlar.length > 0
          ? notlar.reduce((s: number, n: any) => s + n.puan, 0) / notlar.length
          : null

        const devamOrt = yoklamalar && yoklamalar.length > 0
          ? yoklamalar.reduce((s: number, y: any) => s + (devamPuanlari[y.durum] || 0), 0) / yoklamalar.length
          : null

        let dersPuani = null
        if (sinavOrtalama !== null && devamOrt !== null) {
          dersPuani = sinavOrtalama * 0.7 + devamOrt * 0.3
        } else if (sinavOrtalama !== null) {
          dersPuani = sinavOrtalama
        } else if (devamOrt !== null) {
          dersPuani = devamOrt
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
          sinavOrtalama,
          devamPuani: devamOrt,
          dersPuani,
        }
      }))

      setDersler(dersDetaylari)

      // Genel ortalama
      const puanliDersler = dersDetaylari.filter(d => d.dersPuani !== null)
      if (puanliDersler.length > 0) {
        const ort = puanliDersler.reduce((s, d) => s + d.dersPuani!, 0) / puanliDersler.length
        setGenelOrtalama(ort)
      }

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
      <div className="min-h-svh flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const gorunenDuyurular = duyuruAcik ? duyurular : duyurular.slice(0, 2)

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/sv-logo.png" alt="Siyer Vakfı" className="w-8 h-8 object-contain brightness-0" />
          <div>
            <p className="text-xs text-muted-foreground">{program?.ad}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{kullanici?.ad} {kullanici?.soyad}</p>
            <p className="text-xs text-muted-foreground">{sinif?.ad}</p>
          </div>
          <div className="flex gap-2">
            <a href="/sifre-degistir">
              <Button variant="outline" size="sm">Şifre</Button>
            </a>
            <Button variant="outline" size="sm" onClick={cikisYap}>Çıkış</Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Başlık */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Merhaba, {kullanici?.ad} {kullanici?.soyad}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {program?.ad} · Sınav notlarınızı, devam durumunuzu ve dönem ortalamanızı buradan görebilirsiniz.
          </p>
        </div>

        {/* Duyurular */}
        {duyurular.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Bell className="size-4 text-muted-foreground" />
              <h2 className="font-medium text-sm text-foreground">Duyurular</h2>
              {duyurular.length > 2 && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {duyurular.length} duyuru
                </Badge>
              )}
            </div>
            <div className="divide-y divide-border">
              {gorunenDuyurular.map((d) => (
                <div key={d.id} className="px-5 py-4">
                  <p className="font-medium text-sm text-foreground">{d.baslik}</p>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{d.icerik}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {d.kullanicilar?.ad} {d.kullanicilar?.soyad} — {new Date(d.olusturulma_tarihi).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              ))}
            </div>
            {duyurular.length > 2 && (
              <div className="px-5 py-3 border-t border-border">
                <button
                  onClick={() => setDuyuruAcik(!duyuruAcik)}
                  className="text-sm text-primary hover:underline"
                >
                  {duyuruAcik ? 'Daha az göster' : `${duyurular.length - 2} duyuru daha göster`}
                </button>
              </div>
            )}
          </Card>
        )}

        {/* Ders Programı */}
        <OgrenciDersProgrami sinifId={sinif?.id} supabase={supabase} />

        {/* Sorumlu Paneli */}
        {dersSorumluluklari.length > 0 && (
          <SorumlulukPaneli
            ogrenciId={ogrenci?.id}
            dersler={dersSorumluluklari}
            supabase={supabase}
          />
        )}

        {/* Ders Raporu */}
        <StudentReportView
          dersler={dersler}
          genelOrtalama={genelOrtalama}
          ogrenciNo={ogrenci?.numara}
        />

        {/* Hesabım */}
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
      </main>
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
  const periyotlar: Record<string, string> = {
    haftalik: 'Her hafta', '2haftada1': '2 haftada bir',
    '3haftada1': '3 haftada bir', ayda1: 'Ayda bir'
  }

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
          {/* Gün başlıkları */}
          {gunler.map(gun => (
            <div key={gun} className="px-2 py-2 border-b border-r border-border bg-muted/50 last:border-r-0">
              <p className="text-xs font-medium text-muted-foreground text-center">{gun.slice(0, 3)}</p>
            </div>
          ))}
          {/* Ders slotları */}
          {gunler.map(gun => {
            const gunDersleri = dersler.filter(d => d.gun === gun)
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