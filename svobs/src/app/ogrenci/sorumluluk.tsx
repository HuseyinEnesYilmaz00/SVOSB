'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ClipboardList } from 'lucide-react'

const STATUS_TONE: Record<string, string> = {
  katildi: 'bg-primary/12 text-primary border-primary/20',
  gec: 'bg-accent/25 text-accent-foreground border-accent/40',
  izinli: 'bg-muted text-muted-foreground border-border',
  katilmadi: 'bg-destructive/12 text-destructive border-destructive/25',
}

const STATUS_LABEL: Record<string, string> = {
  katildi: 'Katıldı', gec: 'Geç', izinli: 'İzinli', katilmadi: 'Katılmadı',
}

export function SorumlulukPaneli({ ogrenciId, dersler, supabase }: {
  ogrenciId: string, dersler: any[], supabase: any
}) {
  const [secilenDers, setSecilenDers] = useState<any>(dersler[0])
  const [sinifOgrencileri, setSinifOgrencileri] = useState<any[]>([])
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0])
  const [yoklamalar, setYoklamalar] = useState<Record<string, string>>({})
  const [mevcutYoklamalar, setMevcutYoklamalar] = useState<any[]>([])
  const [kaydediyor, setKaydediyor] = useState(false)

  useEffect(() => {
    async function yukle() {
      if (!secilenDers) return
      const { data: ders } = await supabase.from('dersler').select('sinif_id').eq('id', secilenDers.ders_id).single()
      if (!ders) return
      const { data: ogr } = await supabase
        .from('ogrenciler').select('id, numara, kullanici_id')
        .eq('sinif_id', ders.sinif_id).eq('aktif', true).order('numara')
      if (ogr) {
        const ids = ogr.map((o: any) => o.kullanici_id)
        const { data: kull } = await supabase.from('kullanicilar').select('id, ad, soyad').in('id', ids)
        setSinifOgrencileri(ogr.map((o: any) => ({
          ...o, kullanicilar: kull?.find((k: any) => k.id === o.kullanici_id)
        })))
      }
    }
    yukle()
  }, [secilenDers])

  useEffect(() => {
    async function yukle() {
      if (!secilenDers || !tarih) return
      const { data } = await supabase.from('yoklamalar').select('*')
        .eq('ders_id', secilenDers.ders_id).eq('tarih', tarih)
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
      if (mevcut) { alert('Kaydedilmiş yoklamayı sadece admin değiştirebilir!'); continue }
      await supabase.from('yoklamalar').insert({ ogrenci_id: o.id, ders_id: secilenDers.ders_id, tarih, durum })
    }
    setKaydediyor(false)
    alert('Yoklama kaydedildi!')
  }

  const durumlar = [
    { value: 'katildi', label: 'Katıldı' },
    { value: 'katilmadi', label: 'Katılmadı' },
    { value: 'gec', label: 'Geç' },
    { value: 'izinli', label: 'İzinli' },
  ]

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <ClipboardList className="size-4 text-muted-foreground" />
        <h2 className="font-medium text-sm text-foreground">Sorumlu Paneli</h2>
      </div>

      {dersler.length > 1 && (
        <div className="px-5 py-2 border-b border-border flex gap-2">
          {dersler.map((d) => (
            <button
              key={d.ders_id}
              onClick={() => setSecilenDers(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                secilenDers?.ders_id === d.ders_id
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {d.dersler?.ad}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <p className="text-sm font-medium text-foreground">{secilenDers?.dersler?.ad} — Yoklama</p>
        <div className="flex items-center gap-2">
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)}
            className="h-8 px-2 rounded-lg border border-input text-sm outline-none focus:border-ring" />
          <Button size="sm" onClick={kaydet} disabled={kaydediyor}>
            {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {sinifOgrencileri.map((o) => (
          <div key={o.id} className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-foreground">
              #{o.numara} {o.kullanicilar?.ad} {o.kullanicilar?.soyad}
            </span>
            <div className="flex gap-1">
              {durumlar.map((d) => (
                <button
                  key={d.value}
                  onClick={() => {
                    const mevcut = mevcutYoklamalar.find(y => y.ogrenci_id === o.id)
                    if (mevcut) { alert('Bu yoklama zaten kaydedilmiş. Sadece admin değiştirebilir.'); return }
                    setYoklamalar(prev => ({ ...prev, [o.id]: d.value }))
                  }}
                  className={cn(
                    'text-xs px-2 py-1 rounded-lg border transition',
                    yoklamalar[o.id] === d.value
                      ? STATUS_TONE[d.value] + ' font-medium'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}