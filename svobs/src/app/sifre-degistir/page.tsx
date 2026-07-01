'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SifreDegistirPage() {
  const [yeniSifre, setYeniSifre] = useState('')
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [hata, setHata] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function sifreDegistir() {
    if (!yeniSifre || !yeniSifreTekrar) {
      setHata('Tüm alanları doldur!')
      return
    }
    if (yeniSifre !== yeniSifreTekrar) {
      setHata('Şifreler eşleşmiyor!')
      return
    }
    if (yeniSifre.length < 6) {
      setHata('Şifre en az 6 karakter olmalı!')
      return
    }

    setYukleniyor(true)
    setHata('')

    const { error } = await supabase.auth.updateUser({ password: yeniSifre })

    if (error) {
      setHata('Şifre değiştirilemedi: ' + error.message)
      setYukleniyor(false)
      return
    }

    setMesaj('Şifren başarıyla değiştirildi!')
    setYukleniyor(false)
    setTimeout(() => router.back(), 2000)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Şifre Değiştir</h1>
        <p className="text-sm text-gray-500 mb-6">Yeni şifreni gir</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
            <input
              type="password"
              value={yeniSifre}
              onChange={(e) => setYeniSifre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="En az 6 karakter"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              value={yeniSifreTekrar}
              onChange={(e) => setYeniSifreTekrar(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="Şifreyi tekrar gir"
            />
          </div>

          {hata && <p className="text-red-500 text-sm">{hata}</p>}
          {mesaj && <p className="text-green-600 text-sm">{mesaj}</p>}

          <button
            onClick={sifreDegistir}
            disabled={yukleniyor}
            className="w-full bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 transition disabled:opacity-50"
          >
            {yukleniyor ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
          </button>

          <button
            onClick={() => router.back()}
            className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Geri Dön
          </button>
        </div>
      </div>
    </main>
  )
}