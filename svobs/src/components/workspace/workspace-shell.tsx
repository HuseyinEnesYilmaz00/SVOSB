'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, ChevronRight, KeyRound, LogOut, MoreHorizontal, X, type LucideIcon } from 'lucide-react'

export type WorkspaceItem = { id: string; ad: string; ikon: LucideIcon }
const descriptions: Record<string, string> = {
  ogrenciler: 'Öğrencilerini bul, sınıflarını ve gelişimlerini takip et.',
  siniflar: 'Sınıflarını ve akademik dönemlerini bir arada yönet.',
  dersler: 'Dersleri, öğretmenleri ve haftalık programı düzenle.',
  yoklama: 'Ders katılımını takip et, yoklamaları kolayca kaydet.',
  notlar: 'Sınavları ve öğrenci başarısını aynı yerden takip et.',
  odevler: 'Ödevleri ve teslimleri takip ederek öğrenmeyi destekle.',
  duyurular: 'Önemli bilgileri öğrencilerinle paylaş.',
  hocalar: 'Öğretmenleri ve ders görevlendirmelerini yönet.',
  genelbakis: 'Programının genel durumuna birlikte bakalım.',
}

export function WorkspaceShell({ role, name, context, selector, items, active, onSelect, onLogout, children }: {
  role: 'Yönetim' | 'Öğretmen'; name: string; context: string; selector: ReactNode;
  items: WorkspaceItem[]; active: string; onSelect: (id: string) => void;
  onLogout: () => void; children: ReactNode
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const reduceMotion = useReducedMotion()
  const current = items.find(item => item.id === active)
  const primary = items.slice(0, 4)
  const extra = items.slice(4)
  const select = (id: string) => {
    onSelect(id)
    setMoreOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  useEffect(() => {
    if (!moreOpen) return
    const close = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMoreOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMoreOpen(false); moreRef.current?.focus() }
    }
    menuRef.current?.querySelector<HTMLButtonElement>('#workspace-more button')?.focus()
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [moreOpen])

  return (
    <MotionConfig reducedMotion="user">
      <div className="workspace min-h-svh">
        <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:p-4">İçeriğe geç</a>
        <aside className="workspace-sidebar fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/70 bg-white/90 p-5 lg:flex">
          <div className="mb-10 flex items-center gap-3 px-2 pt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sv-logo.png" alt="" className="size-9 object-contain brightness-0" />
            <div><p className="text-sm font-semibold tracking-tight">Siyer Vakfı</p><p className="mt-1 text-[10px] tracking-[0.16em] text-muted-foreground">ÖĞRENCİ BİLGİ SİSTEMİ</p></div>
          </div>
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{role} alanı</p>
          <nav aria-label={`${role} bölümleri`} className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {items.map(item => <button key={item.id} onClick={() => select(item.id)} aria-current={active === item.id ? 'page' : undefined} className={`workspace-nav relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm ${active === item.id ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}>
              {active === item.id && <motion.span layoutId="workspace-sidebar-active" className="absolute left-0 h-5 w-0.5 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 400, damping: 35 }} />}
              <item.ikon className="size-[18px] shrink-0" /><span>{item.ad}</span>{item.id === 'disaaktar' && <ArrowUpRight className="ml-auto size-3.5" />}
            </button>)}
          </nav>
          <div className="mt-6 rounded-2xl border border-primary/10 bg-primary/5 p-4"><p className="text-xs font-semibold text-primary"> </p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Siyer Vakfı eğitim programları</p></div>
        </aside>
        <div className="lg:pl-60">
          <header className="flex min-h-[76px] items-center justify-between gap-3 border-b border-border/60 bg-white/70 px-4 sm:px-8">
            <div className="min-w-0"><p className="flex items-center gap-2 text-xs text-muted-foreground">{role} paneli <ChevronRight className="size-3" /><span className="truncate text-foreground">{current?.ad}</span></p><p className="mt-1 truncate text-xs font-medium text-primary">{context}</p></div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <div className="mr-3 hidden text-right sm:block"><p className="max-w-48 truncate text-sm font-medium">{name}</p><p className="text-[11px] text-muted-foreground">{role}</p></div>
              <a href="/sifre-degistir" aria-label="Şifre değiştir" title="Şifre değiştir" className="workspace-icon-button"><KeyRound className="size-4" /></a>
              <button onClick={onLogout} aria-label="Çıkış yap" title="Çıkış yap" className="workspace-icon-button hover:text-destructive"><LogOut className="size-4" /></button>
            </div>
          </header>
          <main id="workspace-content" tabIndex={-1} className="mx-auto max-w-[1440px] px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 outline-none sm:px-6 sm:pt-7 lg:px-8 lg:pb-10">
            <div className="workspace-intro relative mb-6 overflow-hidden rounded-3xl border border-primary/10 px-5 py-6 sm:px-7 sm:py-7">
              <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 size-72 rounded-full border-[40px] border-primary/[0.04]" />
              <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
                <div className="min-w-0"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Siyer Vakfı · {role}</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{current?.ad || 'Çalışma alanım'}</h1><p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{descriptions[active]}</p></div>
                <div className="w-full min-w-0 xl:max-w-xs">{selector}</div>
              </div>
            </div>
            {children}
          </main>
        </div>
        <div ref={menuRef} className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md lg:hidden">
          <AnimatePresence>
            {moreOpen && <motion.div id="workspace-more" initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }} transition={{ duration: 0.18 }} className="mb-2 grid max-h-[60dvh] grid-cols-3 gap-2 overflow-y-auto rounded-3xl border border-border bg-white p-3 shadow-xl">
              {extra.map(item => <button key={item.id} onClick={() => select(item.id)} aria-current={active === item.id ? 'page' : undefined} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl p-2 text-xs ${active === item.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}><item.ikon className="size-5" />{item.ad}</button>)}
            </motion.div>}
          </AnimatePresence>
          <nav aria-label={`${role} mobil menüsü`} className="flex rounded-[24px] border border-white bg-white/95 p-1.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            {primary.map(item => <button key={item.id} onClick={() => select(item.id)} aria-current={active === item.id ? 'page' : undefined} className={`relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] text-[10px] sm:text-xs ${active === item.id ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
              {active === item.id && <motion.span layoutId="workspace-mobile-active" className="absolute inset-0 rounded-[18px] bg-primary/10" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <item.ikon className="relative size-5" /><span className="relative">{item.ad}</span>
            </button>)}
            {extra.length > 0 && <button ref={moreRef} aria-expanded={moreOpen} aria-controls="workspace-more" aria-label="Diğer" onClick={() => setMoreOpen(!moreOpen)} className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] text-[10px] ${moreOpen || extra.some(item => item.id === active) ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground'}`}>{moreOpen ? <X className="size-5" /> : <MoreHorizontal className="size-5" />}Diğer</button>}
          </nav>
        </div>
      </div>
    </MotionConfig>
  )
}
