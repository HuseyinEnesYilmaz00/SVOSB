'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScoreBadge, formatScore, letterFromScore } from '@/components/score-badge'
import { cn } from '@/lib/utils'
import { BookOpen, CalendarCheck, FileText } from 'lucide-react'

const STATUS_TONE: Record<string, string> = {
  katildi: 'bg-primary/12 text-primary border-primary/20',
  gec: 'bg-accent/25 text-accent-foreground border-accent/40',
  izinli: 'bg-muted text-muted-foreground border-border',
  katilmadi: 'bg-destructive/12 text-destructive border-destructive/25',
}

const STATUS_LABEL: Record<string, string> = {
  katildi: 'Katıldı',
  gec: 'Geç',
  izinli: 'İzinli',
  katilmadi: 'Katılmadı',
}

interface Ders {
  id: string
  ad: string
  gun?: string
  saat?: string
  sinavlar: { id: string; baslik: string; tarih: string; puan: number | null }[]
  yoklamalar: { id: string; tarih: string; durum: string }[]
  sinavOrtalama: number | null
  devamPuani: number | null
  dersPuani: number | null
}

export function StudentReportView({
  dersler,
  genelOrtalama,
  ogrenciNo,
}: {
  dersler: Ders[]
  genelOrtalama: number | null
  ogrenciNo: number | null
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Genel Özet */}
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Dönem Sonu Ortalaması</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-heading text-4xl font-semibold tabular-nums text-foreground">
              {formatScore(genelOrtalama)}
            </span>
            <span className="text-base font-medium text-muted-foreground">
              {letterFromScore(genelOrtalama)}
            </span>
          </div>
        </div>
        {ogrenciNo ? (
          <Badge variant="outline" className="w-fit text-muted-foreground">
            Öğrenci No: {ogrenciNo}
          </Badge>
        ) : null}
      </Card>

      {dersler.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Henüz ders tanımlanmamış.
        </Card>
      ) : (
        dersler.map((d) => (
          <Card key={d.id} className="p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                  <BookOpen className="size-4" />
                </span>
                <div>
                  <h2 className="font-semibold text-base text-foreground">{d.ad}</h2>
                  {d.gun && d.saat ? (
                    <p className="text-sm text-muted-foreground">{d.gun} · {d.saat}</p>
                  ) : null}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Ders Notu</p>
                <div className="flex items-center gap-2">
                  <ScoreBadge score={d.dersPuani} />
                  <span className="text-sm text-muted-foreground">
                    {letterFromScore(d.dersPuani)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-2">
              {/* Sınavlar */}
              <section>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileText className="size-4 text-muted-foreground" />
                  Sınavlar
                  {d.sinavOrtalama != null ? (
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      Ortalama: {formatScore(d.sinavOrtalama)}
                    </span>
                  ) : null}
                </div>
                {d.sinavlar.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                    Bu derste sınav yok.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sınav</TableHead>
                        <TableHead className="w-20 text-right">Not</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.sinavlar.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-foreground">
                            {s.baslik}
                            {s.tarih ? (
                              <span className="ml-2 text-xs text-muted-foreground">{s.tarih}</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            <ScoreBadge score={s.puan} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </section>

              {/* Devam */}
              <section>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarCheck className="size-4 text-muted-foreground" />
                  Devam Durumu
                  {d.devamPuani != null ? (
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      Puan: {formatScore(d.devamPuani)}
                    </span>
                  ) : null}
                </div>
                {d.yoklamalar.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                    Devam kaydı yok.
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {d.yoklamalar.map((y) => (
                      <li key={y.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-sm text-muted-foreground tabular-nums">{y.tarih}</span>
                        <Badge
                          variant="outline"
                          className={cn('font-medium', STATUS_TONE[y.durum] ?? '')}
                        >
                          {STATUS_LABEL[y.durum] ?? y.durum}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}