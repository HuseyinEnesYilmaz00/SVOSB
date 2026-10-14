'use client'

import { type FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [hata, setHata] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function linkGonder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const temizEmail = email.trim()

    if (!temizEmail) {
      setHata('E-posta adresini gir!')
      return
    }

    setYukleniyor(true)
    setHata('')
    setMesaj('')

    const callbackUrl = new URL('/auth/callback', window.location.origin)
    callbackUrl.searchParams.set('next', '/sifre-degistir')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(temizEmail, {
        redirectTo: callbackUrl.toString(),
      })
      if (error) {
        setHata('Bağlantı gönderilemedi. Lütfen kısa bir süre sonra tekrar deneyin.')
        return
      }
      setMesaj('Bu adresle kayıtlı bir hesap varsa şifre yenileme bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.')
    } catch {
      setHata('Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.')
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcfaf4' }}>
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Şifremi Unuttum</h1>
        <p className="text-sm text-gray-500 mb-6">E-posta adresini gir, sana sıfırlama linki gönderelim</p>

        <form className="space-y-4" onSubmit={linkGonder}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="ornek@eposta.com"
              autoComplete="email"
              required
            />
          </div>

          {hata && <p className="text-red-500 text-sm">{hata}</p>}
          {mesaj && <p className="text-green-600 text-sm">{mesaj}</p>}

          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/80 transition disabled:opacity-50"
          >
            {yukleniyor ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Geri Dön
          </button>
        </form>
      </div>
    </main>
  )
}
