'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [hata, setHata] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function linkGonder() {
    if (!email) {
      setHata('E-posta adresini gir!')
      return
    }

    setYukleniyor(true)
    setHata('')
    setMesaj('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/sifre-degistir`,
    })

    if (error) {
      setHata('Bir hata oluştu: ' + error.message)
      setYukleniyor(false)
      return
    }

    setMesaj('E-postana bir sıfırlama linki gönderdik. Gelen kutunu (ve spam klasörünü) kontrol et.')
    setYukleniyor(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcfaf4' }}>
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Şifremi Unuttum</h1>
        <p className="text-sm text-gray-500 mb-6">E-posta adresini gir, sana sıfırlama linki gönderelim</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="ornek@eposta.com"
            />
          </div>

          {hata && <p className="text-red-500 text-sm">{hata}</p>}
          {mesaj && <p className="text-green-600 text-sm">{mesaj}</p>}

          <button
            onClick={linkGonder}
            disabled={yukleniyor}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/80 transition disabled:opacity-50"
          >
            {yukleniyor ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
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