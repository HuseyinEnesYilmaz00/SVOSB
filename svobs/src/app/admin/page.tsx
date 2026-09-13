'use client'
// Glass tasarım sistemine geçirildi: ui.* token'ları + glass-btn-primary/secondary,
// tüm modallar ui.modalOverlay/modalCard'a taşındı (mobilde kenara yapışmasın diye p-4 eklendi),
// sekme + modal geçişlerine framer-motion animasyonu eklendi.
// Header, program seçici ve alt dock (referans glass) dokunulmadı.
import { toast } from 'sonner'

import { programTema } from '@/lib/tema'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ui } from '@/lib/ui'
import ExportButton from '@/components/ui/ExportButton'; // kendi path'ine göre ayarla
import { motion, AnimatePresence } from "framer-motion"
import { DockItem } from "@/components/FloatingDock"
import { Users, BookOpen, CalendarCheck, FileCheck, MoreHorizontal, X, GraduationCap, FileText, Bell, Award, LayoutDashboard, Download } from "lucide-react"
import { guncelDonem, guncelAkademikDonem } from '@/lib/donem'

const ADMIN_ANA_SEKMELER: DockItem[] = [
  { id: "ogrenciler", ad: "Öğrenciler", ikon: Users },
  { id: "dersler", ad: "Dersler", ikon: BookOpen },
  { id: "yoklama", ad: "Devam", ikon: CalendarCheck },
  { id: "odevler", ad: "Ödevler", ikon: FileCheck },
  { id: "diger", ad: "Diğer", ikon: MoreHorizontal },
];

const DIGER_SEKMELER = [
  { id: "siniflar", ad: "Sınıflar", ikon: GraduationCap },
  { id: "notlar", ad: "Notlar", ikon: FileText },
  { id: "duyurular", ad: "Duyurular", ikon: Bell },
  { id: "hocalar", ad: "Hocalar", ikon: Award },
  { id: "genelbakis", ad: "Genel Bakış", ikon: LayoutDashboard },
  { id: "disaaktar", ad: "Dışa Aktar", ikon: Download },
];

export default function AdminPage() {
  const [kullanici, setKullanici] = useState<any>(null)
  const [programlar, setProgramlar] = useState<any[]>([])
  const [aktifProgram, setAktifProgram] = useState<any>(null)
  const [aktifSekme, setAktifSekme] = useState('ogrenciler')
  const [digerAcik, setDigerAcik] = useState(false);
  const [disaAktarAcik, setDisaAktarAcik] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!digerAcik) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setDigerAcik(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDigerAcik(false);
    };
    document.addEventListener("pointerdown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [digerAcik]);
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function yukle() {
      const { data: { user }, error: oturumHata } = await supabase.auth.getUser()
      if (oturumHata) {
        setHata(`Oturum doğrulanamadı: ${oturumHata.message}`)
        setYukleniyor(false)
        return
      }
      if (!user) { router.push('/giris'); return }

      const { data: k } = await supabase
        .from('kullanicilar')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!k || !['super_admin', 'program_admin'].includes(k.rol)) {
        router.push('/giris'); return
      }

      setKullanici(k)

      let programSorgu = supabase.from('programlar').select('*').order('ad')

      if (k.rol === 'program_admin') {
        const { data: kp, error: kpHata } = await supabase
          .from('kullanici_programlar')
          .select('program_id')
          .eq('kullanici_id', user.id)

        if (kpHata) {
          setHata(`Program yetkileri yüklenemedi: ${kpHata.message}`)
          setYukleniyor(false)
          return
        }

        const izinliIdler = (kp || []).map((x: any) => x.program_id)
        if (izinliIdler.length === 0) {
          setHata('Bu admin hesabına henüz bir program yetkisi tanımlanmamış.')
          setYukleniyor(false)
          return
        }
        programSorgu = programSorgu.in('id', izinliIdler)
      }

      const { data: p, error: programHata } = await programSorgu

      if (programHata) {
        setHata(`Programlar yüklenemedi: ${programHata.message}`)
      } else if (!p || p.length === 0) {
        setHata('Bu admin hesabının görüntüleyebileceği program bulunamadı.')
      }

      if (p && p.length > 0) {
        setProgramlar(p)
        setAktifProgram(p[0])
      }

      setYukleniyor(false)
    }
    yukle()
  }, [])

  async function cikisYap() {
    await supabase.auth.signOut()
    router.push('/giris')
  }

  if (yukleniyor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Yükleniyor...</p>
      </div>
    )
  }

  if (hata) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">Admin paneli açılamadı</p>
          <p className="mt-2 text-sm text-muted-foreground">{hata}</p>
          <button type="button" onClick={cikisYap} className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Çıkış yap
          </button>
        </div>
      </div>
    )
  }

  const tema = programTema(aktifProgram?.ad || '')

  return (
  <div className={`tema-${tema} min-h-svh bg-background`}>
      <header className="border-b bg-card px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/sv-logo.png" alt="Siyer Vakfı" className="w-8 h-8 object-contain brightness-0 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-foreground">Siyer Vakfı</p>
            <p className="text-xs text-muted-foreground">Yönetim Paneli</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {(kullanici?.ad?.[0] || "") + (kullanici?.soyad?.[0] || "")}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-tight">{kullanici?.ad} {kullanici?.soyad}</p>
            <p className="text-xs text-muted-foreground leading-tight">{kullanici?.rol === "super_admin" ? "Süper Admin" : "Program Yöneticisi"}</p>
          </div>
        </div>
      </header>

      {/* Program Seçici - Sıvı Cam Segmentli Ray (referans glass, değişmedi) */}
      {programlar.length > 1 && (
        <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center justify-start sm:justify-center overflow-x-auto">
          <div 
            className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_20px_-4px_rgba(0,0,0,0.05)] select-none"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.50)",
              backdropFilter: "blur(20px) saturate(190%)",
              WebkitBackdropFilter: "blur(20px) saturate(190%)"
            }}
          >
            {programlar.map((p) => {
              const aktif = aktifProgram?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setAktifProgram(p)}
                  className={`relative px-4 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-2 ${
                    aktif
                      ? "text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_6px_16px_-2px_rgba(0,0,0,0.16)] border border-white/40"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent"
                  }`}
                    style={aktif ? { backgroundColor: "var(--tema-accent)" } : {}}
                >
                  {aktif && (
                    <span
                      className="size-1.5 rounded-full"
                      style={{
                        backgroundColor: "var(--tema-accent)",
                        boxShadow: "0 0 8px rgba(var(--tema-accent-rgb), 0.6)"
                      }}
                    />
                  )}
                  <span>{p.ad}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <main className="p-4 sm:p-6 max-w-7xl mx-auto pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={aktifSekme}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          >
            {aktifSekme === "ogrenciler" && (
              <OgrencilerSekme programId={aktifProgram?.id} supabase={supabase} tema={tema} />
            )}
            {aktifSekme === "siniflar" && (
              <SiniflarSekme programId={aktifProgram?.id} supabase={supabase} tema={tema} />
            )}
            {aktifSekme === "dersler" && (
              <DerslerSekme programId={aktifProgram?.id} supabase={supabase} kullanici={kullanici} />
            )}
            {aktifSekme === "yoklama" && (
              <YoklamaSekmesi programId={aktifProgram?.id} supabase={supabase} kullanici={kullanici} tema={tema} />
            )}
            {aktifSekme === "notlar" && (
              <NotlarSekmesi programId={aktifProgram?.id} supabase={supabase} />
            )}
            {aktifSekme === "odevler" && (
              <OdevlerSekmesi programId={aktifProgram?.id} supabase={supabase} />
            )}
            {aktifSekme === "duyurular" && (
              <DuyurularSekmesi programId={aktifProgram?.id} supabase={supabase} kullanici={kullanici} />
            )}
            {aktifSekme === "hocalar" && (
              <HocalarSekme programId={aktifProgram?.id} supabase={supabase} />
            )}
            {aktifSekme === "genelbakis" && (
              <GenelBakisSekmesi programId={aktifProgram?.id} supabase={supabase} tema={tema} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Yukarıya Doğru Akışkan Esneyen Tek Parça Sıvı Cam Dock — referans glass, değişmedi */}
      <div>
        <div ref={dockRef} className="fixed bottom-5 inset-x-0 mx-auto z-50 w-[92vw] max-w-[380px] pointer-events-auto">
          <motion.nav
            animate={{
              height: digerAcik ? "auto" : "56px",
              borderRadius: digerAcik ? "28px" : "999px"
            }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="relative p-1.5 select-none overflow-hidden"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              backdropFilter: "blur(10px) saturate(210%) contrast(105%)",
              WebkitBackdropFilter: "blur(24px) saturate(210%) contrast(105%)",
              border: "1px solid rgba(255, 255, 255, 0.28)",
              boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.50), inset 0 -1px 1px rgba(0, 0, 0, 0.05)"
            }}
          >
            <AnimatePresence>
              {digerAcik && (
                <motion.div
                  key="admin-diger-menu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="px-2 pt-2 pb-2 border-b border-white/15"
                >
                  <div className="grid grid-cols-3 gap-2 px-1 pt-1 pb-2">
                    {DIGER_SEKMELER.map((s) => {
                      const Ikon = s.ikon;
                      const aktif = aktifSekme === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            if (s.id === "disaaktar") {
                              setDisaAktarAcik(true);
                              setDigerAcik(false);
                            } else {
                              setAktifSekme(s.id);
                              setDigerAcik(false);
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-2xl transition cursor-pointer active:scale-95 ${
                            aktif 
                              ? "bg-primary/20 text-primary font-semibold border border-primary/30" 
                              : "text-foreground/75 hover:bg-white/10"
                          }`}
                        >
                          <Ikon className="size-5 mb-1" />
                          <span className="text-[11px] tracking-tight text-center leading-tight">{s.ad}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-1 pt-2 px-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-7 rounded-full bg-primary/20 border border-primary/30 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                        {(kullanici?.ad?.[0] || "") + (kullanici?.soyad?.[0] || "")}
                      </div>
                      <div className="truncate">
                        <p className="text-[11px] font-semibold text-foreground truncate leading-tight">
                          {kullanici?.ad} {kullanici?.soyad}
                        </p>
                        <p className="text-[9px] text-muted-foreground leading-tight">
                          {kullanici?.rol === "super_admin" ? "Süper Admin" : "Program Yöneticisi"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href="/sifre-degistir"
                        className="px-2.5 py-1 rounded-xl text-[10px] font-medium text-slate-700 bg-white/40 hover:bg-white/70 border border-white/60 shadow-sm transition active:scale-95"
                      >
                        Şifre
                      </a>
                      <button
                        type="button"
                        onClick={cikisYap}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-medium text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        Çıkış
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative flex items-center w-full h-[44px]">
              {ADMIN_ANA_SEKMELER.map((item) => {
                const aktif = (aktifSekme === item.id) || (item.id === "diger" && (digerAcik || DIGER_SEKMELER.some(d => d.id === aktifSekme)));
                const Ikon = item.id === "diger" && digerAcik ? X : item.ikon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === "diger") {
                        setDigerAcik(prev => !prev);
                      } else {
                        setAktifSekme(item.id);
                        setDigerAcik(false);
                      }
                    }}
                    className="relative z-10 flex-1 h-full flex flex-col items-center justify-center rounded-full cursor-pointer transition-transform duration-150 active:scale-95"
                  >
                    {aktif && (
                      <motion.div
                        layoutId="admin-active-mercury"
                        className="absolute inset-0 rounded-full z-0"
                        style={{
                          backgroundColor: "rgba(var(--tema-accent-rgb), 0.20)",
                          border: "1px solid rgba(var(--tema-accent-rgb), 0.35)",
                          boxShadow: "0 2px 8px rgba(var(--tema-accent-rgb), 0.10), inset 0 1px 1px rgba(255, 255, 255, 0.45)"
                        }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}

                    <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
                      <Ikon 
                        className={`size-4.5 transition-transform duration-200 ${aktif ? "scale-105" : "scale-100"}`}
                        style={{
                          color: aktif ? "var(--tema-accent)" : "rgba(30, 41, 59, 0.70)",
                          strokeWidth: aktif ? 2.3 : 1.85
                        }}
                      />
                      <span
                        className={`text-[10px] tracking-tight leading-none text-center whitespace-nowrap transition-all duration-200 ${aktif ? "font-semibold" : "font-medium"}`}
                        style={{
                          color: aktif ? "var(--tema-accent)" : "rgba(30, 41, 59, 0.70)"
                        }}
                      >
                        {item.id === "diger" && digerAcik ? "Kapat" : item.ad}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.nav>
        </div>

        <ExportButton 
          izinliProgramIdler={aktifProgram ? [aktifProgram.id] : []} 
          disaAktarAcik={disaAktarAcik} 
          onKapat={() => setDisaAktarAcik(false)} 
        />
      </div>
    </div>
  );
}

// ===== SINIFLAR =====
function SiniflarSekme({ programId, supabase, tema }: { programId: string, supabase: any, tema: string }) {
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [yeniAd, setYeniAd] = useState('')
  const [yeniDonem, setYeniDonem] = useState(() => guncelAkademikDonem())
  const [kaydediyor, setKaydediyor] = useState(false)
  const [arsivGoster, setArsivGoster] = useState(false)

  const [gecmisModalAcik, setGecmisModalAcik] = useState(false)
  const [secilenArsivSinif, setSecilenArsivSinif] = useState<any>(null)
  const [gecmisNotlar, setGecmisNotlar] = useState<any[]>([])
  const [gecmisYoklamalar, setGecmisYoklamalar] = useState<any[]>([])
  const [gecmisYukleniyor, setGecmisYukleniyor] = useState(false)
  const [gecmisSekme, setGecmisSekme] = useState<'notlar' | 'yoklamalar'>('notlar')

  async function yukle() {
    if (!programId) return
    setYukleniyor(true)
    let query = supabase.from('siniflar').select('*').eq('program_id', programId).order('ad')

    if (arsivGoster) {
      query = query.eq('arsivlendi', true)
    } else {
      query = query.or('arsivlendi.eq.false,arsivlendi.is.null')
    }

    const { data } = await query
    setSiniflar(data || [])
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [programId, arsivGoster])

  async function sinifEkle() {
    if (!yeniAd.trim()) return
    setKaydediyor(true)
    await supabase.from('siniflar').insert({
      program_id: programId,
      ad: yeniAd.trim(),
      donem: yeniDonem.trim() || guncelAkademikDonem()
    })
    setYeniAd('')
    setYeniDonem('')
    setModalAcik(false)
    setKaydediyor(false)
    yukle()
  }

  function sinifSil(id: string) {
    toast('Bu sınıf silinecek', {
      description: 'Bu işlem geri alınamaz.',
      action: {
        label: 'Sil',
        onClick: async () => {
          await supabase.from('siniflar').delete().eq('id', id)
          toast.success('Sınıf silindi')
          yukle()
        },
      },
      cancel: { label: 'Vazgeç', onClick: () => {} },
    })
  }

  function sinifArsivle(id: string) {
    toast('Bu sınıf arşive kaldırılacak', {
      description: 'Sınıf ve bağlı verileri salt okunur olarak geçmişe taşınacak.',
      action: {
        label: 'Arşivle',
        onClick: async () => {
          await supabase.from('siniflar').update({ arsivlendi: true }).eq('id', id)
          toast.success('Sınıf başarıyla arşivlendi!')
          yukle()
        },
      },
      cancel: { label: 'Vazgeç', onClick: () => {} },
    })
  }

  function sinifArsivdenCikar(id: string) {
    toast('Bu sınıf arşivden çıkarılacak', {
      description: 'Sınıf tekrar aktif hale gelecek.',
      action: {
        label: 'Aktif Et',
        onClick: async () => {
          await supabase.from('siniflar').update({ arsivlendi: false }).eq('id', id)
          toast.success('Sınıf başarıyla aktif edildi!')
          yukle()
        },
      },
      cancel: { label: 'Vazgeç', onClick: () => {} },
    })
  }

  function sonrakiDonemBilgisi(s: any): { yeniDonem: string, yeniYariyil: string } {
    const yariyil = s.yariyil === 'bahar' ? 'bahar' : 'guz'
    if (yariyil === 'guz') {
      return { yeniDonem: s.donem, yeniYariyil: 'bahar' }
    }
    const eslesme = s.donem?.match(/(\d{4})/)
    const baslangicYili = eslesme ? parseInt(eslesme[1], 10) : new Date().getFullYear()
    return { yeniDonem: `${baslangicYili + 1}-${baslangicYili + 2}`, yeniYariyil: 'guz' }
  }

  async function sinifiYeniDonemeGecir(s: any) {
    const { yeniDonem, yeniYariyil } = sonrakiDonemBilgisi(s)
    const { data: yeniSinif, error: olusturmaHata } = await supabase
      .from('siniflar')
      .insert({ program_id: programId, ad: s.ad, donem: yeniDonem, yariyil: yeniYariyil, arsivlendi: false })
      .select()
      .single()

    if (olusturmaHata || !yeniSinif) {
      toast.error('Yeni sınıf oluşturulamadı: ' + (olusturmaHata?.message || 'bilinmeyen hata'))
      return false
    }

    const { error: tasimaHata } = await supabase
      .from('ogrenciler')
      .update({ sinif_id: yeniSinif.id })
      .eq('sinif_id', s.id)
      .eq('aktif', true)

    if (tasimaHata) {
      toast.error('Öğrenciler taşınamadı: ' + tasimaHata.message)
      return false
    }

    const { error: arsivHata } = await supabase
      .from('siniflar')
      .update({ arsivlendi: true })
      .eq('id', s.id)

    if (arsivHata) {
      toast.error('Eski sınıf arşivlenemedi: ' + arsivHata.message)
      return false
    }

    return true
  }

  function yeniDonemeGecisBaslat(s: any) {
    toast(`"${s.ad}" yeni döneme geçirilecek`, {
      description: 'Eski sınıf tüm ders/yoklama/not/ödev kayıtlarıyla arşive kaldırılacak. Aynı isimle boş bir yeni sınıf açılacak, aktif öğrenciler oraya taşınacak. Bu işlem geri alınamaz.',
      action: {
        label: 'Yeni Döneme Geçir',
        onClick: async () => {
          const basarili = await sinifiYeniDonemeGecir(s)
          if (basarili) {
            toast.success(`"${s.ad}" yeni döneme geçirildi!`)
            yukle()
          }
        },
      },
      cancel: { label: 'Vazgeç', onClick: () => {} },
    })
  }

  async function tumSiniflariYeniDonemeGecir() {
    setYukleniyor(true)
    let basariliSayisi = 0
    for (const s of siniflar) {
      const basarili = await sinifiYeniDonemeGecir(s)
      if (basarili) basariliSayisi++
    }
    toast.success(`${basariliSayisi} / ${siniflar.length} sınıf yeni döneme geçirildi`)
    yukle()
  }

  function tumSiniflariYeniDonemeGecisBaslat() {
    toast(`Bu programdaki TÜM sınıflar (${siniflar.length}) yeni döneme geçirilecek`, {
      description: 'Her sınıf ayrı ayrı arşivlenecek, aynı isimlerle boş yeni sınıflar açılacak, aktif öğrenciler taşınacak.',
      action: {
        label: 'Hepsini Geçir',
        onClick: tumSiniflariYeniDonemeGecir,
      },
      cancel: { label: 'Vazgeç', onClick: () => {} },
    })
  }

  async function gecmisiIncele(s: any) {
    setSecilenArsivSinif(s)
    setGecmisModalAcik(true)
    setGecmisYukleniyor(true)
    setGecmisSekme('notlar')

    const { data: dersData } = await supabase.from('dersler').select('id, ad').eq('sinif_id', s.id)
    const dersIdleri = dersData?.map((d: any) => d.id) || []

    if (dersIdleri.length === 0) {
      setGecmisNotlar([])
      setGecmisYoklamalar([])
      setGecmisYukleniyor(false)
      return
    }

    const { data: nData } = await supabase.from('notlar').select('*').in('ders_id', dersIdleri).order('tarih', { ascending: false })
    const { data: yData } = await supabase.from('yoklamalar').select('*').in('ders_id', dersIdleri).order('tarih', { ascending: false })

    const ogrIdleri = new Set<string>()
    nData?.forEach((n: any) => ogrIdleri.add(n.ogrenci_id))
    yData?.forEach((y: any) => ogrIdleri.add(y.ogrenci_id))
    
    if (ogrIdleri.size > 0) {
      const { data: ogrData } = await supabase.from('ogrenciler').select('id, numara, kullanici_id').in('id', Array.from(ogrIdleri))
      const kullIdleri = ogrData?.map((o: any) => o.kullanici_id).filter(Boolean) || []
      const { data: kullData } = await supabase.from('kullanicilar').select('id, ad, soyad').in('id', kullIdleri)

      const zenginNotlar = (nData || []).map((n: any) => {
        const ders = dersData?.find((d: any) => d.id === n.ders_id)
        const ogrenci = ogrData?.find((o: any) => o.id === n.ogrenci_id)
        const kullanici = kullData?.find((k: any) => k.id === ogrenci?.kullanici_id)
        return {
          ...n,
          dersAd: ders?.ad || '-',
          ogrenciNo: ogrenci?.numara || '-',
          ogrenciAdSoyad: kullanici ? `${kullanici.ad} ${kullanici.soyad}` : 'Silinmiş Öğrenci'
        }
      })

      const zenginYoklamalar = (yData || []).map((y: any) => {
        const ders = dersData?.find((d: any) => d.id === y.ders_id)
        const ogrenci = ogrData?.find((o: any) => o.id === y.ogrenci_id)
        const kullanici = kullData?.find((k: any) => k.id === ogrenci?.kullanici_id)
        return {
          ...y,
          dersAd: ders?.ad || '-',
          ogrenciNo: ogrenci?.numara || '-',
          ogrenciAdSoyad: kullanici ? `${kullanici.ad} ${kullanici.soyad}` : 'Silinmiş Öğrenci'
        }
      })

      setGecmisNotlar(zenginNotlar)
      setGecmisYoklamalar(zenginYoklamalar)
    } else {
      setGecmisNotlar([])
      setGecmisYoklamalar([])
    }
    setGecmisYukleniyor(false)
  }

  const durumRozet = (durum: string) => {
    switch(durum) {
      case 'katildi': return 'bg-green-100 text-green-700'
      case 'katilmadi': return 'bg-red-100 text-red-700'
      case 'gec': return 'bg-yellow-100 text-yellow-700'
      case 'izinli': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const durumEtiket = (durum: string) => {
    switch(durum) {
      case 'katildi': return 'Katıldı'
      case 'katilmadi': return 'Katılmadı'
      case 'gec': return 'Geç'
      case 'izinli': return 'İzinli'
      default: return durum
    }
  }

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div>
      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <p className={ui.cardTitle}>
            {arsivGoster ? 'Arşivlenen Sınıflar' : 'Sınıflar'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setArsivGoster(!arsivGoster)}
              className="glass-btn-secondary"
            >
              {arsivGoster ? 'Aktif Sınıflar' : 'Arşivlenenleri Gör'}
            </button>
            

            {!arsivGoster && (
              <button
                onClick={() => setModalAcik(true)}
                className="glass-btn-primary"
              >
                + Sınıf Ekle
              </button>
            )}
            {!arsivGoster && siniflar.length > 0 && (
              <button
                onClick={tumSiniflariYeniDonemeGecisBaslat}
                className="glass-btn-secondary"
              >
                Tüm Sınıfları Yeni Döneme Geçir
              </button>
            )}
          </div>
        </div>

        {siniflar.length === 0 ? (
          <div className={ui.cardEmpty}>
            {arsivGoster ? 'Arşivlenmiş sınıf bulunmuyor.' : 'Henüz sınıf eklenmemiş veya tümü arşivlenmiş.'}
          </div>
          ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={ui.tableHead}>
              <tr>
                <th className={`${ui.tableHeadCell} px-4 py-3`}>Sınıf Adı</th>
                <th className={`${ui.tableHeadCell} px-4 py-3`}>Dönem</th>
                <th className={`${ui.tableHeadCell} px-4 py-3`}>İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {siniflar.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.ad}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {s.donem} {s.yariyil === 'bahar' ? 'Bahar' : 'Güz'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 flex-wrap">
                      {!arsivGoster ? (
                        <>
                          <button
                            onClick={() => yeniDonemeGecisBaslat(s)}
                            className={tema === 'esma' ? "text-[#a53860] text-xs font-medium hover:text-[#a53860]/80" : "text-green-600 text-xs font-medium hover:text-green-800"}
                          >
                            Yeni Döneme Geçir
                          </button>
                          <button
                            onClick={() => sinifArsivle(s.id)}
                            className="text-blue-600 text-xs font-medium hover:text-blue-800"
                          >
                            Arşivle
                          </button>
                          <button
                            onClick={() => sinifSil(s.id)}
                            className={ui.btnDanger}
                          >
                            Sil
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => gecmisiIncele(s)}
                            className="text-[#a53860] text-xs font-medium hover:underline"
                          >
                            Geçmişi İncele
                          </button>
                          <button
                            onClick={() => sinifArsivdenCikar(s.id)}
                            className={tema === 'esma' ? "text-[#a53860] text-xs font-medium hover:text-[#a53860]/80" : "text-green-600 text-xs font-medium hover:text-green-800"}
                          >
                            Çıkar
                          </button>
                          <button
                            onClick={() => sinifSil(s.id)}
                            className={ui.btnDanger}
                          >
                            Sil
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* GEÇMİŞİ İNCELE MODAL'I */}
      <AnimatePresence>
        {gecmisModalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={`${ui.modalCard} w-full max-w-5xl h-[85vh] flex flex-col`}
            >
              <div className={`${ui.modalHeader} shrink-0 flex items-center justify-between`}>
                <p className={ui.modalTitle}>
                  {secilenArsivSinif?.ad} <span className="text-sm font-normal text-gray-500 ml-2">Arşiv Kayıtları</span>
                </p>
                <button onClick={() => setGecmisModalAcik(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {gecmisYukleniyor ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Kayıtlar toplanıyor...</p>
                  </div>
                ) : (
                  <>
                    <div className="px-6 flex gap-1 border-b shrink-0 bg-gray-50 pt-2 overflow-x-auto">
                      <button
                        onClick={() => setGecmisSekme('notlar')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                          gecmisSekme === 'notlar' ? 'border-[#344e41] text-[#344e41]' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Geçmiş Notlar ({gecmisNotlar.length})
                      </button>
                      <button
                        onClick={() => setGecmisSekme('yoklamalar')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                          gecmisSekme === 'yoklamalar' ? 'border-[#344e41] text-[#344e41]' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Geçmiş Yoklamalar ({gecmisYoklamalar.length})
                      </button>
                    </div>

                    <div className="flex-1 overflow-auto p-6 bg-white">
                      {gecmisSekme === 'notlar' && (
                        gecmisNotlar.length === 0 ? <p className="text-center text-gray-400 mt-10">Bu sınıfa ait girilmiş not bulunmuyor.</p> : (
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 sticky top-0">
                              <tr>
                                <th className="py-3 px-4 font-medium border-b">Tarih</th>
                                <th className="py-3 px-4 font-medium border-b">Ders</th>
                                <th className="py-3 px-4 font-medium border-b">Başlık</th>
                                <th className="py-3 px-4 font-medium border-b">Öğrenci</th>
                                <th className="py-3 px-4 font-medium border-b text-right">Puan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {gecmisNotlar.map((n, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="py-3 px-4 text-gray-500">{new Date(n.tarih).toLocaleDateString('tr-TR')}</td>
                                  <td className="py-3 px-4">{n.dersAd}</td>
                                  <td className="py-3 px-4">{n.baslik}</td>
                                  <td className="py-3 px-4">#{n.ogrenciNo} {n.ogrenciAdSoyad}</td>
                                  <td className="py-3 px-4 text-right font-medium">{n.puan}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )
                      )}

                      {gecmisSekme === 'yoklamalar' && (
                        gecmisYoklamalar.length === 0 ? <p className="text-center text-gray-400 mt-10">Bu sınıfa ait yoklama kaydı bulunmuyor.</p> : (
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 sticky top-0">
                              <tr>
                                <th className="py-3 px-4 font-medium border-b">Tarih</th>
                                <th className="py-3 px-4 font-medium border-b">Ders</th>
                                <th className="py-3 px-4 font-medium border-b">Öğrenci</th>
                                <th className="py-3 px-4 font-medium border-b text-right">Durum</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {gecmisYoklamalar.map((y, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="py-3 px-4 text-gray-500">{new Date(y.tarih).toLocaleDateString('tr-TR')}</td>
                                  <td className="py-3 px-4">{y.dersAd}</td>
                                  <td className="py-3 px-4">#{y.ogrenciNo} {y.ogrenciAdSoyad}</td>
                                  <td className="py-3 px-4 text-right">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${durumRozet(y.durum)}`}>
                                      {durumEtiket(y.durum)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YENİ SINIF EKLE MODAL'I */}
      <AnimatePresence>
        {modalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Yeni Sınıf Ekle</p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <div>
                  <label className={ui.label}>Sınıf Adı</label>
                  <input
                    value={yeniAd}
                    onChange={(e) => setYeniAd(e.target.value)}
                    className={`${ui.select} w-full`}
                    placeholder="örn: Grup A, İleri Seviye..."
                  />
                </div>
                <div>
                  <label className={ui.label}>Dönem</label>
                  <input
                    value={yeniDonem}
                    onChange={(e) => setYeniDonem(e.target.value)}
                    className={`${ui.select} w-full`}
                    placeholder="örn: 2024-2025"
                  />
                </div>
              </div>
              <div className={ui.modalFooter}>
                <button
                  onClick={() => setModalAcik(false)}
                  className={`${ui.btnSecondary} flex-1`}
                >
                  İptal
                </button>
                <button
                  onClick={sinifEkle}
                  disabled={kaydediyor}
                  className="glass-btn-primary flex-1"
                >
                  {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}



// ===== ÖĞRENCİLER =====
function OgrencilerSekme({ programId, supabase, tema }: { programId: string, supabase: any, tema: string }) {
  const [ogrenciler, setOgrenciler] = useState<any[]>([])
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [ortalamalar, setOrtalamalar] = useState<Record<string, number | null>>({})
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [sorumlulukModalAcik, setSorumlulukModalAcik] = useState(false)
  const [sifreModalAcik, setSifreModalAcik] = useState(false)
  const [sifreHedefOgrenci, setSifreHedefOgrenci] = useState<any>(null)
  const [yeniSifreDegeri, setYeniSifreDegeri] = useState('')
  const [pasifGoster, setPasifGoster] = useState(false)
  const [secilenOgrenci, setSecilenOgrenci] = useState<any>(null)
  const [tumDersler, setTumDersler] = useState<any[]>([])
  const [secilenSorumlulukDers, setSecilenSorumlulukDers] = useState('')
  const [form, setForm] = useState({
    ad: '', soyad: '', email: '', telefon: '', sinif_id: '', sifre: ''
  })

  async function yukle() {
    if (!programId) return
    const { data: s } = await supabase.from('siniflar').select('*').eq('program_id', programId).order('ad')
    setSiniflar(s || [])
    const sinifIdleri = (s || []).map((sinif: any) => sinif.id)
    const aktifSinifIdleri = (s || []).filter((sinif: any) => !sinif.arsivlendi).map((sinif: any) => sinif.id)

    const { data: o } = sinifIdleri.length > 0
      ? await supabase.from('ogrenciler').select(`
          id, numara, aktif, kullanici_id,
          kullanicilar (ad, soyad, email, telefon, avatar_url),
          siniflar (ad),
          ders_sorumlulari (ders_id, dersler (ad))
        `).in('sinif_id', sinifIdleri).order('numara')
      : { data: [] }

    setOgrenciler(o || [])

    if (o && o.length > 0) {
      const ogrenciIdleri = o.map((og: any) => og.id)

      const { data: aktifDersler } = aktifSinifIdleri.length > 0
        ? await supabase.from('dersler').select('id').in('sinif_id', aktifSinifIdleri)
        : { data: [] }
      const aktifDersIdleri = (aktifDersler || []).map((d: any) => d.id)

      const devamPuanlari: Record<string, number> = { katildi: 100, gec: 0, izinli: 0, katilmadi: 0 }
      const yeniOrtalamalar: Record<string, number | null> = {}

      if (aktifDersIdleri.length === 0) {
        for (const id of ogrenciIdleri) yeniOrtalamalar[id] = null
      } else {
        const { data: tumNotlar } = await supabase.from('notlar').select('ogrenci_id, puan').in('ogrenci_id', ogrenciIdleri).in('ders_id', aktifDersIdleri)
        const { data: tumYoklamalar } = await supabase.from('yoklamalar').select('ogrenci_id, durum').in('ogrenci_id', ogrenciIdleri).in('ders_id', aktifDersIdleri)
        for (const id of ogrenciIdleri) {
          const notlariBu = (tumNotlar || []).filter((n: any) => n.ogrenci_id === id)
          const yoklamalariBu = (tumYoklamalar || []).filter((y: any) => y.ogrenci_id === id)
          const sinavOrt = notlariBu.length > 0 ? notlariBu.reduce((s: number, n: any) => s + n.puan, 0) / notlariBu.length : null
          const devamOrt = yoklamalariBu.length > 0 ? yoklamalariBu.reduce((s: number, y: any) => s + (devamPuanlari[y.durum] || 0), 0) / yoklamalariBu.length : null
          if (sinavOrt === null && devamOrt === null) yeniOrtalamalar[id] = null
          else if (sinavOrt === null) yeniOrtalamalar[id] = devamOrt
          else if (devamOrt === null) yeniOrtalamalar[id] = sinavOrt
          else yeniOrtalamalar[id] = sinavOrt * 0.5 + devamOrt * 0.5
        }
      }
      setOrtalamalar(yeniOrtalamalar)
    }

    const { data: td } = await supabase.from('dersler').select('id, ad, siniflar (ad)').in('sinif_id', sinifIdleri.length > 0 ? sinifIdleri : [''])
    setTumDersler(td || [])
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [programId])

  async function ogrenciEkle() {
    if (!form.ad || !form.email || !form.sinif_id || !form.sifre) { toast('Ad, email, sınıf ve şifre zorunlu!'); return }
    setKaydediyor(true)
    try {
      const sonNumara = ogrenciler.length > 0 ? Math.max(...ogrenciler.map(o => o.numara)) + 1 : 1
      const res = await fetch('/api/admin/kullanici-olustur', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.sifre, ad: form.ad, soyad: form.soyad, telefon: form.telefon, sinif_id: form.sinif_id })
      })

      let json: any = null
      try { json = await res.json() } catch { json = null }

      if (!res.ok || !json?.user) {
        toast.error('Kullanıcı oluşturulamadı: ' + (json?.error || `HTTP ${res.status}`))
        return
      }

      const { error: insertHata } = await supabase.from('ogrenciler').insert({ kullanici_id: json.user.id, sinif_id: form.sinif_id, numara: sonNumara, aktif: true })
      if (insertHata) {
        toast.error('Öğrenci kaydı oluşturulamadı: ' + insertHata.message)
        return
      }

      toast.success('Öğrenci başarıyla eklendi')
      setForm({ ad: '', soyad: '', email: '', telefon: '', sinif_id: '', sifre: '' })
      setModalAcik(false)
      yukle()
    } catch (err: any) {
      alert('Beklenmeyen hata: ' + JSON.stringify(err?.message || err))
    } finally {
      setKaydediyor(false)
    }
  }

  function ogrenciSil(ogrenci: any) {
    toast(`${ogrenci.kullanicilar?.ad} ${ogrenci.kullanicilar?.soyad} pasife alınacak`, {
      description: 'Veri silinmez, istenirse geri aktif edilebilir.',
      action: {
        label: 'Pasife Al',
        onClick: async () => {
          await supabase.from('ogrenciler').update({ aktif: false }).eq('id', ogrenci.id)
          toast.success(`${ogrenci.kullanicilar?.ad} pasife alındı`)
          yukle()
        },
      },
      cancel: {
        label: 'Vazgeç',
        onClick: () => {},
      },
    })
  }

  async function ogrenciAktifEt(ogrenci: any) {
    await supabase.from('ogrenciler').update({ aktif: true }).eq('id', ogrenci.id)
    yukle()
  }

  function ogrenciKaliciSil(ogrenci: any) {
    toast(`${ogrenci.kullanicilar?.ad} ${ogrenci.kullanicilar?.soyad} KALICI olarak silinecek`, {
      description: 'Bu işlem geri alınamaz! Tüm yoklama, not ve giriş bilgileri tamamen silinir.',
      action: {
        label: 'Kalıcı Sil',
        onClick: async () => {
          try {
            const res = await fetch('/api/admin/ogrenci-sil', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ogrenciId: ogrenci.id, kullaniciId: ogrenci.kullanici_id })
            })
            const json = await res.json()
            if (!res.ok) {
              toast.error('Silinemedi: ' + (json?.error || `HTTP ${res.status}`))
              return
            }
            toast.success('Öğrenci kalıcı olarak silindi')
            yukle()
          } catch (err: any) {
            toast.error('Beklenmeyen hata: ' + (err?.message || err))
          }
        },
      },
      cancel: { label: 'Vazgeç', onClick: () => {} },
    })
  }

  function sifreSifirlaAc(kullaniciId: string, ad: string) {
    setSifreHedefOgrenci({ kullaniciId, ad })
    setYeniSifreDegeri('')
    setSifreModalAcik(true)
  }

  async function sifreSifirlaKaydet() {
    if (!yeniSifreDegeri || yeniSifreDegeri.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı!')
      return
    }
    const res = await fetch('/api/admin/sifre-sifirla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: sifreHedefOgrenci.kullaniciId, password: yeniSifreDegeri }) })
    if (res.ok) {
      toast.success('Şifre değiştirildi!')
      setSifreModalAcik(false)
    } else {
      toast.error('Şifre değiştirilemedi')
    }
  }

  async function sorumlulukAta() {
    if (!secilenSorumlulukDers || !secilenOgrenci) return
    await supabase.from('ders_sorumlulari').upsert({ ogrenci_id: secilenOgrenci.id, ders_id: secilenSorumlulukDers })
    setSorumlulukModalAcik(false); setSecilenSorumlulukDers(''); yukle()
  }

  const ortalamaRenk = (ort: number | null) => {
    if (ort === null) return ui.badgeGray
    if (ort >= 85) return ui.badgeGreen
    if (ort >= 70) return ui.badgeBlue
    if (ort >= 50) return ui.badgeYellow
    return ui.badgeRed
  }

  if (yukleniyor) return (
    <div className="flex items-center justify-center py-20">
      <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${tema === 'esma' ? 'border-[#a53860]' : 'border-emerald-600'}`} />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <div>
            <p className={ui.cardTitle}>Öğrenciler</p>
            <p className="text-xs text-gray-400 mt-0.5">{ogrenciler.filter(o => o.aktif).length} kayıtlı öğrenci</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPasifGoster(!pasifGoster)}
              className="glass-btn-secondary"
            >
              {pasifGoster ? 'Aktif Öğrenciler' : `Pasif Öğrenciler (${ogrenciler.filter(o => !o.aktif).length})`}
            </button>
            <button onClick={() => setModalAcik(true)} className="glass-btn-primary">
              + Öğrenci Ekle
            </button>
          </div>
        </div>

        {ogrenciler.length === 0 ? (
          <div className={ui.cardEmpty}>Henüz öğrenci eklenmemiş</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={ui.tableHead}>
                  <th className={`${ui.tableHeadCell} px-6 py-3`}>#</th>
                  <th className={`${ui.tableHeadCell} px-6 py-3`}>Ad Soyad</th>
                  <th className={`${ui.tableHeadCell} px-6 py-3 hidden md:table-cell`}>Email</th>
                  <th className={`${ui.tableHeadCell} px-6 py-3 hidden md:table-cell`}>Sınıf</th>
                  <th className={`${ui.tableHeadCell} px-6 py-3`}>Ort.</th>
                  <th className={`${ui.tableHeadCell} px-6 py-3`}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ogrenciler.filter((o) => pasifGoster ? !o.aktif : o.aktif).map((o) => (
                  <tr key={o.id} className={`hover:bg-gray-50/50 transition-colors ${!o.aktif ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 text-xs text-gray-400 font-mono">#{o.numara}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        {o.kullanicilar?.avatar_url ? (
                          <img src={o.kullanicilar.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-semibold shrink-0">
                            {(o.kullanicilar?.ad?.[0] || '') + (o.kullanicilar?.soyad?.[0] || '')}
                          </div>
                        )}
                        <div>
                      <p className="text-sm font-medium text-gray-900">{o.kullanicilar?.ad} {o.kullanicilar?.soyad}</p>
                      {o.ders_sorumlulari?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {o.ders_sorumlulari.map((ds: any) => (
                            <span key={ds.ders_id} className={ui.badgePurple}>{ds.dersler?.ad}</span>
                          ))}
                        </div>
                      )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-400">{o.kullanicilar?.email}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className={ui.badgeGray}>{o.siniflar?.ad || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={ortalamaRenk(ortalamalar[o.id])}>
                        {ortalamalar[o.id] !== null && ortalamalar[o.id] !== undefined
                          ? ortalamalar[o.id]!.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 justify-end flex-wrap">
                        {o.aktif ? (
                          <>
                            <button onClick={() => { setSecilenOgrenci(o); setSorumlulukModalAcik(true) }} className={ui.btnGhost}>Sorumluluk</button>
                            <button onClick={() => sifreSifirlaAc(o.kullanici_id, `${o.kullanicilar?.ad}`)} className={ui.btnGhost}>Şifre</button>
                            <button onClick={() => ogrenciSil(o)} className={ui.btnDanger}>Pasife Al</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => ogrenciAktifEt(o)} className={tema === 'esma' ? "text-[#a53860] text-xs font-medium hover:text-[#a53860]/80" : "text-green-600 text-xs font-medium hover:text-green-800"}>Aktif Et</button>
                            <button onClick={() => ogrenciKaliciSil(o)} className={ui.btnDanger}>Kalıcı Sil</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Öğrenci Ekle Modal */}
      <AnimatePresence>
        {modalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Yeni Öğrenci</p>
              </div>
              {siniflar.length === 0 ? (
                <div className={ui.modalBody}>
                  <p className="text-sm text-amber-600">Önce bir sınıf oluşturman lazım!</p>
                </div>
              ) : (
                <div className={`${ui.modalBody} space-y-3`}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={ui.label}>Ad</label>
                      <input value={form.ad} onChange={(e) => setForm({...form, ad: e.target.value})} className={`${ui.select} w-full`} placeholder="Ad" />
                    </div>
                    <div>
                      <label className={ui.label}>Soyad</label>
                      <input value={form.soyad} onChange={(e) => setForm({...form, soyad: e.target.value})} className={`${ui.select} w-full`} placeholder="Soyad" />
                    </div>
                  </div>
                  <div>
                    <label className={ui.label}>Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className={`${ui.select} w-full`} placeholder="ornek@mail.com" />
                  </div>
                  <div>
                    <label className={ui.label}>Telefon</label>
                    <input value={form.telefon} onChange={(e) => setForm({...form, telefon: e.target.value})} className={`${ui.select} w-full`} placeholder="05xx xxx xx xx" />
                  </div>
                  <div>
                    <label className={ui.label}>Sınıf</label>
                    <select value={form.sinif_id} onChange={(e) => setForm({...form, sinif_id: e.target.value})} className={`${ui.select} w-full`}>
                      <option value="">Sınıf seç...</option>
                      {siniflar.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={ui.label}>Geçici Şifre</label>
                    <input type="password" value={form.sifre} onChange={(e) => setForm({...form, sifre: e.target.value})} className={`${ui.select} w-full`} placeholder="En az 6 karakter" />
                  </div>
                </div>
              )}
              <div className={ui.modalFooter}>
                <button onClick={() => setModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>İptal</button>
                {siniflar.length > 0 && (
                  <button onClick={ogrenciEkle} disabled={kaydediyor} className="glass-btn-primary flex-1">
                    {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sorumluluk Modal */}
      <AnimatePresence>
        {sorumlulukModalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Sorumluluk Ata</p>
                <p className="text-xs text-gray-400 mt-0.5">{secilenOgrenci?.kullanicilar?.ad} {secilenOgrenci?.kullanicilar?.soyad}</p>
              </div>
              <div className={ui.modalBody}>
                <div>
                  <label className={ui.label}>Ders Seç</label>
                  <select value={secilenSorumlulukDers} onChange={(e) => setSecilenSorumlulukDers(e.target.value)} className={`${ui.select} w-full`}>
                    <option value="">Ders seç...</option>
                    {tumDersler.map((d) => <option key={d.id} value={d.id}>{d.ad} — {d.siniflar?.ad}</option>)}
                  </select>
                </div>
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setSorumlulukModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>İptal</button>
                <button onClick={sorumlulukAta} disabled={!secilenSorumlulukDers} className="glass-btn-primary flex-1">Ata</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Şifre Değiştir Modal */}
      <AnimatePresence>
        {sifreModalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Şifre Değiştir</p>
                <p className="text-xs text-gray-400 mt-0.5">{sifreHedefOgrenci?.ad}</p>
              </div>
              <div className={ui.modalBody}>
                <div>
                  <label className={ui.label}>Yeni Şifre</label>
                  <input
                    type="password"
                    value={yeniSifreDegeri}
                    onChange={(e) => setYeniSifreDegeri(e.target.value)}
                    className={`${ui.select} w-full`}
                    placeholder="En az 6 karakter"
                  />
                </div>
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setSifreModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>İptal</button>
                <button onClick={sifreSifirlaKaydet} className="glass-btn-primary flex-1">Kaydet</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== DERSLER =====
function DerslerSekme({ programId, supabase, kullanici }: { programId: string, supabase: any, kullanici: any }) {
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [secilenSinif, setSecilenSinif] = useState<any>(null)
  const [dersler, setDersler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [form, setForm] = useState({
    ad: '', aciklama: '', gun: '', saat: '', periyot: 'haftalik', baslangic_tarihi: ''
  })

  const [iptalModalAcik, setIptalModalAcik] = useState(false)
  const [iptalDersi, setIptalDersi] = useState<any>(null)
  const [iptalGerekce, setIptalGerekce] = useState('')
  const [iptalTarih, setIptalTarih] = useState(new Date().toISOString().split('T')[0])

  const [telafiModalAcik, setTelafiModalAcik] = useState(false)
  const [telafiDersi, setTelafiDersi] = useState<any>(null)
  const [telafiTarih, setTelafiTarih] = useState(new Date().toISOString().split('T')[0])
  const [telafiSaat, setTelafiSaat] = useState('')

  async function siniflarıYukle() {
    if (!programId) return
    const { data } = await supabase
      .from('siniflar')
      .select('*')
      .eq('program_id', programId)
      .order('ad')
    setSiniflar(data || [])
    if (data && data.length > 0) setSecilenSinif(data[0])
    setYukleniyor(false)
  }

  async function dersleriYukle(sinifId: string) {
    const { data } = await supabase
      .from('dersler')
      .select(`
        *,
        ogretmen_dersleri (
          kullanicilar (ad, soyad)
        )
      `)
      .eq('sinif_id', sinifId)
      .order('gun')
    setDersler(data || [])
  }

  useEffect(() => { siniflarıYukle() }, [programId])
  useEffect(() => { if (secilenSinif) dersleriYukle(secilenSinif.id) }, [secilenSinif])

  async function dersEkle() {
    if (!form.ad || !form.gun || !form.saat) {
      toast('Ders adı, gün ve saat zorunlu!')
      return
    }
    if (form.periyot !== 'haftalik' && !form.baslangic_tarihi) {
      toast('Haftalık olmayan dersler için başlangıç tarihi seçmen lazım!')
      return
    }
    setKaydediyor(true)
    await supabase.from('dersler').insert({
      sinif_id: secilenSinif.id,
      ad: form.ad,
      aciklama: form.aciklama,
      gun: form.gun,
      saat: form.saat,
      periyot: form.periyot,
      baslangic_tarihi: form.periyot !== 'haftalik' ? form.baslangic_tarihi : null,
      aktif: true
    })
    setForm({ ad: '', aciklama: '', gun: '', saat: '', periyot: 'haftalik', baslangic_tarihi: '' })
    setModalAcik(false)
    setKaydediyor(false)
    dersleriYukle(secilenSinif.id)
  }

  function dersSil(id: string) {
    toast('Bu ders silinecek', {
      description: 'Bu işlem geri alınamaz.',
      action: {
        label: 'Sil',
        onClick: async () => {
          await supabase.from('dersler').delete().eq('id', id)
          toast.success('Ders silindi')
          dersleriYukle(secilenSinif.id)
        },
      },
      cancel: { label: 'Vazgeç', onClick: () => {} },
    })
  }

  async function iptalKaydet() {
    if (!iptalGerekce.trim()) { toast('Gerekçe yazman lazım!'); return }
    await supabase.from('ders_oturumlari').insert({
      ders_id: iptalDersi.id,
      tarih: iptalTarih,
      durum: 'iptal',
      iptal_gerekce: iptalGerekce.trim()
    })

    await supabase.from('duyurular').insert({
      program_id: programId,
      baslik: `Ders İptali: ${iptalDersi.ad}`,
      icerik: `${iptalDersi.ad} dersi ${new Date(iptalTarih).toLocaleDateString('tr-TR')} tarihinde iptal edilmiştir.\n\nGerekçe: ${iptalGerekce.trim()}`,
      yayinlayan_id: kullanici.id
    })

    setIptalGerekce('')
    setIptalModalAcik(false)
    toast('Ders iptali kaydedildi ve duyuru yapıldı!')
  }

  async function telafiKaydet() {
    if (!telafiSaat) { toast('Saat seçmen lazım!'); return }
    await supabase.from('ders_oturumlari').insert({
      ders_id: telafiDersi.id,
      tarih: telafiTarih,
      durum: 'ek_ders',
      gerceklesen_saat: telafiSaat
    })
    setTelafiSaat('')
    setTelafiModalAcik(false)
    toast('Telafi dersi eklendi!')
  }

  const gunler = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
  const periyotlar = [
    { value: 'haftalik', label: 'Her hafta' },
    { value: '2haftada1', label: '2 haftada bir' },
    { value: '3haftada1', label: '3 haftada bir' },
    { value: 'ayda1', label: 'Ayda bir' },
  ]

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div>
      {siniflar.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-amber-600">
          Önce Sınıflar sekmesinden bir sınıf oluştur!
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {siniflar.map((s) => (
              <button
                key={s.id}
                onClick={() => setSecilenSinif(s)}
                className={secilenSinif?.id === s.id ? 'glass-btn-primary shrink-0' : 'glass-btn-secondary shrink-0'}
              >
                {s.ad}
              </button>
            ))}
          </div>

          <div className={ui.card}>
            <div className={ui.cardHeader}>
              <p className={ui.cardTitle}>
                {secilenSinif?.ad} — Dersler
              </p>
              <button
                onClick={() => setModalAcik(true)}
                className="glass-btn-primary"
              >
                + Ders Ekle
              </button>
            </div>

            {dersler.length === 0 ? (
              <div className={ui.cardEmpty}>
                Bu sınıfa henüz ders eklenmemiş
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={ui.tableHead}>
                  <tr>
                    <th className={`${ui.tableHeadCell} px-4 py-3`}>Ders Adı</th>
                    <th className={`${ui.tableHeadCell} px-4 py-3`}>Gün</th>
                    <th className={`${ui.tableHeadCell} px-4 py-3`}>Saat</th>
                    <th className={`${ui.tableHeadCell} px-4 py-3`}>Periyot</th>
                    <th className={`${ui.tableHeadCell} px-4 py-3`}>Hoca</th>
                    <th className={`${ui.tableHeadCell} px-4 py-3`}>İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dersler.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{d.ad}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{d.gun}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{d.saat}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {periyotlar.find(p => p.value === d.periyot)?.label || d.periyot}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {d.ogretmen_dersleri?.[0]?.kullanicilar
                          ? `${d.ogretmen_dersleri[0].kullanicilar.ad} ${d.ogretmen_dersleri[0].kullanicilar.soyad}`
                          : <span className="text-amber-500">Atanmadı</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => { setIptalDersi(d); setIptalModalAcik(true) }}
                            className="text-amber-600 text-xs font-medium hover:text-amber-800"
                          >
                            İptal Et
                          </button>
                          <button
                            onClick={() => { setTelafiDersi(d); setTelafiModalAcik(true) }}
                            className="text-blue-600 text-xs font-medium hover:text-blue-800"
                          >
                            Telafi Ekle
                          </button>
                          <button
                            onClick={() => dersSil(d.id)}
                            className={ui.btnDanger}
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {modalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Yeni Ders Ekle</p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <div>
                  <label className={ui.label}>Ders Adı</label>
                  <input value={form.ad} onChange={(e) => setForm({...form, ad: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="örn: Kitap Müzakeresi" />
                </div>
                <div>
                  <label className={ui.label}>Açıklama (isteğe bağlı)</label>
                  <input value={form.aciklama} onChange={(e) => setForm({...form, aciklama: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="Kısa açıklama..." />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={ui.label}>Gün</label>
                    <select value={form.gun} onChange={(e) => setForm({...form, gun: e.target.value})}
                      className={`${ui.select} w-full`}>
                      <option value="">Seç...</option>
                      {gunler.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className={ui.label}>Saat</label>
                    <input type="time" value={form.saat} onChange={(e) => setForm({...form, saat: e.target.value})}
                      className={`${ui.select} w-full`} />
                  </div>
                </div>
                <div>
                  <label className={ui.label}>Periyot</label>
                  <select value={form.periyot} onChange={(e) => setForm({...form, periyot: e.target.value})}
                    className={`${ui.select} w-full`}>
                    {periyotlar.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                {form.periyot !== 'haftalik' && (
                  <div>
                    <label className={ui.label}>Başlangıç Tarihi (ilk ders günü)</label>
                    <input type="date" value={form.baslangic_tarihi} onChange={(e) => setForm({...form, baslangic_tarihi: e.target.value})}
                      className={`${ui.select} w-full`} />
                  </div>
                )}
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>
                  İptal
                </button>
                <button onClick={dersEkle} disabled={kaydediyor} className="glass-btn-primary flex-1">
                  {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {iptalModalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Ders İptal Et</p>
                <p className="text-sm text-gray-500 mt-0.5">{iptalDersi?.ad}</p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <div>
                  <label className={ui.label}>Tarih</label>
                  <input type="date" value={iptalTarih} onChange={(e) => setIptalTarih(e.target.value)}
                    className={`${ui.select} w-full`} />
                </div>
                <div>
                  <label className={ui.label}>Gerekçe</label>
                  <textarea value={iptalGerekce} onChange={(e) => setIptalGerekce(e.target.value)}
                    rows={3}
                    className={`${ui.select} w-full resize-none`}
                    placeholder="İptal nedeni..." />
                </div>
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setIptalModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>
                  İptal
                </button>
                <button onClick={iptalKaydet} className="flex-1 bg-amber-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-amber-700 transition active:scale-95">
                  Onayla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {telafiModalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Telafi Dersi Ekle</p>
                <p className="text-sm text-gray-500 mt-0.5">{telafiDersi?.ad}</p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <div>
                  <label className={ui.label}>Tarih</label>
                  <input type="date" value={telafiTarih} onChange={(e) => setTelafiTarih(e.target.value)}
                    className={`${ui.select} w-full`} />
                </div>
                <div>
                  <label className={ui.label}>Saat</label>
                  <input type="time" value={telafiSaat} onChange={(e) => setTelafiSaat(e.target.value)}
                    className={`${ui.select} w-full`} />
                </div>
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setTelafiModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>
                  İptal
                </button>
                <button onClick={telafiKaydet} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition active:scale-95">
                  Ekle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== HOCALAR =====
function HocalarSekme({ programId, supabase }: { programId: string, supabase: any }) {
  const [hocalar, setHocalar] = useState<any[]>([])
  const [dersler, setDersler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [dersModalAcik, setDersModalAcik] = useState(false)
  const [secilenHoca, setSecilenHoca] = useState<any>(null)
  const [secilenDers, setSecilenDers] = useState('')
  const [kaydediyor, setKaydediyor] = useState(false)
  const [form, setForm] = useState({
    ad: '', soyad: '', email: '', telefon: '', sifre: ''
  })

  async function yukle() {
    if (!programId) return
    const { data: tumOgretmenler } = await supabase
      .from('kullanicilar')
      .select(`
        *,
        ogretmen_dersleri (
          ders_id,
          dersler (ad, siniflar (ad, program_id))
        )
      `)
      .eq('rol', 'ogretmen')

    const h = (tumOgretmenler ?? [])
      .map((hoca: any) => {
        const tumDersleri = hoca.ogretmen_dersleri ?? []
        const buProgramDersleri = tumDersleri.filter((od: any) => od.dersler?.siniflar?.program_id === programId)
        return { ...hoca, ogretmen_dersleri: buProgramDersleri, _tumDersSayisi: tumDersleri.length }
      })
      .filter((hoca: any) => hoca._tumDersSayisi === 0 || hoca.ogretmen_dersleri.length > 0)

    const { data: d } = await supabase
      .from('dersler')
      .select('*, siniflar!inner (ad, program_id)')
      .eq('siniflar.program_id', programId)
    setHocalar(h)
    setDersler(d || [])
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [programId])

  async function hocaEkle() {
    if (!form.ad || !form.email || !form.sifre) {
      toast('Ad, email ve şifre zorunlu!')
      return
    }
    setKaydediyor(true)

    const res = await fetch('/api/admin/kullanici-olustur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.sifre,
        ad: form.ad,
        soyad: form.soyad,
        telefon: form.telefon,
        rol: 'ogretmen'
      })
    })

    const json = await res.json()
    if (!res.ok || !json.user) {
      toast.error('Hoca eklenemedi: ' + (json.error || 'Hata'))
      setKaydediyor(false)
      return
    }

    toast.success('Hoca başarıyla eklendi')
    setForm({ ad: '', soyad: '', email: '', telefon: '', sifre: '' })
    setModalAcik(false)
    setKaydediyor(false)
    yukle()
  }

  async function dersAta() {
    if (!secilenDers || !secilenHoca) return
    setKaydediyor(true)
    await supabase.from('ogretmen_dersleri').upsert({
      ogretmen_id: secilenHoca.id,
      ders_id: secilenDers
    })
    setDersModalAcik(false)
    setSecilenDers('')
    setKaydediyor(false)
    yukle()
  }

  async function dersKaldir(ogretmenId: string, dersId: string) {
    if (!confirm('Bu dersi hocadan kaldırmak istediğine emin misin?')) return
    await supabase.from('ogretmen_dersleri')
      .delete()
      .eq('ogretmen_id', ogretmenId)
      .eq('ders_id', dersId)
    yukle()
  }

  function hocaSil(id: string) {
    toast('Bu hoca silinecek', {
      description: 'Bu işlem geri alınamaz.',
      action: {
        label: 'Sil',
        onClick: async () => {
          await supabase.from('ogretmen_dersleri').delete().eq('ogretmen_id', id)
          await supabase.from('kullanicilar').delete().eq('id', id)
          toast.success('Hoca silindi')
          yukle()
        },
      },
      cancel: { label: 'Vazgeç', onClick: () => {} },
    })
  }

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div>
      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <p className={ui.cardTitle}>Hocalar</p>
          <button
            onClick={() => setModalAcik(true)}
            className="glass-btn-primary"
          >
            + Hoca Ekle
          </button>
        </div>

        {hocalar.length === 0 ? (
          <div className={ui.cardEmpty}>Henüz hoca eklenmemiş</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {hocalar.map((h) => (
              <div key={h.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-gray-800">{h.ad} {h.soyad}</p>
                    <p className="text-sm text-gray-500">{h.email}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => { setSecilenHoca(h); setDersModalAcik(true) }}
                      className={ui.btnGhost}
                    >
                      + Ders Ata
                    </button>
                    <button
                      onClick={() => hocaSil(h.id)}
                      className={ui.btnDanger}
                    >
                      Sil
                    </button>
                  </div>
                </div>
                {h.ogretmen_dersleri?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {h.ogretmen_dersleri.map((od: any) => (
                      <span key={od.ders_id} className={`${ui.badgeGray} flex items-center gap-1`}>
                        {od.dersler?.ad} — {od.dersler?.siniflar?.ad}
                        <button
                          onClick={() => dersKaldir(h.id, od.ders_id)}
                          className="text-red-400 hover:text-red-600 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Yeni Hoca Ekle</p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={ui.label}>Ad</label>
                    <input value={form.ad} onChange={(e) => setForm({...form, ad: e.target.value})}
                      className={`${ui.select} w-full`}
                      placeholder="Ad" />
                  </div>
                  <div className="flex-1">
                    <label className={ui.label}>Soyad</label>
                    <input value={form.soyad} onChange={(e) => setForm({...form, soyad: e.target.value})}
                      className={`${ui.select} w-full`}
                      placeholder="Soyad" />
                  </div>
                </div>
                <div>
                  <label className={ui.label}>Email</label>
                  <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="ornek@mail.com" />
                </div>
                <div>
                  <label className={ui.label}>Telefon</label>
                  <input value={form.telefon} onChange={(e) => setForm({...form, telefon: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="05xx xxx xx xx" />
                </div>
                <div>
                  <label className={ui.label}>Geçici Şifre</label>
                  <input type="password" value={form.sifre} onChange={(e) => setForm({...form, sifre: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="En az 6 karakter" />
                </div>
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>
                  İptal
                </button>
                <button onClick={hocaEkle} disabled={kaydediyor} className="glass-btn-primary flex-1">
                  {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dersModalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Ders Ata</p>
                <p className="text-sm text-gray-500 mt-0.5">{secilenHoca?.ad} {secilenHoca?.soyad}</p>
              </div>
              <div className={ui.modalBody}>
                <label className={ui.label}>Ders Seç</label>
                <select value={secilenDers} onChange={(e) => setSecilenDers(e.target.value)}
                  className={`${ui.select} w-full`}>
                  <option value="">Ders seç...</option>
                  {dersler.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.ad} — {d.siniflar?.ad}
                    </option>
                  ))}
                </select>
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setDersModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>
                  İptal
                </button>
                <button onClick={dersAta} disabled={kaydediyor || !secilenDers} className="glass-btn-primary flex-1">
                  {kaydediyor ? 'Atanıyor...' : 'Ata'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
// ===== YOKLAMA =====
function YoklamaSekmesi({ programId, supabase, kullanici, tema }: { programId: string, supabase: any, kullanici: any, tema: string }) {
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [dersler, setDersler] = useState<any[]>([])
  const [ogrenciler, setOgrenciler] = useState<any[]>([])
  const [secilenSinif, setSecilenSinif] = useState<any>(null)
  const [secilenDers, setSecilenDers] = useState<any>(null)
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0])
  const [yoklamalar, setYoklamalar] = useState<Record<string, string>>({})
  const [mevcutYoklamalar, setMevcutYoklamalar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediyor, setKaydediyor] = useState(false)

  async function siniflarıYukle() {
    if (!programId) return
    const { data } = await supabase
      .from('siniflar')
      .select('*')
      .eq('program_id', programId)
      .order('ad')
    setSiniflar(data || [])
    if (data && data.length > 0) setSecilenSinif(data[0])
    setYukleniyor(false)
  }

  async function dersleriYukle(sinifId: string) {
    const { data } = await supabase
      .from('dersler')
      .select('*')
      .eq('sinif_id', sinifId)
      .eq('aktif', true)
      .order('gun')
    setDersler(data || [])
    setSecilenDers(data?.[0] || null)
  }

  async function ogrencileriYukle(sinifId: string) {
    const { data } = await supabase
      .from('ogrenciler')
      .select('id, numara, kullanicilar (ad, soyad)')
      .eq('sinif_id', sinifId)
      .eq('aktif', true)
      .order('numara')
    setOgrenciler(data || [])
  }

  async function mevcutYoklamalariYukle(dersId: string, tarih: string) {
    const { data } = await supabase
      .from('yoklamalar')
      .select('*')
      .eq('ders_id', dersId)
      .eq('tarih', tarih)
    setMevcutYoklamalar(data || [])

    const map: Record<string, string> = {}
    ;(data || []).forEach((y: any) => {
      map[y.ogrenci_id] = y.durum
    })
    setYoklamalar(map)
  }

  useEffect(() => { siniflarıYukle() }, [programId])
  useEffect(() => {
    if (secilenSinif) {
      dersleriYukle(secilenSinif.id)
      ogrencileriYukle(secilenSinif.id)
    }
  }, [secilenSinif])
  useEffect(() => {
    if (secilenDers && tarih) mevcutYoklamalariYukle(secilenDers.id, tarih)
  }, [secilenDers, tarih])

  function durumSec(ogrenciId: string, durum: string) {
    setYoklamalar(prev => ({ ...prev, [ogrenciId]: durum }))
  }

  async function kaydet() {
    if (!secilenDers) return
    setKaydediyor(true)

    const isAdmin = ['super_admin', 'program_admin'].includes(kullanici?.rol)

    for (const ogrenci of ogrenciler) {
      const durum = yoklamalar[ogrenci.id]
      if (!durum) continue

      const mevcutVar = mevcutYoklamalar.find(y => y.ogrenci_id === ogrenci.id)

      if (mevcutVar && !isAdmin) {
        toast(`${ogrenci.kullanicilar?.ad} için yoklama zaten girilmiş. Sadece admin değiştirebilir.`)
        continue
      }

      if (mevcutVar) {
        await supabase.from('yoklamalar')
          .update({ durum })
          .eq('id', mevcutVar.id)
      } else {
        await supabase.from('yoklamalar').insert({
          ogrenci_id: ogrenci.id,
          ders_id: secilenDers.id,
          tarih,
          durum
        })
      }
    }

    await mevcutYoklamalariYukle(secilenDers.id, tarih)
    setKaydediyor(false)
    toast('Yoklama kaydedildi!')
  }

  const durumlar = [
    { value: 'katildi', label: 'Katıldı', renk: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'katilmadi', label: 'Katılmadı', renk: 'bg-red-100 text-red-700 border-red-300' },
    { value: 'gec', label: 'Geç', renk: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'izinli', label: 'İzinli', renk: 'bg-blue-100 text-blue-700 border-blue-300' },
  ]

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div className="space-y-4">
      <div className={`${ui.card} p-4 flex flex-wrap gap-4`}>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sınıf</label>
          <select
            value={secilenSinif?.id || ''}
            onChange={(e) => {
              const s = siniflar.find(s => s.id === e.target.value)
              setSecilenSinif(s)
            }}
            className={ui.select}
          >
            {siniflar.map(s => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ders</label>
          <select
            value={secilenDers?.id || ''}
            onChange={(e) => {
              const d = dersler.find(d => d.id === e.target.value)
              setSecilenDers(d)
            }}
            className={ui.select}
          >
            {dersler.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tarih</label>
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            className={ui.select}
          />
        </div>
      </div>

      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <p className={ui.cardTitle}>
            {secilenDers?.ad || 'Ders seç'} — {tarih}
          </p>
          <button
            onClick={kaydet}
            disabled={kaydediyor || ogrenciler.length === 0}
            className="glass-btn-primary"
          >
            {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        {ogrenciler.length === 0 ? (
          <div className={ui.cardEmpty}>Bu sınıfta öğrenci yok</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {ogrenciler.map((o) => (
              <div key={o.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    #{o.numara} {o.kullanicilar?.ad} {o.kullanicilar?.soyad}
                  </span>
                  {mevcutYoklamalar.find(y => y.ogrenci_id === o.id) && (
                    <span className="ml-2 text-xs text-gray-400">kaydedildi</span>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {durumlar.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => durumSec(o.id, d.value)}
                      className={`text-xs px-2 py-1 rounded-lg border transition ${
                        yoklamalar[o.id] === d.value
                          ? d.renk + ' font-medium'
                          : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== NOTLAR =====
function NotlarSekmesi({ programId, supabase }: { programId: string, supabase: any }) {
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [dersler, setDersler] = useState<any[]>([])
  const [ogrenciler, setOgrenciler] = useState<any[]>([])
  const [sinavlar, setSinavlar] = useState<any[]>([])
  const [secilenSinif, setSecilenSinif] = useState<any>(null)
  const [secilenDers, setSecilenDers] = useState<any>(null)
  const [secilenSinav, setSecilenSinav] = useState<any>(null)
  const [notlar, setNotlar] = useState<Record<string, string>>({})
  const [gecmisNotlar, setGecmisNotlar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [sekme, setSekme] = useState<'sinavlar' | 'not_giris' | 'gecmis'>('sinavlar')
  const [sinavModalAcik, setSinavModalAcik] = useState(false)
  const [sinavForm, setSinavForm] = useState({ baslik: '', tarih: '', saat: '', konum: '', aciklama: '' })
  const [kullaniciId, setKullaniciId] = useState<string>('')

  async function siniflarıYukle() {
    if (!programId) return
    const { data } = await supabase.from('siniflar').select('*').eq('program_id', programId).order('ad')
    setSiniflar(data || [])
    if (data && data.length > 0) setSecilenSinif(data[0])

    const { data: { user } } = await supabase.auth.getUser()
    if (user) setKullaniciId(user.id)

    setYukleniyor(false)
  }

  async function dersleriYukle(sinifId: string) {
    const { data } = await supabase.from('dersler').select('*').eq('sinif_id', sinifId).order('ad')
    setDersler(data || [])
    setSecilenDers(data?.[0] || null)
  }

  async function ogrencileriYukle(sinifId: string) {
    const { data } = await supabase
      .from('ogrenciler')
      .select('id, numara, kullanici_id')
      .eq('sinif_id', sinifId)
      .eq('aktif', true)
      .order('numara')

    if (data && data.length > 0) {
      const ids = data.map((o: any) => o.kullanici_id)
      const { data: kull } = await supabase.from('kullanicilar').select('id, ad, soyad').in('id', ids)
      setOgrenciler(data.map((o: any) => ({
        ...o,
        kullanicilar: kull?.find((k: any) => k.id === o.kullanici_id)
      })))
    } else {
      setOgrenciler([])
    }
    setNotlar({})
  }

  async function sinavlariYukle(dersId: string) {
    const { data } = await supabase
      .from('sinavlar')
      .select('*')
      .eq('ders_id', dersId)
      .order('tarih', { ascending: false })
    setSinavlar(data || [])
  }

  async function gecmisNotlariYukle(dersId: string) {
    const { data } = await supabase
      .from('notlar')
      .select('*, sinavlar (baslik, tarih)')
      .eq('ders_id', dersId)
      .order('olusturulma_tarihi', { ascending: false })

    if (data && data.length > 0) {
      const ogrenciIds = [...new Set(data.map((n: any) => n.ogrenci_id).filter(Boolean))]
      const { data: ogr } = await supabase.from('ogrenciler').select('id, numara, kullanici_id').in('id', ogrenciIds)

      const kullaniciIds = [...new Set((ogr || []).map((o: any) => o.kullanici_id).filter(Boolean))]
      const { data: kull } = await supabase.from('kullanicilar').select('id, ad, soyad').in('id', kullaniciIds)

      setGecmisNotlar(data.map((n: any) => {
        const ogrenci = ogr?.find((o: any) => o.id === n.ogrenci_id)
        const kullanici = kull?.find((k: any) => k.id === ogrenci?.kullanici_id)
        return {
          ...n,
          ogrenciler: { numara: ogrenci?.numara, kullanicilar: kullanici }
        }
      }))
    } else {
      setGecmisNotlar([])
    }
  }

  useEffect(() => { siniflarıYukle() }, [programId])
  useEffect(() => {
    if (secilenSinif) { dersleriYukle(secilenSinif.id); ogrencileriYukle(secilenSinif.id) }
  }, [secilenSinif])
  useEffect(() => {
    if (secilenDers) { sinavlariYukle(secilenDers.id); gecmisNotlariYukle(secilenDers.id) }
  }, [secilenDers])

  async function sinavEkle() {
    if (!sinavForm.baslik || !sinavForm.tarih) { toast('Başlık ve tarih zorunlu!'); return }
    setKaydediyor(true)

    await supabase.from('sinavlar').insert({
      ders_id: secilenDers.id,
      baslik: sinavForm.baslik,
      tarih: sinavForm.tarih,
      saat: sinavForm.saat || null,
      konum: sinavForm.konum || null,
      aciklama: sinavForm.aciklama || null,
      olusturan_id: kullaniciId
    })

    const duyuruIcerik = `${secilenDers.ad} dersi için sınav duyurusu:\n\nBaşlık: ${sinavForm.baslik}\nTarih: ${new Date(sinavForm.tarih).toLocaleDateString('tr-TR')}${sinavForm.saat ? '\nSaat: ' + sinavForm.saat : ''}${sinavForm.konum ? '\nKonum: ' + sinavForm.konum : ''}${sinavForm.aciklama ? '\n\nAçıklama: ' + sinavForm.aciklama : ''}`

    await supabase.from('duyurular').insert({
      program_id: programId,
      baslik: `Sınav Duyurusu: ${sinavForm.baslik}`,
      icerik: duyuruIcerik,
      yayinlayan_id: kullaniciId
    })

    setSinavForm({ baslik: '', tarih: '', saat: '', konum: '', aciklama: '' })
    setSinavModalAcik(false)
    setKaydediyor(false)
    sinavlariYukle(secilenDers.id)
    toast('Sınav eklendi ve duyuru yapıldı!')
  }

  async function notKaydet() {
    if (!secilenSinav) { toast('Önce bir sınav seç!'); return }
    setKaydediyor(true)
    for (const o of ogrenciler) {
      const puan = notlar[o.id]
      if (!puan && puan !== '0') continue
      await supabase.from('notlar').insert({
        ogrenci_id: o.id,
        ders_id: secilenDers.id,
        sinav_id: secilenSinav.id,
        baslik: secilenSinav.baslik,
        puan: parseFloat(puan),
        tarih: secilenSinav.tarih
      })
    }
    setNotlar({})
    setKaydediyor(false)
    gecmisNotlariYukle(secilenDers.id)
    toast('Notlar kaydedildi!')
  }

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div className="space-y-4">
      <div className={`${ui.card} p-4 flex flex-wrap gap-4`}>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sınıf</label>
          <select value={secilenSinif?.id || ''} onChange={(e) => setSecilenSinif(siniflar.find(s => s.id === e.target.value))}
            className={ui.select}>
            {siniflar.map(s => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ders</label>
          <select value={secilenDers?.id || ''} onChange={(e) => { setSecilenDers(dersler.find(d => d.id === e.target.value)); setSecilenSinav(null) }}
            className={ui.select}>
            {dersler.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'sinavlar', ad: 'Sınavlar' },
          { id: 'not_giris', ad: 'Not Girişi' },
          { id: 'gecmis', ad: 'Geçmiş Notlar' },
        ].map(s => (
          <button key={s.id} onClick={() => setSekme(s.id as any)}
            className={sekme === s.id ? 'glass-btn-primary' : 'glass-btn-secondary'}>
            {s.ad}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={sekme}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16 }}
        >
          {sekme === 'sinavlar' && (
            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <p className={ui.cardTitle}>Sınavlar</p>
                <button onClick={() => setSinavModalAcik(true)} className="glass-btn-primary">
                  + Sınav Ekle
                </button>
              </div>
              {sinavlar.length === 0 ? (
                <div className={ui.cardEmpty}>Henüz sınav eklenmemiş</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sinavlar.map((s) => (
                    <div key={s.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800">{s.baslik}</p>
                        <span className="text-xs text-gray-400">{new Date(s.tarih).toLocaleDateString('tr-TR')}</span>
                      </div>
                      {s.saat && <p className="text-sm text-gray-500 mt-1">Saat: {s.saat}</p>}
                      {s.konum && <p className="text-sm text-gray-500">Konum: {s.konum}</p>}
                      {s.aciklama && <p className="text-sm text-gray-400 mt-1">{s.aciklama}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sekme === 'not_giris' && (
            <div className={ui.card}>
              <div className="p-4 border-b border-gray-100">
                <p className={`${ui.cardTitle} mb-3`}>Not Girişi</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className={ui.label}>Sınav Seç</label>
                    <select value={secilenSinav?.id || ''} onChange={(e) => setSecilenSinav(sinavlar.find(s => s.id === e.target.value))}
                      className={`${ui.select} w-full`}>
                      <option value="">Sınav seç...</option>
                      {sinavlar.map(s => <option key={s.id} value={s.id}>{s.baslik} — {new Date(s.tarih).toLocaleDateString('tr-TR')}</option>)}
                    </select>
                  </div>
                  <button onClick={notKaydet} disabled={kaydediyor || !secilenSinav} className="glass-btn-primary mt-4">
                    {kaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>
              {ogrenciler.length === 0 ? (
                <div className={ui.cardEmpty}>Bu sınıfta öğrenci yok</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {ogrenciler.map((o) => (
                    <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">
                        #{o.numara} {o.kullanicilar?.ad} {o.kullanicilar?.soyad}
                      </span>
                      <input type="number" min="0" max="100"
                        value={notlar[o.id] || ''}
                        onChange={(e) => setNotlar(prev => ({ ...prev, [o.id]: e.target.value }))}
                        className={`${ui.select} w-20 text-center`}
                        placeholder="—" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sekme === 'gecmis' && (
            gecmisNotlar.length === 0 ? (
              <div className={ui.card}>
                <div className={ui.cardEmpty}>Henüz not girilmemiş</div>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const gruplu = gecmisNotlar.reduce((acc: any, n: any) => {
                    const key = n.sinav_id || n.baslik
                    if (!acc[key]) acc[key] = { baslik: n.baslik, tarih: n.tarih, notlar: [] }
                    acc[key].notlar.push(n)
                    return acc
                  }, {})
                  return Object.values(gruplu).map((grup: any) => (
                    <div key={grup.baslik + grup.tarih} className={ui.card}>
                      <div className={ui.cardHeader}>
                        <p className={ui.cardTitle}>{grup.baslik}</p>
                        <span className="text-xs text-gray-400">{grup.tarih}</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {grup.notlar.map((n: any) => (
                          <div key={n.id} className="px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-gray-700">
                             {n.ogrenciler?.kullanicilar?.ad} {n.ogrenciler?.kullanicilar?.soyad}
                            </span>
                            <span className="text-sm font-medium text-gray-800">{n.puan}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {sinavModalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Sınav Ekle</p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <div>
                  <label className={ui.label}>Başlık</label>
                  <input value={sinavForm.baslik} onChange={(e) => setSinavForm({...sinavForm, baslik: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="örn: 1. Dönem Sınavı" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={ui.label}>Tarih</label>
                    <input type="date" value={sinavForm.tarih} onChange={(e) => setSinavForm({...sinavForm, tarih: e.target.value})}
                      className={`${ui.select} w-full`} />
                  </div>
                  <div className="flex-1">
                    <label className={ui.label}>Saat</label>
                    <input type="time" value={sinavForm.saat} onChange={(e) => setSinavForm({...sinavForm, saat: e.target.value})}
                      className={`${ui.select} w-full`} />
                  </div>
                </div>
                <div>
                  <label className={ui.label}>Konum</label>
                  <input value={sinavForm.konum} onChange={(e) => setSinavForm({...sinavForm, konum: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="örn: Dershane, Online..." />
                </div>
                <div>
                  <label className={ui.label}>Açıklama (isteğe bağlı)</label>
                  <textarea value={sinavForm.aciklama} onChange={(e) => setSinavForm({...sinavForm, aciklama: e.target.value})}
                    rows={3}
                    className={`${ui.select} w-full resize-none`}
                    placeholder="Sınav hakkında ek bilgi..." />
                </div>
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setSinavModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>
                  İptal
                </button>
                <button onClick={sinavEkle} disabled={kaydediyor} className="glass-btn-primary flex-1">
                  {kaydediyor ? 'Ekleniyor...' : 'Ekle ve Duyur'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== ÖDEVLER =====
function OdevlerSekmesi({ programId, supabase }: { programId: string, supabase: any }) {
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [dersler, setDersler] = useState<any[]>([])
  const [odevler, setOdevler] = useState<any[]>([])
  const [secilenSinif, setSecilenSinif] = useState<any>(null)
  const [secilenDers, setSecilenDers] = useState<any>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [odevModalAcik, setOdevModalAcik] = useState(false)
  const [teslimModalAcik, setTeslimModalAcik] = useState(false)
  const [aktifOdev, setAktifOdev] = useState<any>(null)
  const [teslimler, setTeslimler] = useState<any[]>([])
  const [teslimYukleniyor, setTeslimYukleniyor] = useState(false)
  const [puanlar, setPuanlar] = useState<Record<string, string>>({})
  const [odevForm, setOdevForm] = useState({ baslik: '', tur: 'kitap_muzakeresi', donem: '', son_teslim_tarihi: '', aciklama: '' })
  const [kullaniciId, setKullaniciId] = useState<string>('')

  async function siniflarıYukle() {
    if (!programId) return
    const { data } = await supabase.from('siniflar').select('*').eq('program_id', programId).order('ad')
    setSiniflar(data || [])
    if (data && data.length > 0) setSecilenSinif(data[0])

    const { data: { user } } = await supabase.auth.getUser()
    if (user) setKullaniciId(user.id)

    setYukleniyor(false)
  }

  async function dersleriYukle(sinifId: string) {
    const { data } = await supabase.from('dersler').select('*').eq('sinif_id', sinifId).order('ad')
    setDersler(data || [])
    setSecilenDers(data?.[0] || null)
  }

  async function odevleriYukle(dersId: string) {
    const { data } = await supabase
      .from('odevler')
      .select('*')
      .eq('ders_id', dersId)
      .order('son_teslim_tarihi', { ascending: false })
    setOdevler(data || [])
  }

  useEffect(() => { siniflarıYukle() }, [programId])
  useEffect(() => {
    if (secilenSinif) { dersleriYukle(secilenSinif.id) }
  }, [secilenSinif])
  useEffect(() => {
    if (secilenDers) { odevleriYukle(secilenDers.id) }
  }, [secilenDers])

  async function odevEkle() {
    if (!odevForm.baslik || !odevForm.donem) { toast('Başlık ve dönem zorunlu!'); return }
    if (!secilenDers) { toast('Önce bir ders seç!'); return }
    setKaydediyor(true)

    const { error } = await supabase.from('odevler').insert({
      program_id: programId,
      ders_id: secilenDers.id,
      baslik: odevForm.baslik,
      tur: odevForm.tur,
      donem: odevForm.donem,
      son_teslim_tarihi: odevForm.son_teslim_tarihi || null,
      aciklama: odevForm.aciklama || null,
      olusturan_id: kullaniciId
    })

    if (error) {
      toast.error('Ödev eklenemedi: ' + error.message)
      setKaydediyor(false)
      return
    }

    const turAdi = odevForm.tur === 'kitap_muzakeresi' ? 'Kitap Müzakeresi' : odevForm.tur === 'makale' ? 'Makale' : 'Ödev'
    const duyuruIcerik = `${secilenDers.ad} dersi için ${turAdi.toLowerCase()} duyurusu:\n\nBaşlık: ${odevForm.baslik}\nDönem: ${odevForm.donem}${odevForm.son_teslim_tarihi ? '\nSon Teslim: ' + new Date(odevForm.son_teslim_tarihi).toLocaleDateString('tr-TR') : ''}${odevForm.aciklama ? '\n\nAçıklama: ' + odevForm.aciklama : ''}`

    await supabase.from('duyurular').insert({
      program_id: programId,
      baslik: `${turAdi} Duyurusu: ${odevForm.baslik}`,
      icerik: duyuruIcerik,
      yayinlayan_id: kullaniciId
    })

    setOdevForm({ baslik: '', tur: 'kitap_muzakeresi', donem: '', son_teslim_tarihi: '', aciklama: '' })
    setOdevModalAcik(false)
    setKaydediyor(false)
    odevleriYukle(secilenDers.id)
    toast.success('Ödev eklendi ve duyuru yapıldı!')
  }

  async function teslimleriAc(odev: any) {
    setAktifOdev(odev)
    setTeslimModalAcik(true)
    setTeslimYukleniyor(true)

    const { data: teslimData } = await supabase
      .from('odev_teslimleri')
      .select('*')
      .eq('odev_id', odev.id)
      .order('teslim_tarihi', { ascending: false })

    if (teslimData && teslimData.length > 0) {
      const ogrenciIds = [...new Set(teslimData.map((t: any) => t.ogrenci_id))]
      const { data: ogr } = await supabase.from('ogrenciler').select('id, numara, kullanici_id').in('id', ogrenciIds)
      const kullaniciIds = [...new Set((ogr || []).map((o: any) => o.kullanici_id))]
      const { data: kull } = await supabase.from('kullanicilar').select('id, ad, soyad').in('id', kullaniciIds)

      const { data: notData } = await supabase
        .from('notlar')
        .select('*')
        .eq('odev_id', odev.id)

      const zenginTeslim = teslimData.map((t: any) => {
        const ogrenci = ogr?.find((o: any) => o.id === t.ogrenci_id)
        const kullanici = kull?.find((k: any) => k.id === ogrenci?.kullanici_id)
        const mevcutNot = notData?.find((n: any) => n.ogrenci_id === t.ogrenci_id)
        return {
          ...t,
          ogrenciAdi: `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`,
          ogrenciNo: ogrenci?.numara,
          mevcutPuan: mevcutNot?.puan
        }
      })
      setTeslimler(zenginTeslim)

      const baslangicPuanlar: Record<string, string> = {}
      zenginTeslim.forEach((t: any) => {
        if (t.mevcutPuan !== undefined) baslangicPuanlar[t.ogrenci_id] = String(t.mevcutPuan)
      })
      setPuanlar(baslangicPuanlar)
    } else {
      setTeslimler([])
    }
    setTeslimYukleniyor(false)
  }

  async function notuKaydet(ogrenciId: string, dersId: string) {
    const puan = puanlar[ogrenciId]
    if (!puan) { toast('Önce bir puan gir!'); return }

    const { data: mevcut } = await supabase
      .from('notlar')
      .select('id')
      .eq('ogrenci_id', ogrenciId)
      .eq('odev_id', aktifOdev.id)
      .maybeSingle()

    if (mevcut) {
      await supabase.from('notlar').update({ puan: parseFloat(puan) }).eq('id', mevcut.id)
    } else {
      await supabase.from('notlar').insert({
        ogrenci_id: ogrenciId,
        ders_id: dersId,
        odev_id: aktifOdev.id,
        baslik: aktifOdev.baslik,
        puan: parseFloat(puan),
        tarih: aktifOdev.son_teslim_tarihi || new Date().toISOString().slice(0, 10)
      })
    }
    toast.success('Not kaydedildi!')
  }

  function odevSil(id: string) {
    toast('Bu ödev silinecek', {
      description: 'Bu işlem geri alınamaz.',
      action: {
        label: 'Sil',
        onClick: async () => {
          const { error } = await supabase.from('odevler').delete().eq('id', id)
          if (error) { toast.error('Silinemedi: ' + error.message); return }
          toast.success('Ödev silindi')
          odevleriYukle(secilenDers.id)
        },
      },
      cancel: { label: 'Vazgeç', onClick: () => {} },
    })
  }

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div className="space-y-4">
      <div className={`${ui.card} p-4 flex flex-wrap gap-4`}>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sınıf</label>
          <select value={secilenSinif?.id || ''} onChange={(e) => setSecilenSinif(siniflar.find(s => s.id === e.target.value))}
            className={ui.select}>
            {siniflar.map(s => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ders</label>
          <select value={secilenDers?.id || ''} onChange={(e) => setSecilenDers(dersler.find(d => d.id === e.target.value))}
            className={ui.select}>
            {dersler.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
          </select>
        </div>
      </div>

      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <p className={ui.cardTitle}>Ödevler {secilenDers ? `— ${secilenDers.ad}` : ''}</p>
          <button onClick={() => setOdevModalAcik(true)} disabled={!secilenDers} className="glass-btn-primary disabled:opacity-50">
            + Ödev Ekle
          </button>
        </div>
        {!secilenDers ? (
          <div className={ui.cardEmpty}>Önce bir ders seç</div>
        ) : odevler.length === 0 ? (
          <div className={ui.cardEmpty}>Henüz ödev eklenmemiş</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {odevler.map((o) => (
              <div key={o.id} className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{o.baslik}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {o.tur === 'kitap_muzakeresi' ? 'Kitap Müzakeresi' : o.tur === 'makale' ? 'Makale' : 'Diğer'} · {o.donem}
                  </p>
                  {o.son_teslim_tarihi && (
                    <p className={`text-xs mt-1 ${new Date(o.son_teslim_tarihi) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      {new Date(o.son_teslim_tarihi) < new Date() ? '⚠ Süresi geçti — ' : ''}
                      Son teslim: {new Date(o.son_teslim_tarihi).toLocaleDateString('tr-TR')}
                    </p>
                  )}
                  {o.aciklama && <p className="text-sm text-gray-400 mt-1">{o.aciklama}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => teslimleriAc(o)} className={ui.btnGhost}>
                    Teslimler
                  </button>
                  <button onClick={() => odevSil(o.id)} className={ui.btnDanger}>
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {odevModalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Ödev Ekle</p>
                <p className="text-xs text-gray-400 mt-0.5">{secilenDers?.ad}</p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <div>
                  <label className={ui.label}>Başlık</label>
                  <input value={odevForm.baslik} onChange={(e) => setOdevForm({...odevForm, baslik: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="örn: Siyer Kitabı Müzakeresi" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={ui.label}>Tür</label>
                    <select value={odevForm.tur} onChange={(e) => setOdevForm({...odevForm, tur: e.target.value})}
                      className={`${ui.select} w-full`}>
                      <option value="kitap_muzakeresi">Kitap Müzakeresi</option>
                      <option value="makale">Makale</option>
                      <option value="diger">Diğer</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className={ui.label}>Dönem</label>
                    <input value={odevForm.donem} onChange={(e) => setOdevForm({...odevForm, donem: e.target.value})}
                      className={`${ui.select} w-full`}
                      placeholder="örn: 2025-2026 Güz" />
                  </div>
                </div>
                <div>
                  <label className={ui.label}>Son Teslim Tarihi (isteğe bağlı)</label>
                  <input type="date" value={odevForm.son_teslim_tarihi} onChange={(e) => setOdevForm({...odevForm, son_teslim_tarihi: e.target.value})}
                    className={`${ui.select} w-full`} />
                </div>
                <div>
                  <label className={ui.label}>Açıklama (isteğe bağlı)</label>
                  <textarea value={odevForm.aciklama} onChange={(e) => setOdevForm({...odevForm, aciklama: e.target.value})}
                    rows={3}
                    className={`${ui.select} w-full resize-none`}
                    placeholder="Ödev hakkında ek bilgi..." />
                </div>
              </div>
              <div className={ui.modalFooter}>
                <button onClick={() => setOdevModalAcik(false)} className={`${ui.btnSecondary} flex-1`}>
                  İptal
                </button>
                <button onClick={odevEkle} disabled={kaydediyor} className="glass-btn-primary flex-1">
                  {kaydediyor ? 'Ekleniyor...' : 'Ekle ve Duyur'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teslimModalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={`${ui.modalCard} max-w-2xl max-h-[85vh] overflow-y-auto`}
            >
              <div className={ui.modalHeader}>
                <div className="flex items-center justify-between">
                  <p className={ui.modalTitle}>{aktifOdev?.baslik} — Teslimler</p>
                  <button onClick={() => setTeslimModalAcik(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
              </div>

              <div className={ui.modalBody}>
                {teslimYukleniyor ? (
                  <p className="text-gray-500">Yükleniyor...</p>
                ) : teslimler.length === 0 ? (
                  <p className="text-gray-500">Henüz teslim yok.</p>
                ) : (
                  <div className="space-y-4">
                    {teslimler.map((t) => (
                      <div key={t.ogrenci_id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{t.ogrenciAdi}</p>
                            <p className="text-sm text-gray-500">No: {t.ogrenciNo}</p>
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(t.teslim_tarihi).toLocaleDateString('tr-TR')}
                          </p>
                        </div>

                        <details className="mb-3">
                          <summary className="cursor-pointer text-sm text-[#344e41]">Metni görüntüle</summary>
                          <div
                            className="prose prose-sm max-w-none mt-2 border-t pt-2"
                            dangerouslySetInnerHTML={{ __html: t.icerik_html || '' }}
                          />
                        </details>

                        <a
                          href={`/api/odev-export-docx?id=${t.id}`}
                          className={`${ui.btnGhost} mb-3 inline-block`}
                        >
                          Dosyayı indir (.docx)
                        </a>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className={`${ui.select} w-24`}
                            placeholder="Puan"
                            value={puanlar[t.ogrenci_id] || ''}
                            onChange={(e) =>
                              setPuanlar((prev) => ({ ...prev, [t.ogrenci_id]: e.target.value }))
                            }
                          />
                          <button
                            onClick={() => notuKaydet(t.ogrenci_id, t.ders_id)}
                            className="glass-btn-primary"
                          >
                            Kaydet
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== DUYURULAR =====
function DuyurularSekmesi({ programId, supabase, kullanici }: { programId: string, supabase: any, kullanici: any }) {
  const [duyurular, setDuyurular] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [ogrenciler, setOgrenciler] = useState<any[]>([])
  const [form, setForm] = useState({ baslik: '', icerik: '', hedefTipi: 'tumu', hedefSinifId: '', hedefKullaniciId: '' })

  async function yukle() {
    if (!programId) return
    const { data } = await supabase
      .from('duyurular')
      .select('*, kullanicilar!duyurular_yayinlayan_id_fkey (ad, soyad)')
      .eq('program_id', programId)
      .order('olusturulma_tarihi', { ascending: false })
    setDuyurular(data || [])
    setYukleniyor(false)
  }

  async function secenekleriYukle() {
  const { data: sinifData } = await supabase
    .from('siniflar')
    .select('id, ad')
    .eq('program_id', programId)
  setSiniflar(sinifData || [])

  const sinifIdleri = (sinifData || []).map((s: any) => s.id)

  const { data: ogrenciData } = sinifIdleri.length > 0
    ? await supabase
        .from('ogrenciler')
        .select('id, kullanici_id, sinif_id, kullanicilar(ad, soyad)')
        .in('sinif_id', sinifIdleri)
        .eq('aktif', true)
    : { data: [] }
  setOgrenciler(ogrenciData || [])
}

  useEffect(() => { yukle() }, [programId])
  useEffect(() => { secenekleriYukle() }, [programId])
  

  async function duyuruEkle() {
    if (!form.baslik.trim() || !form.icerik.trim()) {
      toast('Başlık ve içerik zorunlu!')
      return
    }
    setKaydediyor(true)
    const { error: duyuruHata } = await supabase.from('duyurular').insert({
      program_id: programId,
      baslik: form.baslik.trim(),
      icerik: form.icerik.trim(),
      yayinlayan_id: kullanici.id,
      hedef_tipi: form.hedefTipi,
      hedef_sinif_id: form.hedefTipi === 'sinif' ? form.hedefSinifId : null,
      hedef_kullanici_id: form.hedefTipi === 'ogrenci' ? form.hedefKullaniciId : null,
    })

    if (duyuruHata) {
      toast.error('Duyuru kaydedilemedi: ' + duyuruHata.message)
      setKaydediyor(false)
      return
    }

    toast.success('Duyuru yayınlandı')

    fetch('/api/duyuru-mail-gonder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baslik: form.baslik.trim(),
        icerik: form.icerik.trim(),
        hedefTipi: form.hedefTipi,
        hedefSinifId: form.hedefSinifId,
        hedefKullaniciId: form.hedefKullaniciId,
        programId,
      }),
    }).catch((err) => console.error('Mail gönderme isteği başarısız:', err))

    setForm({ baslik: '', icerik: '', hedefTipi: 'tumu', hedefSinifId: '', hedefKullaniciId: '' })
    setModalAcik(false)
    setKaydediyor(false)
    yukle()
  }

  function duyuruSil(id: string) {
    toast('Bu duyuru silinecek', {
      description: 'Bu işlem geri alınamaz.',
      action: {
        label: 'Sil',
        onClick: async () => {
          await supabase.from('duyurular').delete().eq('id', id)
          toast.success('Duyuru silindi')
          yukle()
        },
      },
      cancel: { label: 'Vazgeç', onClick: () => {} },
    })
  }

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div>
      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <p className={ui.cardTitle}>Duyurular</p>
          <button
            onClick={() => setModalAcik(true)}
            className="glass-btn-primary"
          >
            + Duyuru Ekle
          </button>
        </div>

        {duyurular.length === 0 ? (
          <div className={ui.cardEmpty}>Henüz duyuru eklenmemiş</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {duyurular.map((d) => (
              <div key={d.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800 mb-1">{d.baslik}</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{d.icerik}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {d.kullanicilar?.ad} {d.kullanicilar?.soyad} — {new Date(d.olusturulma_tarihi).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <button
                    onClick={() => duyuruSil(d.id)}
                    className={`${ui.btnDanger} shrink-0`}
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalAcik && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`${ui.modalOverlay} p-4`}>
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className={ui.modalCard}
            >
              <div className={ui.modalHeader}>
                <p className={ui.modalTitle}>Yeni Duyuru</p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <div>
                  <label className={ui.label}>Başlık</label>
                  <input
                    value={form.baslik}
                    onChange={(e) => setForm({...form, baslik: e.target.value})}
                    className={`${ui.select} w-full`}
                    placeholder="Duyuru başlığı..."
                  />
                </div>
                <div>
                  <label className={ui.label}>İçerik</label>
                  <textarea
                    value={form.icerik}
                    onChange={(e) => setForm({...form, icerik: e.target.value})}
                    rows={5}
                    className={`${ui.select} w-full resize-none`}
                    placeholder="Duyuru içeriği..."
                  />
                </div>
                <div>
                  <label className={ui.label}>Kime Gönderilsin?</label>
                  <select
                    value={form.hedefTipi}
                    onChange={(e) => setForm({...form, hedefTipi: e.target.value, hedefSinifId: '', hedefKullaniciId: ''})}
                    className={`${ui.select} w-full`}
                  >
                    <option value="tumu">Herkese</option>
                    <option value="sinif">Belirli Sınıf</option>
                    <option value="ogrenci">Belirli Öğrenci</option>
                  </select>
                </div>
                {form.hedefTipi === 'sinif' && (
                  <div>
                    <label className={ui.label}>Sınıf Seç</label>
                    <select
                      value={form.hedefSinifId}
                      onChange={(e) => setForm({...form, hedefSinifId: e.target.value})}
                      className={`${ui.select} w-full`}
                    >
                      <option value="">Seçiniz...</option>
                      {siniflar.map((s) => (
                        <option key={s.id} value={s.id}>{s.ad}</option>
                      ))}
                    </select>
                  </div>
                )}
                {form.hedefTipi === 'ogrenci' && (
                  <div>
                    <label className={ui.label}>Öğrenci Seç</label>
                    <select
                      value={form.hedefKullaniciId}
                      onChange={(e) => setForm({...form, hedefKullaniciId: e.target.value})}
                      className={`${ui.select} w-full`}
                    >
                      <option value="">Seçiniz...</option>
                      {ogrenciler.map((o) => (
                        <option key={o.id} value={o.kullanici_id}>{o.kullanicilar?.ad} {o.kullanicilar?.soyad}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className={ui.modalFooter}>
                <button
                  onClick={() => setModalAcik(false)}
                  className={`${ui.btnSecondary} flex-1`}
                >
                  İptal
                </button>
                <button
                  onClick={duyuruEkle}
                  disabled={kaydediyor}
                  className="glass-btn-primary flex-1"
                >
                  {kaydediyor ? 'Yayınlanıyor...' : 'Yayınla'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
// ===== GENEL BAKIŞ =====
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function GenelBakisSekmesi({ programId, supabase, tema }: { programId: string, supabase: any, tema: string }) {
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [dersler, setDersler] = useState<any[]>([])
  const [ogrenciler, setOgrenciler] = useState<any[]>([])
  const [yoklamalar, setYoklamalar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  const [gruplama, setGruplama] = useState<'sinif' | 'ogrenci' | 'ders'>('sinif')
  const [gorunum, setGorunum] = useState<'ozet' | 'detay'>('ozet')
  const [secilenOgrenciId, setSecilenOgrenciId] = useState('')
  const [secilenDersId, setSecilenDersId] = useState('')
  const [detayDersId, setDetayDersId] = useState('')

  useEffect(() => {
    async function yukle() {
      if (!programId) return
      setYukleniyor(true)

      const { data: s } = await supabase.from('siniflar').select('id, ad').eq('program_id', programId)
      setSiniflar(s || [])
      const sinifIdleri = (s || []).map((x: any) => x.id)
      if (sinifIdleri.length === 0) { setDersler([]); setOgrenciler([]); setYoklamalar([]); setYukleniyor(false); return }

      const { data: d } = await supabase.from('dersler').select('id, ad, sinif_id').in('sinif_id', sinifIdleri)
      setDersler(d || [])

      const { data: o } = await supabase
        .from('ogrenciler')
        .select('id, sinif_id, kullanicilar (ad, soyad)')
        .in('sinif_id', sinifIdleri)
        .eq('aktif', true)
      setOgrenciler(o || [])

      const dersIdleri = (d || []).map((x: any) => x.id)
      if (dersIdleri.length === 0) { setYoklamalar([]); setYukleniyor(false); return }

      const { data: y } = await supabase
        .from('yoklamalar')
        .select('ogrenci_id, durum, ders_id, tarih')
        .in('ders_id', dersIdleri)
        .order('tarih')
      setYoklamalar(y || [])
      setYukleniyor(false)
    }
    yukle()
    setGruplama('sinif'); setGorunum('ozet'); setSecilenOgrenciId(''); setSecilenDersId('')
  }, [programId])

  const detayRenkleri = { Katıldı: '#16a34a', Katılmadı: '#dc2626', Geç: '#ca8a04', İzinli: '#2563eb' }
  const cokluRenkler = ['#344e41', '#a53860', '#2563eb', '#ca8a04', '#7c3aed', '#0891b2', '#db2777', '#059669']
  const barRenk = tema === 'esma' ? '#a53860' : '#344e41'
  const tarihFormat = (t: any) => new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })

  function durumOranlariHesapla(kayitlar: any[], tarihler: string[]) {
    return tarihler.map((tarih) => {
      const buGun = kayitlar.filter((y: any) => y.tarih === tarih)
      const toplam = buGun.length
      const oran = (durum: string) => toplam > 0 ? Math.round((buGun.filter((y: any) => y.durum === durum).length / toplam) * 100) : 0
      return { tarih, Katıldı: oran('katildi'), Katılmadı: oran('katilmadi'), Geç: oran('gec'), İzinli: oran('izinli') }
    })
  }

  const yoklamaSinifli = yoklamalar.map((y: any) => {
    const ders = dersler.find((d: any) => d.id === y.ders_id)
    const sinif = siniflar.find((s: any) => s.id === ders?.sinif_id)
    return { ...y, sinifAd: sinif?.ad || 'Bilinmiyor' }
  })
  const sinifTarihleri = [...new Set(yoklamaSinifli.map((y: any) => y.tarih))].sort()

  const sinifOzetVeri = sinifTarihleri.map((tarih) => {
    const gun: any = { tarih }
    siniflar.forEach((sinif: any) => {
      const buGun = yoklamaSinifli.filter((y: any) => y.tarih === tarih && y.sinifAd === sinif.ad)
      const toplam = buGun.length
      const katilan = buGun.filter((y: any) => y.durum === 'katildi' || y.durum === 'gec').length
      if (toplam > 0) gun[sinif.ad] = Math.round((katilan / toplam) * 100)
    })
    return gun
  })
  const sinifDetayVeri = durumOranlariHesapla(yoklamaSinifli, sinifTarihleri)

  const secilenOgrenci = ogrenciler.find((o: any) => o.id === secilenOgrenciId)
  const ogrenciDersleri = secilenOgrenci ? dersler.filter((d: any) => d.sinif_id === secilenOgrenci.sinif_id) : []
  const ogrenciKayitlari = yoklamalar.filter((y: any) => y.ogrenci_id === secilenOgrenciId)

  const ogrenciDersVeri = ogrenciDersleri.map((d: any) => {
    const buDers = ogrenciKayitlari.filter((y: any) => y.ders_id === d.id)
    return {
      ad: d.ad,
      Devam: buDers.filter((y: any) => y.durum === 'katildi').length,
      'Geç Katıldı': buDers.filter((y: any) => y.durum === 'gec').length,
      Mazeret: buDers.filter((y: any) => y.durum === 'izinli').length,
      Katılmadı: buDers.filter((y: any) => y.durum === 'katilmadi').length,
    }
  })

  const ogrenciToplam = ogrenciKayitlari.length
  const ogrenciOzetYuzde = (durum: string) => ogrenciToplam > 0 ? Math.round((ogrenciKayitlari.filter((y: any) => y.durum === durum).length / ogrenciToplam) * 1000) / 10 : 0

  const dersKayitlari = yoklamalar.filter((y: any) => y.ders_id === secilenDersId)
  const dersTarihleri = [...new Set(dersKayitlari.map((y: any) => y.tarih))].sort()
  const dersOzetVeri = dersTarihleri.map((tarih) => {
    const buGun = dersKayitlari.filter((y: any) => y.tarih === tarih)
    const toplam = buGun.length
    const katilan = buGun.filter((y: any) => y.durum === 'katildi' || y.durum === 'gec').length
    return { tarih, oran: toplam > 0 ? Math.round((katilan / toplam) * 100) : 0 }
  })
  const dersOgrenciIdleri = [...new Set(dersKayitlari.map((y: any) => y.ogrenci_id))]
  const dersOgrenciListesi = ogrenciler.filter((o: any) => dersOgrenciIdleri.includes(o.id))
  const dersOgrenciVeri = dersTarihleri.map((tarih) => {
    const gun: any = { tarih }
    dersOgrenciListesi.forEach((o: any) => {
      const kayit = dersKayitlari.find((y: any) => y.tarih === tarih && y.ogrenci_id === o.id)
      if (kayit) {
        const puanlar: Record<string, number> = { katildi: 100, gec: 75, izinli: 50, katilmadi: 0 }
        gun[`${o.kullanicilar?.ad} ${o.kullanicilar?.soyad}`] = puanlar[kayit.durum]
      }
    })
    return gun
  })

  if (yukleniyor) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div className={`${ui.card} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className={ui.cardTitle}>Devam Trendi</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[{ id: 'sinif', ad: 'Sınıf' }, { id: 'ogrenci', ad: 'Öğrenci' }, { id: 'ders', ad: 'Ders' }].map((g) => (
              <button key={g.id} onClick={() => { setGruplama(g.id as any); setGorunum('ozet') }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${gruplama === g.id ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                {g.ad}
              </button>
            ))}
          </div>
          {gruplama !== 'ogrenci' && (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={() => setGorunum('ozet')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${gorunum === 'ozet' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                Özet
              </button>
              <button onClick={() => setGorunum('detay')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${gorunum === 'detay' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                Detaylı
              </button>
            </div>
          )}
        </div>
      </div>

      {gruplama === 'ogrenci' && (
        <select value={secilenOgrenciId} onChange={(e) => { setSecilenOgrenciId(e.target.value); setDetayDersId('') }}
          className={`${ui.select} mb-4`}>
          <option value="">Öğrenci seç...</option>
          {ogrenciler.map((o: any) => <option key={o.id} value={o.id}>{o.kullanicilar?.ad} {o.kullanicilar?.soyad}</option>)}
        </select>
      )}

      {gruplama === 'ders' && (
        <select value={secilenDersId} onChange={(e) => setSecilenDersId(e.target.value)}
          className={`${ui.select} mb-4`}>
          <option value="">Ders seç...</option>
          {dersler.map((d: any) => {
            const sinif = siniflar.find((s: any) => s.id === d.sinif_id)
            return <option key={d.id} value={d.id}>{d.ad} — {sinif?.ad}</option>
          })}
        </select>
      )}

      {gruplama === 'sinif' && (
        sinifTarihleri.length === 0 ? <div className={ui.cardEmpty}>Henüz veri yok</div> : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={gorunum === 'ozet' ? sinifOzetVeri : sinifDetayVeri}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tarih" tickFormatter={tarihFormat} fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip labelFormatter={tarihFormat} formatter={(v: any) => `%${v}`} />
              <Legend />
              {gorunum === 'ozet'
                ? siniflar.map((sinif: any, i: number) => (
                    <Line key={sinif.id} type="monotone" dataKey={sinif.ad} stroke={cokluRenkler[i % cokluRenkler.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))
                : Object.entries(detayRenkleri).map(([key, renk]) => (
                    <Line key={key} type="monotone" dataKey={key} stroke={renk} strokeWidth={2} dot={{ r: 3 }} />
                  ))
              }
            </LineChart>
          </ResponsiveContainer>
        )
      )}

      {gruplama === 'ogrenci' && (
        !secilenOgrenciId ? <div className={ui.cardEmpty}>Bir öğrenci seç</div> :
        ogrenciDersVeri.length === 0 ? <div className={ui.cardEmpty}>Bu öğrenci için veri yok</div> : (
          <>
            <p className="text-xs text-gray-500 mb-3">
              Toplam Ders Sayısı: {ogrenciToplam} — %{ogrenciOzetYuzde('katildi')} Devam, %{ogrenciOzetYuzde('gec')} Geç Katıldı, %{ogrenciOzetYuzde('izinli')} Mazeret, %{ogrenciOzetYuzde('katilmadi')} Katılmadı
            </p>
            <p className="text-xs text-gray-400 mb-2">Detay için bir derse tıkla</p>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={ogrenciDersVeri}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ad" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Devam" fill="#16a34a" radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(data: any) => setDetayDersId(ogrenciDersleri.find((d: any) => d.ad === data.ad)?.id || '')} />
                <Bar dataKey="Geç Katıldı" fill="#ca8a04" radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(data: any) => setDetayDersId(ogrenciDersleri.find((d: any) => d.ad === data.ad)?.id || '')} />
                <Bar dataKey="Mazeret" fill="#2563eb" radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(data: any) => setDetayDersId(ogrenciDersleri.find((d: any) => d.ad === data.ad)?.id || '')} />
                <Bar dataKey="Katılmadı" fill="#dc2626" radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(data: any) => setDetayDersId(ogrenciDersleri.find((d: any) => d.ad === data.ad)?.id || '')} />
              </BarChart>
            </ResponsiveContainer>

            {detayDersId && (() => {
              const dersAdi = ogrenciDersleri.find((d: any) => d.id === detayDersId)?.ad
              const kayitlar = ogrenciKayitlari
                .filter((y: any) => y.ders_id === detayDersId)
                .sort((a: any, b: any) => a.tarih.localeCompare(b.tarih))
              const durumEtiket: Record<string, { ad: string, renk: string }> = {
                katildi: { ad: 'Devam', renk: 'text-green-600' },
                gec: { ad: 'Geç Katıldı', renk: 'text-amber-600' },
                izinli: { ad: 'Mazeret', renk: 'text-blue-600' },
                katilmadi: { ad: 'Katılmadı', renk: 'text-red-600' },
              }
              return (
                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">{dersAdi} — Tarih Detayı</p>
                    <button onClick={() => setDetayDersId('')} className="text-xs text-gray-400 hover:text-gray-600">Kapat</button>
                  </div>
                  {kayitlar.length === 0 ? (
                    <p className="p-4 text-sm text-gray-400">Bu derse ait kayıt yok</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {kayitlar.map((k: any, i: number) => (
                        <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                          <span className="text-gray-600">{new Date(k.tarih).toLocaleDateString('tr-TR')}</span>
                          <span className={`font-medium ${durumEtiket[k.durum]?.renk}`}>{durumEtiket[k.durum]?.ad}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )
      )}

      {gruplama === 'ders' && (
        !secilenDersId ? <div className={ui.cardEmpty}>Bir ders seç</div> :
        dersTarihleri.length === 0 ? <div className={ui.cardEmpty}>Bu ders için veri yok</div> : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={gorunum === 'ozet' ? dersOzetVeri : dersOgrenciVeri}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tarih" tickFormatter={tarihFormat} fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip labelFormatter={tarihFormat} formatter={(v: any) => `%${v}`} />
              <Legend />
              {gorunum === 'ozet'
                ? <Line type="monotone" dataKey="oran" name="Devam Oranı (%)" stroke={barRenk} strokeWidth={2} dot={{ r: 3 }} />
                : dersOgrenciListesi.map((o: any, i: number) => (
                    <Line key={o.id} type="monotone" dataKey={`${o.kullanicilar?.ad} ${o.kullanicilar?.soyad}`} stroke={cokluRenkler[i % cokluRenkler.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))
              }
            </LineChart>
          </ResponsiveContainer>
        )
      )}
    </div>
  )
}