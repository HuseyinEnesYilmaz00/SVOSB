'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SifreDegistirPage() {
  const [yeniSifre, setYeniSifre] = useState('')
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [hata, setHata] = useState('')
  const [oturumKontrolEdiliyor, setOturumKontrolEdiliyor] = useState(true)
  const [oturumGecerli, setOturumGecerli] = useState(false)
  const [sifreGoster, setSifreGoster] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    async function oturumuKontrolEt() {
      const params = new URLSearchParams(window.location.search)
      if (params.get('hata')) {
        if (mounted) {
          setHata('Bu şifre yenileme bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin.')
          setOturumKontrolEdiliyor(false)
        }
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (mounted) {
        setOturumGecerli(Boolean(user))
        if (!user) {
          setHata('Şifreyi değiştirmek için e-postandaki geçerli yenileme bağlantısını açmalısın.')
        }
        setOturumKontrolEdiliyor(false)
      }
    }

    void oturumuKontrolEt()
    return () => { mounted = false }
  }, [supabase])

  async function sifreDegistir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!yeniSifre || !yeniSifreTekrar) {
      setHata('Tüm alanları doldur!')
      return
    }
    if (yeniSifre !== yeniSifreTekrar) {
      setHata('Şifreler eşleşmiyor!')
      return
    }
    if (yeniSifre.length < 8) {
      setHata('Şifre en az 8 karakter olmalı!')
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

    setMesaj('Şifren başarıyla değiştirildi! Giriş sayfasına yönlendiriliyorsun...')
    setYeniSifre('')
    setYeniSifreTekrar('')
    setYukleniyor(false)
    setTimeout(() => router.replace('/giris'), 1800)
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcfaf4' }}>
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Şifre Değiştir</h1>
        <p className="text-sm text-gray-500 mb-6">Hesabın için yeni bir şifre belirle</p>

        <form className="space-y-4" onSubmit={sifreDegistir}>
          <div>
            <label htmlFor="yeni-sifre" className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
            <input
              id="yeni-sifre"
              type={sifreGoster ? 'text' : 'password'}
              value={yeniSifre}
              onChange={(event) => setYeniSifre(event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
              placeholder="En az 8 karakter"
              autoComplete="new-password"
              minLength={8}
              disabled={!oturumGecerli || yukleniyor}
              required
            />
          </div>
          <div>
            <label htmlFor="yeni-sifre-tekrar" className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre (Tekrar)</label>
            <input
              id="yeni-sifre-tekrar"
              type={sifreGoster ? 'text' : 'password'}
              value={yeniSifreTekrar}
              onChange={(event) => setYeniSifreTekrar(event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100"
              placeholder="Şifreyi tekrar gir"
              autoComplete="new-password"
              minLength={8}
              disabled={!oturumGecerli || yukleniyor}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={sifreGoster}
              onChange={(event) => setSifreGoster(event.target.checked)}
            />
            Şifreyi göster
          </label>

          {hata && <p role="alert" className="text-red-500 text-sm">{hata}</p>}
          {mesaj && <p role="status" className="text-green-600 text-sm">{mesaj}</p>}

          <button
            type="submit"
            disabled={yukleniyor || oturumKontrolEdiliyor || !oturumGecerli}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/80 transition disabled:opacity-50"
          >
            {oturumKontrolEdiliyor ? 'Bağlantı doğrulanıyor...' : yukleniyor ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
          </button>

          <button
            type="button"
            onClick={() => router.push(oturumGecerli ? '/giris' : '/sifremi-unuttum')}
            className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            {oturumGecerli ? 'Giriş Sayfasına Dön' : 'Yeni Bağlantı İste'}
          </button>
        </form>
      </div>
    </main>
  )
}
