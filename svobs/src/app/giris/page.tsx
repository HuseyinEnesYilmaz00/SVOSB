'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function GirisPage() {
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function girisYap() {
    setYukleniyor(true)
    setHata('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: sifre,
    })

    if (error) {
      setHata('Email veya şifre hatalı.')
      setYukleniyor(false)
      return
    }

    const { data: kullanici } = await supabase
      .from('kullanicilar')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    if (kullanici?.rol === 'super_admin' || kullanici?.rol === 'program_admin') {
      router.push('/admin')
    } else if (kullanici?.rol === 'ogretmen') {
      router.push('/ogretmen')
    } else {
      router.push('/ogrenci')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Siyer Vakfı</h1>
        <p className="text-gray-500 mb-6">Öğrenci Bilgi Sistemi</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="ornek@mail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="••••••••"
            />
          </div>

          {hata && (
            <p className="text-red-500 text-sm">{hata}</p>
          )}

          <button
            onClick={girisYap}
            disabled={yukleniyor}
            className="w-full bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 transition disabled:opacity-50"
          >
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </div>
      </div>
    </main>
  )
}