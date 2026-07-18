'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client'; // ⚠️ kendi supabase client path'inle eşleşmiyorsa güncelle
import { Button } from '@/components/ui/button';

type Kapsam = 'program' | 'sinif' | 'kisi';
type VeriAlani = 'bilgiler' | 'devamsizlik' | 'sinavlar';

interface Secenek { id: string; ad: string; }

export default function ExportButton({ izinliProgramIdler }: { izinliProgramIdler?: string[] }) {
  const [acik, setAcik] = useState(false);
  const [adim, setAdim] = useState<'kapsam' | 'hedef' | 'alanlar'>('kapsam');
  const [kapsam, setKapsam] = useState<Kapsam | null>(null);
  const [hedefler, setHedefler] = useState<Secenek[]>([]);
  const [seciliHedef, setSeciliHedef] = useState<string>('');
  const [seciliAlanlar, setSeciliAlanlar] = useState<VeriAlani[]>(['bilgiler']);
  const [yukleniyor, setYukleniyor] = useState(false);
  const supabase = createClient();

 async function kapsamSec(k: Kapsam) {
    setKapsam(k);
    setYukleniyor(true);

    if (k === 'program') {
      let sorgu = supabase.from('programlar').select('id, ad');
      if (izinliProgramIdler) sorgu = sorgu.in('id', izinliProgramIdler);
      const { data, error } = await sorgu;
      setYukleniyor(false);
      if (error) { alert('Liste alınamadı: ' + error.message); return; }
      setHedefler((data ?? []).map((d: any) => ({ id: d.id, ad: d.ad })));
    } else if (k === 'sinif') {
      let sorgu = supabase.from('siniflar').select('id, ad');
      if (izinliProgramIdler) sorgu = sorgu.in('program_id', izinliProgramIdler);
      const { data, error } = await sorgu;
      setYukleniyor(false);
      if (error) { alert('Liste alınamadı: ' + error.message); return; }
      setHedefler((data ?? []).map((d: any) => ({ id: d.id, ad: d.ad })));
    } else {
      let sorgu = supabase
        .from('ogrenciler')
        .select('id, kullanicilar(ad, soyad), siniflar!inner(program_id)');
      if (izinliProgramIdler) sorgu = sorgu.in('siniflar.program_id', izinliProgramIdler);
      const { data, error } = await sorgu;
      setYukleniyor(false);
      if (error) { alert('Liste alınamadı: ' + error.message); return; }
      setHedefler((data ?? []).map((d: any) => ({
        id: d.id,
        ad: `${d.kullanicilar?.ad ?? ''} ${d.kullanicilar?.soyad ?? ''}`.trim() || '(isimsiz)',
      })));
    }
    setAdim('hedef');
  }

  function alanToggle(a: VeriAlani) {
    setSeciliAlanlar((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  // Seçilen kapsama göre ilgili öğrenci id'lerini döner
  async function ogrenciIdleriniGetir(): Promise<string[]> {
    if (kapsam === 'kisi') return [seciliHedef];

    if (kapsam === 'sinif') {
      const { data } = await supabase.from('ogrenciler').select('id').eq('sinif_id', seciliHedef);
      return (data ?? []).map((d: any) => d.id);
    }

    // program: önce bu programa ait sınıfları bul, sonra o sınıflardaki öğrencileri
    const { data: siniflarData } = await supabase.from('siniflar').select('id').eq('program_id', seciliHedef);
    const sinifIdleri = (siniflarData ?? []).map((s: any) => s.id);
    if (sinifIdleri.length === 0) return [];
    const { data } = await supabase.from('ogrenciler').select('id').in('sinif_id', sinifIdleri);
    return (data ?? []).map((d: any) => d.id);
  }

  // ogrenci_id -> "Ad Soyad" haritası (notlar/yoklamalar sayfalarında isim göstermek için)
  async function ogrenciAdHaritasi(ogrenciIdleri: string[]): Promise<Record<string, string>> {
    const { data } = await supabase
      .from('ogrenciler')
      .select('id, kullanicilar(ad, soyad)')
      .in('id', ogrenciIdleri);
    const harita: Record<string, string> = {};
    (data ?? []).forEach((d: any) => {
      harita[d.id] = `${d.kullanicilar?.ad ?? ''} ${d.kullanicilar?.soyad ?? ''}`.trim();
    });
    return harita;
  }

  async function excelOlustur() {
    setYukleniyor(true);
    try {
      const ogrenciIdleri = await ogrenciIdleriniGetir();
      if (ogrenciIdleri.length === 0) {
        alert('Seçilen kapsamda öğrenci bulunamadı.');
        setYukleniyor(false);
        return;
      }

      const wb = XLSX.utils.book_new();

      // --- Öğrenci Bilgileri ---
      if (seciliAlanlar.includes('bilgiler')) {
        const { data } = await supabase
          .from('ogrenciler')
          .select('numara, aktif, kullanicilar(ad, soyad, email, telefon), siniflar(ad, programlar(ad))')
          .in('id', ogrenciIdleri);

        const satirlar = (data ?? []).map((d: any) => ({
          'Ad': d.kullanicilar?.ad ?? '',
          'Soyad': d.kullanicilar?.soyad ?? '',
          'E-posta': d.kullanicilar?.email ?? '',
          'Telefon': d.kullanicilar?.telefon ?? '',
          'Numara': d.numara,
          'Sınıf': d.siniflar?.ad ?? '',
          'Program': d.siniflar?.programlar?.ad ?? '',
          'Aktif': d.aktif ? 'Evet' : 'Hayır',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(satirlar), 'Öğrenci Bilgileri');
      }

      const adHaritasiGerekli = ['devamsizlik', 'sinavlar'].some((a) =>
        seciliAlanlar.includes(a as VeriAlani)
      );
      const adHaritasi = adHaritasiGerekli ? await ogrenciAdHaritasi(ogrenciIdleri) : {};

      // --- Devamsızlık (yoklamalar tablosu) ---
      if (seciliAlanlar.includes('devamsizlik')) {
        const { data, error } = await supabase
          .from('yoklamalar')
          .select('ogrenci_id, tarih, durum, aciklama, dersler(ad)')
          .in('ogrenci_id', ogrenciIdleri);

        console.log('DEVAMSIZLIK HATA:', error);
        console.log('DEVAMSIZLIK DATA:', data);

        const satirlar = (data ?? []).map((d: any) => ({
          'Öğrenci': adHaritasi[d.ogrenci_id] ?? d.ogrenci_id,
          'Ders': d.dersler?.ad ?? '',
          'Tarih': d.tarih,
          'Durum': d.durum,
          'Açıklama': d.aciklama ?? '',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(satirlar), 'Devamsızlık');
      }


      // --- Sınavlar (sinav_id dolu olan notlar = sınav sonucu, sinavlar tablosuyla join) ---
      if (seciliAlanlar.includes('sinavlar')) {
        const { data } = await supabase
          .from('notlar')
          .select('ogrenci_id, puan, tarih, sinavlar(baslik, tarih, saat, konum)')
          .in('ogrenci_id', ogrenciIdleri)
          .not('sinav_id', 'is', null);

        const satirlar = (data ?? []).map((d: any) => ({
          'Öğrenci': adHaritasi[d.ogrenci_id] ?? d.ogrenci_id,
          'Sınav': d.sinavlar?.baslik ?? '',
          'Sınav Tarihi': d.sinavlar?.tarih ?? '',
          'Saat': d.sinavlar?.saat ?? '',
          'Konum': d.sinavlar?.konum ?? '',
          'Puan': d.puan,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(satirlar), 'Sınavlar');
      }

      const tarih = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `siyerobs-rapor${tarih}.xlsx`);
      setAcik(false);
      setAdim('kapsam');
    } catch (e: any) {
      alert('Export başarısız: ' + e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAcik(true)}>
        Excel
      </Button>

      {acik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Excel'e Aktar</h3>

            {adim === 'kapsam' && (
              <div className="space-y-2">
                <p className="mb-3 text-sm text-muted-foreground">Kapsamı seç</p>
                {(['program', 'sinif', 'kisi'] as Kapsam[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => kapsamSec(k)}
                    className="w-full rounded-xl border border-border px-4 py-3 text-left text-sm font-medium hover:border-primary hover:bg-muted transition-colors"
                  >
                    {k === 'program' ? 'Program bazında' : k === 'sinif' ? 'Sınıf bazında' : 'Kişi bazında'}
                  </button>
                ))}
              </div>
            )}

            {adim === 'hedef' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {kapsam === 'program' ? 'Program seç' : kapsam === 'sinif' ? 'Sınıf seç' : 'Öğrenci seç'}
                </p>
                <select
                  value={seciliHedef}
                  onChange={(e) => setSeciliHedef(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm bg-background"
                >
                  <option value="">Seçiniz...</option>
                  {hedefler.map((h) => (
                    <option key={h.id} value={h.id}>{h.ad}</option>
                  ))}
                </select>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setAdim('kapsam')} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted">Geri</button>
                  <button
                    disabled={!seciliHedef}
                    onClick={() => setAdim('alanlar')}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90"
                  >
                    Devam Et
                  </button>
                </div>
              </div>
            )}

            {adim === 'alanlar' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Hangi veriler dahil olsun?</p>
                {([
                  ['bilgiler', 'Öğrenci Bilgileri'],
                  ['devamsizlik', 'Devamsızlık'],
                  ['sinavlar', 'Sınavlar'],
                ] as [VeriAlani, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm cursor-pointer hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={seciliAlanlar.includes(key)}
                      onChange={() => alanToggle(key)}
                      className="h-4 w-4 rounded border-border"
                    />
                    {label}
                  </label>
                ))}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setAdim('hedef')} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted">Geri</button>
                  <button
                    disabled={seciliAlanlar.length === 0 || yukleniyor}
                    onClick={excelOlustur}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90"
                  >
                    {yukleniyor ? 'Oluşturuluyor...' : 'İndir'}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => { setAcik(false); setAdim('kapsam'); }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}