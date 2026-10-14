'use client'

import { useState } from 'react'
import { BookOpen, CalendarCheck, Clock3, Coffee, UserRound } from 'lucide-react'

export type ScheduleLesson = {
  id: string
  ad: string
  gun: string | null
  saat: string | null
  periyot?: string | null
  baslangic_tarihi?: string | null
  ogretmen_adi?: string | null
  ogretmen_dersleri?: { kullanicilar: { ad: string; soyad: string } | null }[]
}
export type ScheduleCancellation = { ders_id: string; tarih: string }
export const weekDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const shortDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function weekDates(today: Date) {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7)
  return weekDays.map((_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index))
}
export function fortnightDates(today: Date) {
  const monday = weekDates(today)[0]
  return Array.from({ length: 14 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index))
}
export function occursOn(lesson: ScheduleLesson, date: Date) {
  if (!lesson.baslangic_tarihi) return true
  const start = new Date(`${lesson.baslangic_tarihi.slice(0, 10)}T00:00:00`)
  if (dateKey(date) < dateKey(start)) return false
  const monday = weekDates(date)[0]
  const firstMonday = weekDates(start)[0]
  // Calendar weeks, unaffected by daylight-saving clock changes.
  const weeks = Math.round((Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()) - Date.UTC(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate())) / 604800000)
  const interval = ({ '2haftada1': 2, '3haftada1': 3, ayda1: 4 } as Record<string, number>)[lesson.periyot || ''] || 1
  return weeks % interval === 0
}

export function WeeklySchedule({ lessons, cancellations, today = new Date() }: {
  lessons: ScheduleLesson[]; cancellations: ScheduleCancellation[]; today?: Date
}) {
  const todayIndex = (today.getDay() + 6) % 7
  const [selected, setSelected] = useState(todayIndex)
  const [showFortnight, setShowFortnight] = useState(false)
  const dates = fortnightDates(today)
  const groups = dates.map((date, index) => {
    const day = weekDays[index % 7]
    return {
      day, date, index,
      lessons: lessons.filter(lesson => lesson.gun === day).sort((a, b) => (a.saat || '99').localeCompare(b.saat || '99')),
    }
  })
  const isCancelled = (lesson: ScheduleLesson, date: Date) => cancellations.some(item => item.ders_id === lesson.id && item.tarih.slice(0, 10) === dateKey(date))
  const count = (index: number) => groups[index].lessons.filter(lesson => occursOn(lesson, dates[index]) && !isCancelled(lesson, dates[index])).length
  const total = groups.reduce((sum, group) => sum + count(group.index), 0)
  const formatDate = (date: Date) => date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })

  return (
    <section aria-label="Haftalık ders programı" className="overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm">
      <div className="bg-primary/5 px-4 pb-5 pt-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold text-primary"><CalendarCheck className="size-4" /> İKİ HAFTALIK PROGRAM</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary">{total} ders</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Ders programım</h1>
        <p className="mt-1 text-sm text-muted-foreground">{formatDate(dates[0])} – {formatDate(dates[13])}</p>
        <div className="mt-5 grid grid-cols-7 gap-1 sm:gap-2" aria-label="İki haftanın günleri">
          {groups.map(({ day, date, index }) => (
            <button key={dateKey(date)} type="button" aria-label={`${index < 7 ? 'Bu hafta' : 'Gelecek hafta'}, ${day}, ${formatDate(date)}, ${count(index)} ders${index === todayIndex ? ', bugün' : ''}`} aria-pressed={selected === index && !showFortnight}
              onClick={() => { setSelected(index); setShowFortnight(false) }}
              className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors sm:min-h-20 sm:gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected === index && !showFortnight ? 'border-primary bg-primary text-primary-foreground shadow-sm' : index === todayIndex ? 'border-primary/30 bg-white text-primary' : index >= 7 ? 'border-primary/10 bg-white/60 text-muted-foreground hover:bg-white' : 'border-transparent text-muted-foreground hover:bg-white'}`}>
              <span className="text-[10px] font-medium sm:text-xs">{shortDays[index % 7]}</span>
              <span className="text-lg font-semibold">{date.getDate()}</span>
              <span aria-hidden="true" className={`size-1 rounded-full ${count(index) ? 'bg-current' : 'bg-transparent'}`} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2 sm:px-6">
        <p className="text-sm font-semibold">{showFortnight ? 'İki haftaya genel bakış' : selected === todayIndex ? 'Bugünün dersleri' : `${groups[selected].day} dersleri`}</p>
        <button type="button" aria-pressed={showFortnight} onClick={() => setShowFortnight(!showFortnight)} className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">{showFortnight ? 'Güne dön' : 'Tüm program'}</button>
      </div>
      <div className="p-4 sm:p-6" aria-live="polite">
        {(showFortnight ? groups : [groups[selected]]).map(group => (
          <div key={dateKey(group.date)} className={showFortnight ? 'mb-5 last:mb-0' : ''}>
            {showFortnight && <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">{group.day}<span className="text-xs font-normal text-muted-foreground">{formatDate(group.date)}</span>{group.index === todayIndex && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Bugün</span>}</h2>}
            {group.lessons.length === 0 ? (
              <div className={`rounded-2xl bg-muted/40 text-center ${showFortnight ? 'p-3' : 'px-5 py-8'}`}>
                {!showFortnight && <Coffee className="mx-auto mb-3 size-7 text-primary/60" />}
                <p className="text-sm font-medium">Bu gün için dersin yok.</p>
                {!showFortnight && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Diğer günlere dokunarak iki haftanı planlayabilirsin.</p>}
              </div>
            ) : <div className="space-y-3">{group.lessons.map(lesson => {
              const cancelled = isCancelled(lesson, group.date)
              const active = occursOn(lesson, group.date)
              const teachers = lesson.ogretmen_adi || lesson.ogretmen_dersleri?.flatMap(item => item.kullanicilar ? [`${item.kullanicilar.ad} ${item.kullanicilar.soyad}`] : []).join(', ')
              return (
                <article key={lesson.id} className={`flex gap-3 rounded-2xl border p-3 sm:gap-4 sm:p-4 ${cancelled ? 'border-destructive/20 bg-destructive/5' : !active ? 'border-border bg-muted/30' : 'border-primary/10 bg-primary/[0.025]'}`}>
                  <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border/70 pr-3 pt-1 sm:w-16">
                    <Clock3 className="size-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold tabular-nums">{lesson.saat?.slice(0, 5) || '—'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold leading-relaxed">{lesson.ad}</h3>
                    {teachers && <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"><UserRound className="mt-0.5 size-3 shrink-0" /><span className="break-words">{teachers}</span></p>}
                    <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${cancelled ? 'bg-destructive/10 text-destructive' : !active ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}><BookOpen className="size-3" />{cancelled ? 'Ders iptal edildi' : !active ? 'Bu hafta yapılmıyor' : 'Ders var'}</span>
                  </div>
                </article>
              )
            })}</div>}
          </div>
        ))}
        {lessons.some(lesson => !weekDays.includes(lesson.gun || '')) && <p className="mt-4 text-xs text-muted-foreground">Günü henüz belirlenmemiş derslerin var. Ayrıntıları Dersler sekmesinde bulabilirsin.</p>}
      </div>
    </section>
  )
}
