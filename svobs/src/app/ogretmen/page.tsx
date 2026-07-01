'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
          .select('id, ad, sinif_id, siniflar (id, ad, program_id)')
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

  const sekmeler = [
    { id: 'yoklama', ad: 'Yoklama' },
    { id: 'notlar', ad: 'Notlar' },
    { id: 'duyurular', ad: 'Duyurular' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-800">Siyer Vakfı</h1>
          <p className="text-xs text-gray-500">Öğretmen Paneli</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{kullanici?.ad} {kullanici?.soyad}</span>
          <a href="/sifre-degistir" className="text-sm text-gray-500 hover:text-gray-700">Şifre Değiştir</a>
          <button onClick={cikisYap} className="text-sm text-gray-500 hover:text-gray-700">Çıkış</button>
        </div>
      </header>

      {/* Ders Seçici */}
      {dersler.length > 1 && (
        <div className="bg-white border-b border-gray-200 px-6 py-2 flex gap-2">
          {dersler.map((d) => (
            <button
              key={d.ders_id}
              onClick={() => setSecilenDers(d)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                secilenDers?.ders_id === d.ders_id
                  ? 'bg-green-700 text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d.dersler?.ad} — {d.dersler?.siniflar?.ad}
            </button>
          ))}
        </div>
      )}

      {dersler.length === 0 ? (
        <div className="p-8 text-center text-gray-400">Henüz size atanmış ders yok</div>
      ) : (
        <>
          <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
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

            {aktifSekme === 'duyurular' && secilenDers && (
              <OgretmenDuyurular
                dersId={secilenDers.ders_id}
                sinifId={secilenDers.dersler?.siniflar?.id}
                supabase={supabase}
                kullanici={kullanici}
              />
            )}
          
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
          .select('id, ad, soyad')
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
    alert('Yoklama kaydedildi!')
  }

  const durumlar = [
    { value: 'katildi', label: 'Katıldı', renk: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'katilmadi', label: 'Katılmadı', renk: 'bg-red-100 text-red-700 border-red-300' },
    { value: 'gec', label: 'Geç', renk: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'izinli', label: 'İzinli', renk: 'bg-blue-100 text-blue-700 border-blue-300' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Yoklama</h2>
        <div className="flex items-center gap-3">
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          <button onClick={kaydet} disabled={kaydediyor}
            className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">
            {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {ogrenciler.map((o) => (
          <div key={o.id} className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-800">
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
    </div>
  )
}

// ===== NOTLAR =====
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
    if (!sinavForm.baslik || !sinavForm.tarih) { alert('Başlık ve tarih zorunlu!'); return }
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
    alert('Sınav eklendi ve duyuru yapıldı!')
  }

  async function notKaydet() {
    if (!secilenSinav) { alert('Önce bir sınav seç!'); return }
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
    alert('Notlar kaydedildi!')
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: 'sinavlar', ad: 'Sınavlar' },
          { id: 'not_giris', ad: 'Not Girişi' },
          { id: 'gecmis', ad: 'Geçmiş Notlar' },
        ].map(s => (
          <button key={s.id} onClick={() => setSekme(s.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${sekme === s.id ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}>
            {s.ad}
          </button>
        ))}
      </div>

      {sekme === 'sinavlar' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Sınavlar</h2>
            <button onClick={() => setSinavModalAcik(true)}
              className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800">
              + Sınav Ekle
            </button>
          </div>
          {sinavlar.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Henüz sınav eklenmemiş</div>
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
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3">Not Girişi</h2>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Sınav Seç</label>
                <select value={secilenSinav?.id || ''} onChange={(e) => setSecilenSinav(sinavlar.find(s => s.id === e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                  <option value="">Sınav seç...</option>
                  {sinavlar.map(s => <option key={s.id} value={s.id}>{s.baslik} — {new Date(s.tarih).toLocaleDateString('tr-TR')}</option>)}
                </select>
              </div>
              <button onClick={notKaydet} disabled={kaydediyor || !secilenSinav}
                className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50 mt-4">
                {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {ogrenciler.map((o) => (
              <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">
                  #{o.numara} {o.kullanicilar?.ad} {o.kullanicilar?.soyad}
                </span>
                <input type="number" min="0" max="100"
                  value={notlar[o.id] || ''}
                  onChange={(e) => setNotlar(prev => ({ ...prev, [o.id]: e.target.value }))}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="—" />
              </div>
            ))}
          </div>
        </div>
      )}

      {sekme === 'gecmis' && (
        <div className="space-y-3">
          {gecmisNotlar.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400">Henüz not girilmemiş</div>
          ) : (
            (() => {
              const gruplu = gecmisNotlar.reduce((acc: any, n: any) => {
                const key = n.sinav_id || n.baslik
                if (!acc[key]) acc[key] = { baslik: n.baslik, tarih: n.tarih, notlar: [] }
                acc[key].notlar.push(n)
                return acc
              }, {})
              return Object.values(gruplu).map((grup: any) => (
                <div key={grup.baslik + grup.tarih} className="bg-white rounded-xl shadow-sm">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-medium text-gray-800">{grup.baslik}</h3>
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
            })()
          )}
        </div>
      )}

      {sinavModalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">Sınav Ekle</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Başlık</label>
                <input value={sinavForm.baslik} onChange={(e) => setSinavForm({...sinavForm, baslik: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="örn: 1. Dönem Sınavı" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Tarih</label>
                  <input type="date" value={sinavForm.tarih} onChange={(e) => setSinavForm({...sinavForm, tarih: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Saat</label>
                  <input type="time" value={sinavForm.saat} onChange={(e) => setSinavForm({...sinavForm, saat: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Konum</label>
                <input value={sinavForm.konum} onChange={(e) => setSinavForm({...sinavForm, konum: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="örn: Dershane, Online..." />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Açıklama (isteğe bağlı)</label>
                <textarea value={sinavForm.aciklama} onChange={(e) => setSinavForm({...sinavForm, aciklama: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                  placeholder="Sınav hakkında ek bilgi..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setSinavModalAcik(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                İptal
              </button>
              <button onClick={sinavEkle} disabled={kaydediyor}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">
                {kaydediyor ? 'Ekleniyor...' : 'Ekle ve Duyur'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    if (!form.baslik.trim() || !form.icerik.trim()) { alert('Başlık ve içerik zorunlu!'); return }
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
    <div>
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Duyurular</h2>
          <button onClick={() => setModalAcik(true)}
            className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800">
            + Duyuru Ekle
          </button>
        </div>
        {duyurular.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Henüz duyuru yok</div>
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

      {modalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">Yeni Duyuru</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Başlık</label>
                <input value={form.baslik} onChange={(e) => setForm({...form, baslik: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="Duyuru başlığı..." />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">İçerik</label>
                <textarea value={form.icerik} onChange={(e) => setForm({...form, icerik: e.target.value})}
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                  placeholder="Duyuru içeriği..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalAcik(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                İptal
              </button>
              <button onClick={duyuruEkle} disabled={kaydediyor}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">
                {kaydediyor ? 'Yayınlanıyor...' : 'Yayınla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}