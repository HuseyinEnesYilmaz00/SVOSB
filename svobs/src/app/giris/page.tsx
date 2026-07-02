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
    <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo ve Başlık */}
        <div className="flex flex-col items-center gap-4 mb-8 text-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#2f6b4f] flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">SV</span>
            </div>
            <p className="font-semibold text-gray-800 text-xl tracking-tight">Siyer Vakfı</p>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Öğrenci Bilgilendirme Sistemi
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Hesabınıza giriş yaparak devam ve sınav notlarınızı görüntüleyin.
            </p>
          </div>
        </div>

        {/* Kart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="email">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@eposta.com"
                className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#2f6b4f] focus:ring-2 focus:ring-[#2f6b4f]/20 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="password">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && girisYap()}
                className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#2f6b4f] focus:ring-2 focus:ring-[#2f6b4f]/20 transition-colors"
              />
            </div>

            {hata && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>
            )}

            <button
              onClick={girisYap}
              disabled={yukleniyor}
              className="h-9 w-full rounded-lg bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-900 transition-colors disabled:opacity-50"
            >
              {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>

            <button className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Şifremi unuttum
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Giriş bilgileriniz programınızın öğretmeni tarafından oluşturulur. Sorun yaşıyorsanız öğretmeninizle iletişime geçin.
        </p>
      </div>
    </main>
  )
}