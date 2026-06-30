'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OgrenciPage() {
  const [kullanici, setKullanici] = useState<any>(null)
  const [ogrenci, setOgrenci] = useState<any>(null)
  const [sinif, setSinif] = useState<any>(null)
  const [program, setProgram] = useState<any>(null)
  const [aktifSekme, setAktifSekme] = useState('duyurular')
  const [dersSorumluluklari, setDersSorumluluklari] = useState<any[]>([])
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

      if (!k) { router.push('/giris'); return }

      if (k.rol === 'super_admin' || k.rol === 'program_admin') {
        router.push('/admin'); return
      }

      setKullanici(k)

      const { data: o } = await supabase
        .from('ogrenciler')
        .select('*, siniflar (*, programlar (*))')
        .eq('kullanici_id', user.id)
        .single()

      if (o) {
        setOgrenci(o)
        setSinif(o.siniflar)
        setProgram(o.siniflar?.programlar)
      }

      const { data: ds } = await supabase
        .from('ders_sorumlulari')
        .select('*, dersler (ad)')
        .eq('ogrenci_id', o?.id)

      setDersSorumluluklari(ds || [])
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

  const sekmeler = [
    { id: 'duyurular', ad: 'Duyurular' },
    { id: 'program', ad: 'Ders Programı' },
    { id: 'devam', ad: 'Devam Durumum' },
    { id: 'notlar', ad: 'Notlarım' },
    ...(dersSorumluluklari.length > 0 ? [{ id: 'sorumluluk', ad: '📋 Sorumlu Paneli' }] : [])
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-800">Siyer Vakfı</h1>
          <p className="text-xs text-gray-500">{program?.ad}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{kullanici?.ad} {kullanici?.soyad}</p>
            <p className="text-xs text-gray-400">{sinif?.ad}</p>
          </div>
          <button onClick={cikisYap} className="text-sm text-gray-500 hover:text-gray-700">Çıkış</button>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-6 flex gap-1 overflow-x-auto">
        {sekmeler.map((s) => (
          <button
            key={s.id}
            onClick={() => setAktifSekme(s.id)}
            className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition ${
              aktifSekme === s.id
                ? 'border-green-700 text-green-700 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s.ad}
          </button>
        ))}
      </div>

      <main className="p-6 max-w-3xl mx-auto">
        {aktifSekme === 'duyurular' && (
          <OgrenciDuyurular programId={program?.id} supabase={supabase} />
        )}
        {aktifSekme === 'program' && (
          <OgrenciDersProgrami sinifId={sinif?.id} supabase={supabase} />
        )}
        {aktifSekme === 'devam' && (
          <OgrenciDevam ogrenciId={ogrenci?.id} supabase={supabase} />
        )}
        {aktifSekme === 'notlar' && (
          <OgrenciNotlar ogrenciId={ogrenci?.id} supabase={supabase} />
        )}
        {aktifSekme === 'sorumluluk' && (
          <SorumlulukPaneli
            ogrenciId={ogrenci?.id}
            dersler={dersSorumluluklari}
            supabase={supabase}
          />
        )}
      </main>
    </div>
  )
}

// ===== DUYURULAR =====
function OgrenciDuyurular({ programId, supabase }: { programId: string, supabase: any }) {
  const [duyurular, setDuyurular] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    async function yukle() {
      if (!programId) return
      const { data } = await supabase
        .from('duyurular')
        .select('*, kullanicilar (ad, soyad)')
        .eq('program_id', programId)
        .order('olusturulma_tarihi', { ascending: false })
      setDuyurular(data || [])
      setYukleniyor(false)
    }
    yukle()
  }, [programId])

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div className="space-y-3">
      {duyurular.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">Henüz duyuru yok</div>
      ) : (
        duyurular.map((d) => (
          <div key={d.id} className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-medium text-gray-800 mb-1">{d.baslik}</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{d.icerik}</p>
            <p className="text-xs text-gray-400 mt-2">
              {d.kullanicilar?.ad} {d.kullanicilar?.soyad} — {new Date(d.olusturulma_tarihi).toLocaleDateString('tr-TR')}
            </p>
          </div>
        ))
      )}
    </div>
  )
}

// ===== DERS PROGRAMI =====
function OgrenciDersProgrami({ sinifId, supabase }: { sinifId: string, supabase: any }) {
  const [dersler, setDersler] = useState<any[]>([])
  const [iptaller, setIptaller] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    async function yukle() {
      if (!sinifId) return
      const { data } = await supabase
        .from('dersler')
        .select(`
          *,
          ogretmen_dersleri (
            kullanicilar (ad, soyad)
          )
        `)
        .eq('sinif_id', sinifId)
        .eq('aktif', true)
        .order('gun')
      setDersler(data || [])

      const dersIdleri = (data || []).map((d: any) => d.id)
      if (dersIdleri.length > 0) {
        const bugun = new Date()
        const haftaBasi = new Date(bugun)
        haftaBasi.setDate(bugun.getDate() - bugun.getDay() + 1)
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
    haftalik: 'Her hafta',
    '2haftada1': '2 haftada bir',
    '3haftada1': '3 haftada bir',
    ayda1: 'Ayda bir'
  }

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  const derslerGuneSiralı = gunler.map(gun => ({
    gun,
    dersler: dersler.filter(d => d.gun === gun)
  })).filter(g => g.dersler.length > 0)

  return (
    <div className="space-y-3">
      {derslerGuneSiralı.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">Henüz ders eklenmemiş</div>
      ) : (
        derslerGuneSiralı.map(({ gun, dersler }) => (
          <div key={gun} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
              <h3 className="font-medium text-gray-700 text-sm">{gun}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {dersler.map((d) => {
                const iptalVarMi = iptaller.find((i: any) => i.ders_id === d.id)
                return (
                  <div key={d.id} className={`px-4 py-3 flex items-center justify-between ${iptalVarMi ? 'opacity-50' : ''}`}>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">
                        {d.ad}
                        {iptalVarMi && (
                          <span className="ml-2 text-xs text-red-500 font-normal">İptal edildi</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {d.ogretmen_dersleri?.[0]?.kullanicilar
                          ? `${d.ogretmen_dersleri[0].kullanicilar.ad} ${d.ogretmen_dersleri[0].kullanicilar.soyad}`
                          : 'Hoca atanmadı'
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{d.saat}</p>
                      <p className="text-xs text-gray-400">{periyotlar[d.periyot] || d.periyot}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ===== DEVAM DURUMU =====
function OgrenciDevam({ ogrenciId, supabase }: { ogrenciId: string, supabase: any }) {
  const [devam, setDevam] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    async function yukle() {
      if (!ogrenciId) return
      const { data } = await supabase
        .from('yoklamalar')
        .select('*, dersler!inner (ad)')
        .eq('ogrenci_id', ogrenciId)
        .order('tarih', { ascending: false }) 
      setDevam(data || [])
      setYukleniyor(false)
    }
    yukle()
  }, [ogrenciId])

  const durumRenk: Record<string, string> = {
    katildi: 'bg-green-100 text-green-700',
    katilmadi: 'bg-red-100 text-red-700',
    gec: 'bg-yellow-100 text-yellow-700',
    izinli: 'bg-blue-100 text-blue-700',
  }

  const durumLabel: Record<string, string> = {
    katildi: 'Katıldı',
    katilmadi: 'Katılmadı',
    gec: 'Geç',
    izinli: 'İzinli',
  }

  const ozet = devam.reduce((acc, d) => {
    acc[d.durum] = (acc[d.durum] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div className="space-y-4">
      {/* Özet */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(durumLabel).map(([key, label]) => (
          <div key={key} className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{ozet[key] || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Devam Detayı</h2>
        </div>
        {devam.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Henüz yoklama girilmemiş</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {devam.map((d) => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{d.dersler?.ad}</p>
                  <p className="text-xs text-gray-400">{new Date(d.tarih).toLocaleDateString('tr-TR')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${durumRenk[d.durum]}`}>
                  {durumLabel[d.durum]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== NOTLARIM =====
function OgrenciNotlar({ ogrenciId, supabase }: { ogrenciId: string, supabase: any }) {
  const [notlar, setNotlar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    async function yukle() {
      if (!ogrenciId) return
      const { data } = await supabase
        .from('notlar')
        .select('*, dersler!inner (ad)')
        .eq('ogrenci_id', ogrenciId)
        .order('tarih', { ascending: false })
      setNotlar(data || [])
      setYukleniyor(false)
    }
    yukle()
  }, [ogrenciId])

  const dersBazliNotlar = notlar.reduce((acc: any, n: any) => {
    const key = n.dersler?.ad || 'Diğer'
    if (!acc[key]) acc[key] = []
    acc[key].push(n)
    return acc
  }, {})

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div className="space-y-3">
      {Object.keys(dersBazliNotlar).length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">Henüz not girilmemiş</div>
      ) : (
        Object.entries(dersBazliNotlar).map(([ders, dersNotlar]: any) => (
          <div key={ders} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
              <h3 className="font-medium text-gray-700 text-sm">{ders}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {dersNotlar.map((n: any) => (
                <div key={n.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{n.baslik}</p>
                    <p className="text-xs text-gray-400">{new Date(n.tarih).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{n.puan}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ===== SORUMLULUK PANELİ =====
function SorumlulukPaneli({ ogrenciId, dersler, supabase }: { ogrenciId: string, dersler: any[], supabase: any }) {
  const [secilenDers, setSecilenDers] = useState<any>(dersler[0])
  const [sinifOgrencileri, setSinifOgrencileri] = useState<any[]>([])
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0])
  const [yoklamalar, setYoklamalar] = useState<Record<string, string>>({})
  const [mevcutYoklamalar, setMevcutYoklamalar] = useState<any[]>([])
  const [kaydediyor, setKaydediyor] = useState(false)

  useEffect(() => {
    async function yukle() {
      if (!secilenDers) return
      const { data: ders } = await supabase
        .from('dersler')
        .select('sinif_id')
        .eq('id', secilenDers.ders_id)
        .single()

      if (!ders) return

      const { data: ogrenciler } = await supabase
        .from('ogrenciler')
        .select('id, numara, kullanicilar (ad, soyad)')
        .eq('sinif_id', ders.sinif_id)
        .eq('aktif', true)
        .order('numara')
      setSinifOgrencileri(ogrenciler || [])
    }
    yukle()
  }, [secilenDers])

  useEffect(() => {
    async function yukle() {
      if (!secilenDers || !tarih) return
      const { data } = await supabase
        .from('yoklamalar')
        .select('*')
        .eq('ders_id', secilenDers.ders_id)
        .eq('tarih', tarih)
      setMevcutYoklamalar(data || [])
      const map: Record<string, string> = {}
      ;(data || []).forEach((y: any) => { map[y.ogrenci_id] = y.durum })
      setYoklamalar(map)
    }
    yukle()
  }, [secilenDers, tarih])

  async function kaydet() {
    setKaydediyor(true)
    for (const o of sinifOgrencileri) {
      const durum = yoklamalar[o.id]
      if (!durum) continue
      const mevcut = mevcutYoklamalar.find(y => y.ogrenci_id === o.id)
      if (mevcut) {
        alert('Kaydedilmiş yoklamayı sadece admin değiştirebilir!')
        continue
      }
      await supabase.from('yoklamalar').insert({
        ogrenci_id: o.id,
        ders_id: secilenDers.ders_id,
        tarih,
        durum
      })
    }
    setKaydediyor(false)
    alert('Yoklama kaydedildi!')
  }

  const durumlar = [
    { value: 'katildi', label: 'Katıldı', renk: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'katilmadi', label: 'Katılmadı', renk: 'bg-red-100 text-red-700 border-red-300' },
    { value: 'gec', label: 'Geç', renk: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'izinli', label: 'İzinli', renk: 'bg-blue-100 text-blue-700 border-blue-300' },
  ]

  return (
    <div className="space-y-4">
      {dersler.length > 1 && (
        <div className="flex gap-2">
          {dersler.map((d) => (
            <button
              key={d.ders_id}
              onClick={() => setSecilenDers(d)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                secilenDers?.ders_id === d.ders_id
                  ? 'bg-green-700 text-white'
                  : 'border border-gray-300 text-gray-600'
              }`}
            >
              {d.dersler?.ad}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">{secilenDers?.dersler?.ad} — Yoklama</h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <button
              onClick={kaydet}
              disabled={kaydediyor}
              className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50"
            >
              {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {sinifOgrencileri.map((o) => (
            <div key={o.id} className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800">
                #{o.numara} {o.kullanicilar?.ad} {o.kullanicilar?.soyad}
              </span>
              <div className="flex gap-1">
                {durumlar.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => {
                      const mevcut = mevcutYoklamalar.find(y => y.ogrenci_id === o.id)
                      if (mevcut) {
                        alert('Bu yoklama zaten kaydedilmiş. Sadece admin değiştirebilir.')
                        return
                      }
                      setYoklamalar(prev => ({ ...prev, [o.id]: d.value }))
                    }}
                    className={`text-xs px-2 py-1 rounded-lg border transition ${
                      yoklamalar[o.id] === d.value
                        ? d.renk + ' font-medium'
                        : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}