'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [kullanici, setKullanici] = useState<any>(null)
  const [programlar, setProgramlar] = useState<any[]>([])
  const [aktifProgram, setAktifProgram] = useState<any>(null)
  const [aktifSekme, setAktifSekme] = useState('ogrenciler')
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

      if (!k || !['super_admin', 'program_admin'].includes(k.rol)) {
        router.push('/giris'); return
      }

      setKullanici(k)

      const { data: p } = await supabase
        .from('programlar')
        .select('*')
        .order('ad')

      if (p && p.length > 0) {
        setProgramlar(p)
        setAktifProgram(p[0])
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Yükleniyor...</p>
      </div>
    )
  }

  const sekmeler = [
    { id: 'ogrenciler', ad: 'Öğrenciler' },
    { id: 'siniflar', ad: 'Sınıflar' },
    { id: 'dersler', ad: 'Dersler' },
    { id: 'yoklama', ad: 'Devam' },
    { id: 'notlar', ad: 'Notlar' },
    { id: 'duyurular', ad: 'Duyurular' },
    { id: 'hocalar', ad: 'Hocalar' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-800">Siyer Vakfı</h1>
          <p className="text-xs text-gray-500">Öğrenci Bilgi Sistemi</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{kullanici?.ad} {kullanici?.soyad}</span>
          <button onClick={cikisYap} className="text-sm text-gray-500 hover:text-gray-700">Çıkış</button>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-6 py-2 flex gap-2">
        {programlar.map((p) => (
          <button
            key={p.id}
            onClick={() => setAktifProgram(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              aktifProgram?.id === p.id
                ? 'bg-green-700 text-white'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.ad}
          </button>
        ))}
      </div>

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

      <main className="p-6">
        {aktifSekme === 'ogrenciler' && (
          <OgrencilerSekme programId={aktifProgram?.id} supabase={supabase} />
        )}
        {aktifSekme === 'siniflar' && (
          <SiniflarSekme programId={aktifProgram?.id} supabase={supabase} />
        )}
        {aktifSekme === 'dersler' && (
          <DerslerSekme programId={aktifProgram?.id} supabase={supabase} />
        )}
        {aktifSekme === 'yoklama' && (
          <YoklamaSekmesi programId={aktifProgram?.id} supabase={supabase} kullanici={kullanici} />
        )}
        {aktifSekme === 'notlar' && (
          <NotlarSekmesi programId={aktifProgram?.id} supabase={supabase} />
        )}
        {aktifSekme === 'duyurular' && (
          <div className="bg-white rounded-xl p-6 text-gray-500">Duyurular yakında...</div>
        )}
        {aktifSekme === 'hocalar' && (
          <HocalarSekme programId={aktifProgram?.id} supabase={supabase} />
        )} 
      </main>
    </div>
  )
}

// ===== SINIFLAR =====
function SiniflarSekme({ programId, supabase }: { programId: string, supabase: any }) {
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [yeniAd, setYeniAd] = useState('')
  const [yeniDonem, setYeniDonem] = useState('')
  const [kaydediyor, setKaydediyor] = useState(false)

  async function yukle() {
    if (!programId) return
    const { data } = await supabase
      .from('siniflar')
      .select('*')
      .eq('program_id', programId)
      .order('ad')
    setSiniflar(data || [])
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [programId])

  async function sinifEkle() {
    if (!yeniAd.trim()) return
    setKaydediyor(true)
    await supabase.from('siniflar').insert({
      program_id: programId,
      ad: yeniAd.trim(),
      donem: yeniDonem.trim() || '2024-2025'
    })
    setYeniAd('')
    setYeniDonem('')
    setModalAcik(false)
    setKaydediyor(false)
    yukle()
  }

  async function sinifSil(id: string) {
    if (!confirm('Bu sınıfı silmek istediğine emin misin?')) return
    await supabase.from('siniflar').delete().eq('id', id)
    yukle()
  }

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Sınıflar</h2>
          <button
            onClick={() => setModalAcik(true)}
            className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800"
          >
            + Sınıf Ekle
          </button>
        </div>

        {siniflar.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Henüz sınıf eklenmemiş
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs text-gray-500">Sınıf Adı</th>
                <th className="px-4 py-3 text-xs text-gray-500">Dönem</th>
                <th className="px-4 py-3 text-xs text-gray-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {siniflar.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.ad}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.donem}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => sinifSil(s.id)}
                      className="text-red-500 text-xs hover:text-red-700"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">Yeni Sınıf Ekle</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Sınıf Adı</label>
                <input
                  value={yeniAd}
                  onChange={(e) => setYeniAd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="örn: Grup A, İleri Seviye..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Dönem</label>
                <input
                  value={yeniDonem}
                  onChange={(e) => setYeniDonem(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="örn: 2024-2025"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setModalAcik(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={sinifEkle}
                disabled={kaydediyor}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50"
              >
                {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== ÖĞRENCİLER =====
function OgrencilerSekme({ programId, supabase }: { programId: string, supabase: any }) {
  const [ogrenciler, setOgrenciler] = useState<any[]>([])
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [form, setForm] = useState({
    ad: '', soyad: '', email: '', telefon: '', sinif_id: '', sifre: ''
  })

  async function yukle() {
    if (!programId) return

    const { data: s } = await supabase
      .from('siniflar')
      .select('*')
      .eq('program_id', programId)
      .order('ad')
    setSiniflar(s || [])

    const sinifIdleri = (s || []).map((sinif: any) => sinif.id)

    const { data: o } = sinifIdleri.length > 0
      ? await supabase
          .from('ogrenciler')
          .select(`
            id, numara, aktif,
            kullanicilar (ad, soyad, email, telefon),
            siniflar (ad)
          `)
          .in('sinif_id', sinifIdleri)
          .order('numara')
      : { data: [] }

    setOgrenciler(o || [])
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [programId])

 async function ogrenciEkle() {
  if (!form.ad || !form.email || !form.sinif_id || !form.sifre) {
    alert('Ad, email, sınıf ve şifre zorunlu!')
    return
  }
  setKaydediyor(true)

  const sonNumara = ogrenciler.length > 0
    ? Math.max(...ogrenciler.map(o => o.numara)) + 1
    : 1

  const res = await fetch('/api/admin/kullanici-olustur', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: form.email,
      password: form.sifre,
      ad: form.ad,
      soyad: form.soyad,
      telefon: form.telefon,
      sinif_id: form.sinif_id
    })
  })

  const json = await res.json()

  if (!res.ok || !json.user) {
    alert('Kullanıcı oluşturulamadı: ' + (json.error || 'Hata'))
    setKaydediyor(false)
    return
  }

  const userId = json.user.id

  const { error: ogrenciError } = await supabase.from('ogrenciler').insert({
    kullanici_id: userId,
    sinif_id: form.sinif_id,
    numara: sonNumara,
    aktif: true
  })

  if (ogrenciError) {
    alert('Öğrenci kaydı hatası: ' + ogrenciError.message)
    setKaydediyor(false)
    return
  }

  setForm({ ad: '', soyad: '', email: '', telefon: '', sinif_id: '', sifre: '' })
  setModalAcik(false)
  setKaydediyor(false)
  yukle()
}

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Öğrenciler</h2>
          <button
            onClick={() => setModalAcik(true)}
            className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800"
          >
            + Öğrenci Ekle
          </button>
        </div>

        {ogrenciler.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Henüz öğrenci eklenmemiş
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs text-gray-500">#</th>
                <th className="px-4 py-3 text-xs text-gray-500">Ad Soyad</th>
                <th className="px-4 py-3 text-xs text-gray-500">Email</th>
                <th className="px-4 py-3 text-xs text-gray-500">Telefon</th>
                <th className="px-4 py-3 text-xs text-gray-500">Sınıf</th>
                <th className="px-4 py-3 text-xs text-gray-500">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ogrenciler.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">#{o.numara}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {o.kullanicilar?.ad} {o.kullanicilar?.soyad}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{o.kullanicilar?.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{o.kullanicilar?.telefon || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{o.siniflar?.ad || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      o.aktif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {o.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">Yeni Öğrenci Ekle</h3>
            {siniflar.length === 0 ? (
              <p className="text-amber-600 text-sm">Önce bir sınıf oluşturman lazım!</p>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Ad</label>
                    <input value={form.ad} onChange={(e) => setForm({...form, ad: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                      placeholder="Ad" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Soyad</label>
                    <input value={form.soyad} onChange={(e) => setForm({...form, soyad: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                      placeholder="Soyad" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="ornek@mail.com" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Telefon</label>
                  <input value={form.telefon} onChange={(e) => setForm({...form, telefon: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="05xx xxx xx xx" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Sınıf</label>
                  <select value={form.sinif_id} onChange={(e) => setForm({...form, sinif_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                    <option value="">Sınıf seç...</option>
                    {siniflar.map((s) => (
                      <option key={s.id} value={s.id}>{s.ad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Geçici Şifre</label>
                  <input type="password" value={form.sifre} onChange={(e) => setForm({...form, sifre: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="En az 6 karakter" />
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalAcik(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                İptal
              </button>
              {siniflar.length > 0 && (
                <button onClick={ogrenciEkle} disabled={kaydediyor}
                  className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">
                  {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== DERSLER =====
function DerslerSekme({ programId, supabase }: { programId: string, supabase: any }) {
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [secilenSinif, setSecilenSinif] = useState<any>(null)
  const [dersler, setDersler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [form, setForm] = useState({
    ad: '', aciklama: '', gun: '', saat: '', periyot: 'haftalik'
  })

  async function siniflarıYukle() {
    if (!programId) return
    const { data } = await supabase
      .from('siniflar')
      .select('*')
      .eq('program_id', programId)
      .order('ad')
    setSiniflar(data || [])
    if (data && data.length > 0) setSecilenSinif(data[0])
    setYukleniyor(false)
  }

  async function dersleriYukle(sinifId: string) {
    const { data } = await supabase
      .from('dersler')
      .select(`
        *,
        ogretmen_dersleri (
          kullanicilar (ad, soyad)
        )
      `)
      .eq('sinif_id', sinifId)
      .order('gun')
    setDersler(data || [])
  }

  useEffect(() => { siniflarıYukle() }, [programId])
  useEffect(() => { if (secilenSinif) dersleriYukle(secilenSinif.id) }, [secilenSinif])

  async function dersEkle() {
    if (!form.ad || !form.gun || !form.saat) {
      alert('Ders adı, gün ve saat zorunlu!')
      return
    }
    setKaydediyor(true)
    await supabase.from('dersler').insert({
      sinif_id: secilenSinif.id,
      ad: form.ad,
      aciklama: form.aciklama,
      gun: form.gun,
      saat: form.saat,
      periyot: form.periyot,
      aktif: true
    })
    setForm({ ad: '', aciklama: '', gun: '', saat: '', periyot: 'haftalik' })
    setModalAcik(false)
    setKaydediyor(false)
    dersleriYukle(secilenSinif.id)
  }

  async function dersSil(id: string) {
    if (!confirm('Bu dersi silmek istediğine emin misin?')) return
    await supabase.from('dersler').delete().eq('id', id)
    dersleriYukle(secilenSinif.id)
  }

  const gunler = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
  const periyotlar = [
    { value: 'haftalik', label: 'Her hafta' },
    { value: '2haftada1', label: '2 haftada bir' },
    { value: '3haftada1', label: '3 haftada bir' },
    { value: 'ayda1', label: 'Ayda bir' },
  ]

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div>
      {/* Sınıf Seçici */}
      {siniflar.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-amber-600">
          Önce Sınıflar sekmesinden bir sınıf oluştur!
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            {siniflar.map((s) => (
              <button
                key={s.id}
                onClick={() => setSecilenSinif(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  secilenSinif?.id === s.id
                    ? 'bg-gray-800 text-white'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.ad}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                {secilenSinif?.ad} — Dersler
              </h2>
              <button
                onClick={() => setModalAcik(true)}
                className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800"
              >
                + Ders Ekle
              </button>
            </div>

            {dersler.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                Bu sınıfa henüz ders eklenmemiş
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-xs text-gray-500">Ders Adı</th>
                    <th className="px-4 py-3 text-xs text-gray-500">Gün</th>
                    <th className="px-4 py-3 text-xs text-gray-500">Saat</th>
                    <th className="px-4 py-3 text-xs text-gray-500">Periyot</th>
                    <th className="px-4 py-3 text-xs text-gray-500">Hoca</th>
                    <th className="px-4 py-3 text-xs text-gray-500">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dersler.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{d.ad}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{d.gun}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{d.saat}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {periyotlar.find(p => p.value === d.periyot)?.label || d.periyot}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {d.ogretmen_dersleri?.[0]?.kullanicilar
                          ? `${d.ogretmen_dersleri[0].kullanicilar.ad} ${d.ogretmen_dersleri[0].kullanicilar.soyad}`
                          : <span className="text-amber-500">Atanmadı</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => dersSil(d.id)}
                          className="text-red-500 text-xs hover:text-red-700"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {modalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">Yeni Ders Ekle</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Ders Adı</label>
                <input value={form.ad} onChange={(e) => setForm({...form, ad: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="örn: Kitap Müzakeresi" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Açıklama (isteğe bağlı)</label>
                <input value={form.aciklama} onChange={(e) => setForm({...form, aciklama: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="Kısa açıklama..." />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Gün</label>
                  <select value={form.gun} onChange={(e) => setForm({...form, gun: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                    <option value="">Seç...</option>
                    {gunler.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Saat</label>
                  <input type="time" value={form.saat} onChange={(e) => setForm({...form, saat: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Periyot</label>
                <select value={form.periyot} onChange={(e) => setForm({...form, periyot: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                  {periyotlar.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalAcik(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                İptal
              </button>
              <button onClick={dersEkle} disabled={kaydediyor}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">
                {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// ===== HOCALAR =====
function HocalarSekme({ programId, supabase }: { programId: string, supabase: any }) {
  const [hocalar, setHocalar] = useState<any[]>([])
  const [dersler, setDersler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [dersModalAcik, setDersModalAcik] = useState(false)
  const [secilenHoca, setSecilenHoca] = useState<any>(null)
  const [secilenDers, setSecilenDers] = useState('')
  const [kaydediyor, setKaydediyor] = useState(false)
  const [form, setForm] = useState({
    ad: '', soyad: '', email: '', telefon: '', sifre: ''
  })

  async function yukle() {
    if (!programId) return

    const { data: h } = await supabase
      .from('kullanicilar')
      .select(`
        *,
        ogretmen_dersleri (
          ders_id,
          dersler (ad, siniflar (ad, program_id))
        )
      `)
      .eq('rol', 'ogretmen')

    const { data: d } = await supabase
      .from('dersler')
      .select('*, siniflar (ad, program_id)')
      .eq('siniflar.program_id', programId)

    setHocalar(h || [])
    setDersler(d || [])
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [programId])

  async function hocaEkle() {
    if (!form.ad || !form.email || !form.sifre) {
      alert('Ad, email ve şifre zorunlu!')
      return
    }
    setKaydediyor(true)

    const res = await fetch('/api/admin/kullanici-olustur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.sifre,
        ad: form.ad,
        soyad: form.soyad,
        telefon: form.telefon,
        rol: 'ogretmen'
      })
    })

    const json = await res.json()
    if (!res.ok || !json.user) {
      alert('Hoca eklenemedi: ' + (json.error || 'Hata'))
      setKaydediyor(false)
      return
    }

    setForm({ ad: '', soyad: '', email: '', telefon: '', sifre: '' })
    setModalAcik(false)
    setKaydediyor(false)
    yukle()
  }

  async function dersAta() {
    if (!secilenDers || !secilenHoca) return
    setKaydediyor(true)
    await supabase.from('ogretmen_dersleri').upsert({
      ogretmen_id: secilenHoca.id,
      ders_id: secilenDers
    })
    setDersModalAcik(false)
    setSecilenDers('')
    setKaydediyor(false)
    yukle()
  }

  async function dersKaldir(ogretmenId: string, dersId: string) {
    if (!confirm('Bu dersi hocadan kaldırmak istediğine emin misin?')) return
    await supabase.from('ogretmen_dersleri')
      .delete()
      .eq('ogretmen_id', ogretmenId)
      .eq('ders_id', dersId)
    yukle()
  }

  async function hocaSil(id: string) {
    if (!confirm('Bu hocayı silmek istediğine emin misin?')) return
    await supabase.from('ogretmen_dersleri').delete().eq('ogretmen_id', id)
    await supabase.from('kullanicilar').delete().eq('id', id)
    yukle()
  }

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Hocalar</h2>
          <button
            onClick={() => setModalAcik(true)}
            className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800"
          >
            + Hoca Ekle
          </button>
        </div>

        {hocalar.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Henüz hoca eklenmemiş</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {hocalar.map((h) => (
              <div key={h.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-800">{h.ad} {h.soyad}</p>
                    <p className="text-sm text-gray-500">{h.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSecilenHoca(h); setDersModalAcik(true) }}
                      className="text-sm text-green-700 border border-green-700 px-3 py-1 rounded-lg hover:bg-green-50"
                    >
                      + Ders Ata
                    </button>
                    <button
                      onClick={() => hocaSil(h.id)}
                      className="text-sm text-red-500 border border-red-300 px-3 py-1 rounded-lg hover:bg-red-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
                {h.ogretmen_dersleri?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {h.ogretmen_dersleri.map((od: any) => (
                      <span key={od.ders_id} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                        {od.dersler?.ad} — {od.dersler?.siniflar?.ad}
                        <button
                          onClick={() => dersKaldir(h.id, od.ders_id)}
                          className="text-red-400 hover:text-red-600 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hoca Ekle Modal */}
      {modalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">Yeni Hoca Ekle</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Ad</label>
                  <input value={form.ad} onChange={(e) => setForm({...form, ad: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="Ad" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Soyad</label>
                  <input value={form.soyad} onChange={(e) => setForm({...form, soyad: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="Soyad" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="ornek@mail.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Telefon</label>
                <input value={form.telefon} onChange={(e) => setForm({...form, telefon: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="05xx xxx xx xx" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Geçici Şifre</label>
                <input type="password" value={form.sifre} onChange={(e) => setForm({...form, sifre: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="En az 6 karakter" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalAcik(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                İptal
              </button>
              <button onClick={hocaEkle} disabled={kaydediyor}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">
                {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ders Ata Modal */}
      {dersModalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-1">Ders Ata</h3>
            <p className="text-sm text-gray-500 mb-4">{secilenHoca?.ad} {secilenHoca?.soyad}</p>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Ders Seç</label>
              <select value={secilenDers} onChange={(e) => setSecilenDers(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                <option value="">Ders seç...</option>
                {dersler.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.ad} — {d.siniflar?.ad}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDersModalAcik(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                İptal
              </button>
              <button onClick={dersAta} disabled={kaydediyor || !secilenDers}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">
                {kaydediyor ? 'Atanıyor...' : 'Ata'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// ===== YOKLAMA =====
function YoklamaSekmesi({ programId, supabase, kullanici }: { programId: string, supabase: any, kullanici: any }) {
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [dersler, setDersler] = useState<any[]>([])
  const [ogrenciler, setOgrenciler] = useState<any[]>([])
  const [secilenSinif, setSecilenSinif] = useState<any>(null)
  const [secilenDers, setSecilenDers] = useState<any>(null)
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0])
  const [yoklamalar, setYoklamalar] = useState<Record<string, string>>({})
  const [mevcutYoklamalar, setMevcutYoklamalar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediyor, setKaydediyor] = useState(false)

  async function siniflarıYukle() {
    if (!programId) return
    const { data } = await supabase
      .from('siniflar')
      .select('*')
      .eq('program_id', programId)
      .order('ad')
    setSiniflar(data || [])
    if (data && data.length > 0) setSecilenSinif(data[0])
    setYukleniyor(false)
  }

  async function dersleriYukle(sinifId: string) {
    const { data } = await supabase
      .from('dersler')
      .select('*')
      .eq('sinif_id', sinifId)
      .eq('aktif', true)
      .order('gun')
    setDersler(data || [])
    setSecilenDers(data?.[0] || null)
  }

  async function ogrencileriYukle(sinifId: string) {
    const { data } = await supabase
      .from('ogrenciler')
      .select('id, numara, kullanicilar (ad, soyad)')
      .eq('sinif_id', sinifId)
      .eq('aktif', true)
      .order('numara')
    setOgrenciler(data || [])
  }

  async function mevcutYoklamalariYukle(dersId: string, tarih: string) {
    const { data } = await supabase
      .from('yoklamalar')
      .select('*')
      .eq('ders_id', dersId)
      .eq('tarih', tarih)
    setMevcutYoklamalar(data || [])

    const map: Record<string, string> = {}
    ;(data || []).forEach((y: any) => {
      map[y.ogrenci_id] = y.durum
    })
    setYoklamalar(map)
  }

  useEffect(() => { siniflarıYukle() }, [programId])
  useEffect(() => {
    if (secilenSinif) {
      dersleriYukle(secilenSinif.id)
      ogrencileriYukle(secilenSinif.id)
    }
  }, [secilenSinif])
  useEffect(() => {
    if (secilenDers && tarih) mevcutYoklamalariYukle(secilenDers.id, tarih)
  }, [secilenDers, tarih])

  function durumSec(ogrenciId: string, durum: string) {
    setYoklamalar(prev => ({ ...prev, [ogrenciId]: durum }))
  }

  async function kaydet() {
    if (!secilenDers) return
    setKaydediyor(true)

    const isAdmin = ['super_admin', 'program_admin'].includes(kullanici?.rol)

    for (const ogrenci of ogrenciler) {
      const durum = yoklamalar[ogrenci.id]
      if (!durum) continue

      const mevcutVar = mevcutYoklamalar.find(y => y.ogrenci_id === ogrenci.id)

      if (mevcutVar && !isAdmin) {
        alert(`${ogrenci.kullanicilar?.ad} için yoklama zaten girilmiş. Sadece admin değiştirebilir.`)
        continue
      }

      if (mevcutVar) {
        await supabase.from('yoklamalar')
          .update({ durum })
          .eq('id', mevcutVar.id)
      } else {
        await supabase.from('yoklamalar').insert({
          ogrenci_id: ogrenci.id,
          ders_id: secilenDers.id,
          tarih,
          durum
        })
      }
    }

    await mevcutYoklamalariYukle(secilenDers.id, tarih)
    setKaydediyor(false)
    alert('Yoklama kaydedildi!')
  }

  const durumlar = [
    { value: 'katildi', label: 'Katıldı', renk: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'katilmadi', label: 'Katılmadı', renk: 'bg-red-100 text-red-700 border-red-300' },
    { value: 'gec', label: 'Geç', renk: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'izinli', label: 'İzinli', renk: 'bg-blue-100 text-blue-700 border-blue-300' },
  ]

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sınıf</label>
          <select
            value={secilenSinif?.id || ''}
            onChange={(e) => {
              const s = siniflar.find(s => s.id === e.target.value)
              setSecilenSinif(s)
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            {siniflar.map(s => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ders</label>
          <select
            value={secilenDers?.id || ''}
            onChange={(e) => {
              const d = dersler.find(d => d.id === e.target.value)
              setSecilenDers(d)
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            {dersler.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tarih</label>
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
      </div>

      {/* Yoklama Listesi */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            {secilenDers?.ad || 'Ders seç'} — {tarih}
          </h2>
          <button
            onClick={kaydet}
            disabled={kaydediyor || ogrenciler.length === 0}
            className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50"
          >
            {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        {ogrenciler.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Bu sınıfta öğrenci yok</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {ogrenciler.map((o) => (
              <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    #{o.numara} {o.kullanicilar?.ad} {o.kullanicilar?.soyad}
                  </span>
                  {mevcutYoklamalar.find(y => y.ogrenci_id === o.id) && (
                    <span className="ml-2 text-xs text-gray-400">kaydedildi</span>
                  )}
                </div>
                <div className="flex gap-1">
                  {durumlar.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => durumSec(o.id, d.value)}
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
        )}
      </div>
    </div>
  )
}
// ===== NOTLAR =====
function NotlarSekmesi({ programId, supabase }: { programId: string, supabase: any }) {
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [dersler, setDersler] = useState<any[]>([])
  const [ogrenciler, setOgrenciler] = useState<any[]>([])
  const [secilenSinif, setSecilenSinif] = useState<any>(null)
  const [secilenDers, setSecilenDers] = useState<any>(null)
  const [notBasligi, setNotBasligi] = useState('')
  const [notTarihi, setNotTarihi] = useState(new Date().toISOString().split('T')[0])
  const [notlar, setNotlar] = useState<Record<string, string>>({})
  const [gecmisNotlar, setGecmisNotlar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [sekme, setSekme] = useState<'giris' | 'gecmis'>('giris')

  async function siniflarıYukle() {
    if (!programId) return
    const { data } = await supabase
      .from('siniflar')
      .select('*')
      .eq('program_id', programId)
      .order('ad')
    setSiniflar(data || [])
    if (data && data.length > 0) setSecilenSinif(data[0])
    setYukleniyor(false)
  }

  async function dersleriYukle(sinifId: string) {
    const { data } = await supabase
      .from('dersler')
      .select('*')
      .eq('sinif_id', sinifId)
      .order('ad')
    setDersler(data || [])
    setSecilenDers(data?.[0] || null)
  }

  async function ogrencileriYukle(sinifId: string) {
    const { data } = await supabase
      .from('ogrenciler')
      .select('id, numara, kullanicilar (ad, soyad)')
      .eq('sinif_id', sinifId)
      .eq('aktif', true)
      .order('numara')
    setOgrenciler(data || [])
    setNotlar({})
  }

  async function gecmisNotlariYukle(dersId: string) {
    const { data } = await supabase
      .from('notlar')
      .select('*, ogrenciler (numara, kullanicilar (ad, soyad))')
      .eq('ders_id', dersId)
      .order('tarih', { ascending: false })
    setGecmisNotlar(data || [])
  }

  useEffect(() => { siniflarıYukle() }, [programId])
  useEffect(() => {
    if (secilenSinif) {
      dersleriYukle(secilenSinif.id)
      ogrencileriYukle(secilenSinif.id)
    }
  }, [secilenSinif])
  useEffect(() => {
    if (secilenDers) gecmisNotlariYukle(secilenDers.id)
  }, [secilenDers])

  async function kaydet() {
    if (!secilenDers || !notBasligi.trim()) {
      alert('Ders ve not başlığı zorunlu!')
      return
    }
    setKaydediyor(true)

    for (const ogrenci of ogrenciler) {
      const puan = notlar[ogrenci.id]
      if (!puan && puan !== '0') continue

      await supabase.from('notlar').insert({
        ogrenci_id: ogrenci.id,
        ders_id: secilenDers.id,
        baslik: notBasligi.trim(),
        puan: parseFloat(puan),
        tarih: notTarihi
      })
    }

    setNotlar({})
    setNotBasligi('')
    setKaydediyor(false)
    gecmisNotlariYukle(secilenDers.id)
    alert('Notlar kaydedildi!')
  }

  // Geçmiş notları başlığa göre grupla
  const grupluNotlar = gecmisNotlar.reduce((acc: any, not: any) => {
    const key = `${not.baslik}__${not.tarih}`
    if (!acc[key]) acc[key] = { baslik: not.baslik, tarih: not.tarih, notlar: [] }
    acc[key].notlar.push(not)
    return acc
  }, {})

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sınıf</label>
          <select
            value={secilenSinif?.id || ''}
            onChange={(e) => {
              const s = siniflar.find(s => s.id === e.target.value)
              setSecilenSinif(s)
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            {siniflar.map(s => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ders</label>
          <select
            value={secilenDers?.id || ''}
            onChange={(e) => {
              const d = dersler.find(d => d.id === e.target.value)
              setSecilenDers(d)
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            {dersler.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
          </select>
        </div>
      </div>

      {/* Sekme Seçici */}
      <div className="flex gap-2">
        <button
          onClick={() => setSekme('giris')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            sekme === 'giris' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border border-gray-300'
          }`}
        >
          Not Girişi
        </button>
        <button
          onClick={() => setSekme('gecmis')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            sekme === 'gecmis' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border border-gray-300'
          }`}
        >
          Geçmiş Notlar
        </button>
      </div>

      {sekme === 'giris' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Not Başlığı</label>
              <input
                value={notBasligi}
                onChange={(e) => setNotBasligi(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                placeholder="örn: 1. Sınav, Ödev 1..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tarih</label>
              <input
                type="date"
                value={notTarihi}
                onChange={(e) => setNotTarihi(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <button
              onClick={kaydet}
              disabled={kaydediyor || ogrenciler.length === 0}
              className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50"
            >
              {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>

          {ogrenciler.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Bu sınıfta öğrenci yok</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {ogrenciler.map((o) => (
                <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">
                    #{o.numara} {o.kullanicilar?.ad} {o.kullanicilar?.soyad}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={notlar[o.id] || ''}
                    onChange={(e) => setNotlar(prev => ({ ...prev, [o.id]: e.target.value }))}
                    className="w-20 border border-gray-300 rounded-lg px-3 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {sekme === 'gecmis' && (
        <div className="space-y-3">
          {Object.keys(grupluNotlar).length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400">
              Henüz not girilmemiş
            </div>
          ) : (
            Object.values(grupluNotlar).map((grup: any) => (
              <div key={`${grup.baslik}__${grup.tarih}`} className="bg-white rounded-xl shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-medium text-gray-800">{grup.baslik}</h3>
                  <span className="text-xs text-gray-400">{grup.tarih}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {grup.notlar.map((n: any) => (
                    <div key={n.id} className="px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        #{n.ogrenciler?.numara} {n.ogrenciler?.kullanicilar?.ad} {n.ogrenciler?.kullanicilar?.soyad}
                      </span>
                      <span className="text-sm font-medium text-gray-800">{n.puan}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}