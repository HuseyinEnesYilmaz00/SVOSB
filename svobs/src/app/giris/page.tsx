'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <main className="min-h-svh bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="w-32 h-32 flex items-center justify-center">
            <img
              src="/sv-logo.png"
              alt="Siyer Vakfı"
              className="w-full h-full object-contain brightness-0 transform scale-[1.1] translate-y-1"
            />
          </div>
          <div className="-translate-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Öğrenci Bilgilendirme Sistemi
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Hesabınıza giriş yaparak devam ve sınav notlarınızı görüntüleyin.
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@eposta.com"
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && girisYap()}
                autoComplete="current-password"
              />
            </div>

            {hata && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {hata}
              </p>
            )}

            <Button
              onClick={girisYap}
              disabled={yukleniyor}
              className="w-full"
            >
              {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>

            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Şifremi unuttum
            </button>
          </div>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Giriş bilgileriniz programınızın öğretmeni tarafından oluşturulur.
          Sorun yaşıyorsanız öğretmeninizle iletişime geçin.
        </p>
      </div>
    </main>
  )
}