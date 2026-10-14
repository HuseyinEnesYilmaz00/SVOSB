'use client';
import { toast } from 'sonner'
import { FileSpreadsheet, Database } from 'lucide-react';

import { useEffect, useState } from 'react';
import type jsPDF from 'jspdf';
import { createClient } from '@/lib/supabase/client';

type Kapsam = 'program' | 'sinif' | 'ders' | 'kisi';
type VeriAlani = 'bilgiler' | 'devamsizlik' | 'sinavlar';

interface Secenek { id: string; ad: string; }

const DURUM_RENK = { Devam: '#16a34a', 'Geç Katıldı': '#ca8a04', Mazeret: '#2563eb', Katılmadı: '#dc2626' };

export default function ExportButton({ izinliProgramIdler, disaAktarAcik, onKapat, arsivSinif }: { izinliProgramIdler?: string[]; disaAktarAcik?: boolean; onKapat?: () => void; arsivSinif?: { id: string; ad: string } | null }) {
  const acik = disaAktarAcik ?? false;
  const kapat = () => { onKapat?.(); setEkran('secim'); };
  const [ekran, setEkran] = useState<'secim' | 'wizard'>('secim');
  const [yedekIndiriyor, setYedekIndiriyor] = useState(false);
  const [adim, setAdim] = useState<'kapsam' | 'hedef' | 'alanlar'>('kapsam');
  const [kapsam, setKapsam] = useState<Kapsam | null>(null);
  const [hedefler, setHedefler] = useState<Secenek[]>([]);
  const [seciliHedef, setSeciliHedef] = useState<string>('');
  const [seciliKisiler, setSeciliKisiler] = useState<string[]>([]);
  const [seciliAlanlar, setSeciliAlanlar] = useState<VeriAlani[]>(['bilgiler']);
  const [ciktiTuru, setCiktiTuru] = useState<'tablo' | 'grafikli' | 'pdf'>('tablo');
  const [yukleniyor, setYukleniyor] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!disaAktarAcik || !arsivSinif) return;
    setEkran('wizard');
    setKapsam('sinif');
    setSeciliHedef(arsivSinif.id);
    setHedefler([arsivSinif]);
    setAdim('alanlar');
  }, [arsivSinif, disaAktarAcik]);

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
      sorgu = sorgu.or('arsivlendi.eq.false,arsivlendi.is.null');
      const { data, error } = await sorgu;
      setYukleniyor(false);
      if (error) { alert('Liste alınamadı: ' + error.message); return; }
      setHedefler((data ?? []).map((d: any) => ({ id: d.id, ad: d.ad })));
    } else if (k === 'ders') {
      let sorgu = supabase.from('dersler').select('id, ad, siniflar!inner(ad, program_id, arsivlendi)').eq('aktif', true).eq('siniflar.arsivlendi', false);
      if (izinliProgramIdler) sorgu = sorgu.in('siniflar.program_id', izinliProgramIdler);
      const { data, error } = await sorgu;
      setYukleniyor(false);
      if (error) { alert('Liste alınamadı: ' + error.message); return; }
      setHedefler((data ?? []).map((d: any) => ({ id: d.id, ad: `${d.ad} — ${d.siniflar?.ad ?? ''}` })));
    } else {
      let sorgu = supabase.from('ogrenciler').select('id, kullanicilar(ad, soyad), siniflar!inner(program_id, arsivlendi)').eq('aktif', true).eq('siniflar.arsivlendi', false);
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

  function kisiToggle(id: string) {
    setSeciliKisiler((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function alanToggle(a: VeriAlani) {
    setSeciliAlanlar((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }

  async function ogrenciIdleriniGetir(): Promise<string[]> {
    if (arsivSinif) {
      const { data: dersler } = await supabase.from('dersler').select('id').eq('sinif_id', arsivSinif.id);
      const dersIdleri = (dersler ?? []).map((d: any) => d.id);
      if (!dersIdleri.length) return [];
      const [{ data: notlar }, { data: yoklamalar }] = await Promise.all([
        supabase.from('notlar').select('ogrenci_id').in('ders_id', dersIdleri),
        supabase.from('yoklamalar').select('ogrenci_id').in('ders_id', dersIdleri),
      ]);
      return [...new Set([...(notlar ?? []), ...(yoklamalar ?? [])].map((kayit: any) => kayit.ogrenci_id).filter(Boolean))];
    }
    if (kapsam === 'kisi') return seciliKisiler;
    if (kapsam === 'ders') {
      const { data: ders } = await supabase.from('dersler').select('sinif_id').eq('id', seciliHedef).single();
      if (!ders?.sinif_id) return [];
      const { data } = await supabase.from('ogrenciler').select('id').eq('sinif_id', ders.sinif_id).eq('aktif', true);
      return (data ?? []).map((d: any) => d.id);
    }
    if (kapsam === 'sinif') {
      const { data } = await supabase.from('ogrenciler').select('id').eq('sinif_id', seciliHedef).eq('aktif', true);
      return (data ?? []).map((d: any) => d.id);
    }
    const { data: siniflarData } = await supabase.from('siniflar').select('id').eq('program_id', seciliHedef).or('arsivlendi.eq.false,arsivlendi.is.null');
    const sinifIdleri = (siniflarData ?? []).map((s: any) => s.id);
    if (sinifIdleri.length === 0) return [];
    const { data } = await supabase.from('ogrenciler').select('id').in('sinif_id', sinifIdleri).eq('aktif', true);
    return (data ?? []).map((d: any) => d.id);
  }

  async function ogrenciAdHaritasi(ogrenciIdleri: string[]): Promise<Record<string, string>> {
    const { data } = await supabase.from('ogrenciler').select('id, kullanicilar(ad, soyad)').in('id', ogrenciIdleri);
    const harita: Record<string, string> = {};
    (data ?? []).forEach((d: any) => {
      harita[d.id] = `${d.kullanicilar?.ad ?? ''} ${d.kullanicilar?.soyad ?? ''}`.trim();
    });
    return harita;
  }

  async function arsivDersIdleriniGetir(): Promise<string[]> {
    if (!arsivSinif) return [];
    const { data } = await supabase.from('dersler').select('id').eq('sinif_id', arsivSinif.id);
    return (data ?? []).map((ders: any) => ders.id);
  }

  async function ogrenciGrafikVerisi(ogrenciId: string) {
    const { data: ogrenci } = await supabase.from('ogrenciler').select('sinif_id').eq('id', ogrenciId).single();
    if (!ogrenci) return [];
    let dersSorgu = supabase.from('dersler').select('id, ad').eq('sinif_id', arsivSinif?.id ?? ogrenci.sinif_id);
    let yoklamaSorgu = supabase.from('yoklamalar').select('ders_id, durum').eq('ogrenci_id', ogrenciId);
    if (kapsam === 'ders') {
      dersSorgu = dersSorgu.eq('id', seciliHedef);
      yoklamaSorgu = yoklamaSorgu.eq('ders_id', seciliHedef);
    }
    if (arsivSinif) {
      const dersIdleri = await arsivDersIdleriniGetir();
      if (!dersIdleri.length) return [];
      yoklamaSorgu = yoklamaSorgu.in('ders_id', dersIdleri);
    }
    const [{ data: dersler }, { data: yoklamalar }] = await Promise.all([dersSorgu, yoklamaSorgu]);

    return (dersler ?? []).map((d: any) => {
      const buDers = (yoklamalar ?? []).filter((y: any) => y.ders_id === d.id);
      return {
        ad: d.ad,
        toplam: buDers.length,
        Devam: buDers.filter((y: any) => y.durum === 'katildi').length,
        'Geç Katıldı': buDers.filter((y: any) => y.durum === 'gec').length,
        Mazeret: buDers.filter((y: any) => y.durum === 'izinli').length,
        Katılmadı: buDers.filter((y: any) => y.durum === 'katilmadi').length,
      };
    });
  }

  async function ogrenciOrtalamalari(ogrenciId: string) {
    let notSorgu = supabase.from('notlar').select('puan').eq('ogrenci_id', ogrenciId);
    let yoklamaSorgu = supabase.from('yoklamalar').select('durum').eq('ogrenci_id', ogrenciId);
    if (kapsam === 'ders') {
      notSorgu = notSorgu.eq('ders_id', seciliHedef);
      yoklamaSorgu = yoklamaSorgu.eq('ders_id', seciliHedef);
    }
    if (arsivSinif) {
      const dersIdleri = await arsivDersIdleriniGetir();
      if (!dersIdleri.length) return { notOrt: null, yoklamaOrt: null, genelOrt: null, katildi: 0, gec: 0, izinli: 0, katilmadi: 0, toplam: 0, katilimYuzdesi: null };
      notSorgu = notSorgu.in('ders_id', dersIdleri);
      yoklamaSorgu = yoklamaSorgu.in('ders_id', dersIdleri);
    }
    const [{ data: notlar }, { data: yoklamalar }] = await Promise.all([notSorgu, yoklamaSorgu]);
    const devamPuanlari: Record<string, number> = { katildi: 100, gec: 0, izinli: 0, katilmadi: 0 };
    const sinavOrt = notlar && notlar.length > 0 ? notlar.reduce((s: number, n: any) => s + n.puan, 0) / notlar.length : null;
    const devamOrt = yoklamalar && yoklamalar.length > 0 ? yoklamalar.reduce((s: number, y: any) => s + (devamPuanlari[y.durum] || 0), 0) / yoklamalar.length : null;
    let genel: number | null = null;
    if (sinavOrt !== null && devamOrt !== null) genel = sinavOrt * 0.5 + devamOrt * 0.5;
    else if (sinavOrt !== null) genel = sinavOrt;
    else if (devamOrt !== null) genel = devamOrt;
    return {
      notOrt: sinavOrt !== null ? Math.round(sinavOrt * 10) / 10 : null,
      yoklamaOrt: devamOrt !== null ? Math.round(devamOrt * 10) / 10 : null,
      genelOrt: genel !== null ? Math.round(genel * 10) / 10 : null,
      katildi: (yoklamalar ?? []).filter((y: any) => y.durum === 'katildi').length,
      gec: (yoklamalar ?? []).filter((y: any) => y.durum === 'gec').length,
      izinli: (yoklamalar ?? []).filter((y: any) => y.durum === 'izinli').length,
      katilmadi: (yoklamalar ?? []).filter((y: any) => y.durum === 'katilmadi').length,
      toplam: yoklamalar?.length ?? 0,
      katilimYuzdesi: yoklamalar?.length ? Math.round((((yoklamalar ?? []).filter((y: any) => y.durum === 'katildi' || y.durum === 'gec').length / yoklamalar.length) * 1000)) / 10 : null,
    };
  }

  function grafikCiz(veri: any[], baslik: string): string {
    const canvas = document.createElement('canvas');
    const satirYuksekligi = 84;
    canvas.width = 1400;
    canvas.height = Math.max(430, 125 + veri.length * satirYuksekligi);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 25px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(baslik, 28, 38);

    let legendX = 28;
    Object.entries(DURUM_RENK).forEach(([ad, renk]) => {
      ctx.fillStyle = renk;
      ctx.fillRect(legendX, 58, 16, 16);
      ctx.fillStyle = '#374151';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText(ad, legendX + 23, 72);
      legendX += ctx.measureText(ad).width + 72;
    });

    const barX = 270;
    const barGenislik = 850;
    const anahtarlar = ['Devam', 'Geç Katıldı', 'Mazeret', 'Katılmadı'] as const;
    veri.forEach((v, i) => {
      const y = 104 + i * satirYuksekligi;
      const toplam = Number(v.toplam) || 0;
      const dersAdi = String(v.ad || 'Ders');
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 17px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(dersAdi.length > 25 ? `${dersAdi.slice(0, 24)}…` : dersAdi, barX - 18, y + 21);

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(barX, y, barGenislik, 30);
      let x = barX;
      anahtarlar.forEach((key) => {
        const sayi = Number(v[key]) || 0;
        const oran = toplam > 0 ? (sayi / toplam) * 100 : 0;
        const genislik = (oran / 100) * barGenislik;
        if (genislik > 0) {
          ctx.fillStyle = DURUM_RENK[key];
          ctx.fillRect(x, y, genislik, 30);
        }
        x += genislik;
      });

      ctx.fillStyle = '#374151';
      ctx.font = '15px Arial, sans-serif';
      ctx.textAlign = 'left';
      const ozet = anahtarlar.map((key) => {
        const sayi = Number(v[key]) || 0;
        const oran = toplam > 0 ? (sayi / toplam) * 100 : 0;
        return `${key}: ${sayi}/${toplam} (%${oran.toFixed(1)})`;
      }).join('   ');
      ctx.fillText(toplam > 0 ? ozet : 'Bu ders için yoklama kaydı bulunmuyor.', barX, y + 54);
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillText(`Toplam: ${toplam}`, barX + barGenislik + 22, y + 21);
    });
    return canvas.toDataURL('image/png').split(',')[1];
  }

  function dersDegeriHesapla(ogrenciId: string, dersId: string, tumNotlar: any[], tumYoklamalar: any[]): number | null {
    const notlarBu = tumNotlar.filter((n) => n.ogrenci_id === ogrenciId && n.ders_id === dersId);
    if (notlarBu.length > 0) {
      return Math.round((notlarBu.reduce((s, n) => s + n.puan, 0) / notlarBu.length) * 10) / 10;
    }
    const devamPuanlari: Record<string, number> = { katildi: 100, gec: 0, izinli: 0, katilmadi: 0 };
    const yoklamaBu = tumYoklamalar.filter((y) => y.ogrenci_id === ogrenciId && y.ders_id === dersId);
    if (yoklamaBu.length === 0) return null;
    return Math.round((yoklamaBu.reduce((s, y) => s + (devamPuanlari[y.durum] || 0), 0) / yoklamaBu.length) * 10) / 10;
  }

  async function fontYukleVeEkle(doc: jsPDF) {
    const fontEkle = async (url: string, dosyaAdi: string, stil: 'normal' | 'bold') => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`PDF fontu yüklenemedi: ${url}`);
      const buffer = await res.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      doc.addFileToVFS(dosyaAdi, btoa(binary));
      doc.addFont(dosyaAdi, 'NotoSans', stil);
    };
    await Promise.all([
      fontEkle('/fonts/NotoSans-Regular.ttf', 'NotoSans-Regular.ttf', 'normal'),
      fontEkle('/fonts/NotoSans-Bold.ttf', 'NotoSans-Bold.ttf', 'bold'),
    ]);
    doc.setFont('NotoSans', 'normal');
  }

  async function pdfOlustur(ogrenciIdleri: string[]) {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: 'landscape' });
    await fontYukleVeEkle(doc);
    const { data: ogrenciler } = await supabase
      .from('ogrenciler')
      .select('id, numara, kullanicilar(ad, soyad), sinif_id, siniflar(ad)')
      .in('id', ogrenciIdleri)
      .order('numara');
    const sinifIdleri = arsivSinif ? [arsivSinif.id] : [...new Set((ogrenciler ?? []).map((o: any) => o.sinif_id))];
    let notSorgu = supabase.from('notlar').select('ogrenci_id, ders_id, puan').in('ogrenci_id', ogrenciIdleri).not('ders_id', 'is', null);
    let yoklamaSorgu = supabase.from('yoklamalar').select('ogrenci_id, ders_id, durum').in('ogrenci_id', ogrenciIdleri);
    if (kapsam === 'ders') {
      notSorgu = notSorgu.eq('ders_id', seciliHedef);
      yoklamaSorgu = yoklamaSorgu.eq('ders_id', seciliHedef);
    }
    const [{ data: tumNotlar }, { data: tumYoklamalar }] = await Promise.all([notSorgu, yoklamaSorgu]);
    let ilkSayfa = true;

    for (const sinifId of sinifIdleri) {
      let dersSorgu = supabase.from('dersler').select('id, ad').eq('sinif_id', sinifId).order('ad');
      if (kapsam === 'ders') dersSorgu = dersSorgu.eq('id', seciliHedef);
      const { data: dersler } = await dersSorgu;
      const sinifOgrencileri = arsivSinif ? (ogrenciler ?? []) : (ogrenciler ?? []).filter((o: any) => o.sinif_id === sinifId);
      const sinifAdi = arsivSinif?.ad ?? (sinifOgrencileri[0]?.siniflar as any)?.ad ?? '';
      if (!ilkSayfa) doc.addPage();
      ilkSayfa = false;
      doc.setFont('NotoSans', 'bold');
      doc.setFontSize(13);
      doc.text(`${sinifAdi} - Sınav ve Yoklama Sonuçları`, 14, 15);
      const basliklar = ['Sıra', 'Ad Soyad', 'Not Ort.', 'Yoklama Ort.', 'Genel Ort.', 'Katılım %', 'Katıldı/Toplam', 'Geç/Toplam', 'İzinli/Toplam', 'Katılmadı/Toplam'];
      const satirlar: any[] = [];
      const sinifDersIdleri = new Set((dersler ?? []).map((d: any) => d.id));
      for (const o of sinifOgrencileri) {
        const adSoyad = `${(o.kullanicilar as any)?.ad ?? ''} ${(o.kullanicilar as any)?.soyad ?? ''}`.trim();
        const notlarBuOgrenci = (tumNotlar ?? []).filter((n: any) => n.ogrenci_id === o.id && sinifDersIdleri.has(n.ders_id));
        const yoklamalarBuOgrenci = (tumYoklamalar ?? []).filter((y: any) => y.ogrenci_id === o.id && sinifDersIdleri.has(y.ders_id));
        const notOrt = notlarBuOgrenci.length > 0 ? Math.round((notlarBuOgrenci.reduce((s: number, n: any) => s + n.puan, 0) / notlarBuOgrenci.length) * 10) / 10 : null;
        const devamPuanlari: Record<string, number> = { katildi: 100, gec: 0, izinli: 0, katilmadi: 0 };
        const yoklamaOrt = yoklamalarBuOgrenci.length > 0 ? Math.round((yoklamalarBuOgrenci.reduce((s: number, y: any) => s + (devamPuanlari[y.durum] || 0), 0) / yoklamalarBuOgrenci.length) * 10) / 10 : null;
        const genelOrt = notOrt !== null && yoklamaOrt !== null ? Math.round((notOrt * 0.5 + yoklamaOrt * 0.5) * 10) / 10 : (notOrt ?? yoklamaOrt);
        const toplam = yoklamalarBuOgrenci.length;
        const katildi = yoklamalarBuOgrenci.filter((y: any) => y.durum === 'katildi').length;
        const gec = yoklamalarBuOgrenci.filter((y: any) => y.durum === 'gec').length;
        const izinli = yoklamalarBuOgrenci.filter((y: any) => y.durum === 'izinli').length;
        const katilmadi = yoklamalarBuOgrenci.filter((y: any) => y.durum === 'katilmadi').length;
        const katilim = toplam ? Math.round(((katildi + gec) / toplam) * 1000) / 10 : null;
        satirlar.push(['', adSoyad, notOrt ?? '-', yoklamaOrt ?? '-', genelOrt ?? '-', katilim === null ? '-' : `%${katilim.toFixed(1)}`, `${katildi}/${toplam}`, `${gec}/${toplam}`, `${izinli}/${toplam}`, `${katilmadi}/${toplam}`]);
      }
      const genelOrtalamaIndexi = 4;
      satirlar.sort((a, b) => (typeof b[genelOrtalamaIndexi] === 'number' ? b[genelOrtalamaIndexi] : -1) - (typeof a[genelOrtalamaIndexi] === 'number' ? a[genelOrtalamaIndexi] : -1));
      satirlar.forEach((satir, index) => { satir[0] = index + 1; });
      autoTable(doc, {
        head: [basliklar],
        body: satirlar,
        startY: 20,
        theme: 'grid',
        margin: { left: 10, right: 10 },
        styles: { fontSize: 8.5, font: 'NotoSans', fontStyle: 'normal', cellPadding: 2.2, overflow: 'linebreak' },
        headStyles: { fillColor: [52, 78, 65], font: 'NotoSans', fontStyle: 'bold', textColor: 255, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 44 },
          2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' },
          5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' },
          8: { halign: 'center' }, 9: { halign: 'center' },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index >= 2 && data.column.index <= 4) {
            const deger = parseFloat(data.cell.raw);
            if (!isNaN(deger) && deger < 85) {
              data.cell.styles.fillColor = [253, 224, 71];
            }
          }
        },
      });
    }

    for (const o of ogrenciler ?? []) {
      const grafikVeri = await ogrenciGrafikVerisi(o.id);
      if (grafikVeri.length === 0) continue;
      const adSoyad = `${(o.kullanicilar as any)?.ad ?? ''} ${(o.kullanicilar as any)?.soyad ?? ''}`.trim();
      const base64 = grafikCiz(grafikVeri, `${adSoyad} - Ders Bazlı Katılım Oranları`);
      doc.addPage();
      const sayfaGenisligi = doc.internal.pageSize.getWidth();
      const sayfaYuksekligi = doc.internal.pageSize.getHeight();
      const kaynakGenislik = 1400;
      const kaynakYukseklik = Math.max(430, 125 + grafikVeri.length * 84);
      const olcek = Math.min((sayfaGenisligi - 16) / kaynakGenislik, (sayfaYuksekligi - 16) / kaynakYukseklik);
      const resimGenisligi = kaynakGenislik * olcek;
      const resimYuksekligi = kaynakYukseklik * olcek;
      doc.addImage(
        `data:image/png;base64,${base64}`,
        'PNG',
        (sayfaGenisligi - resimGenisligi) / 2,
        (sayfaYuksekligi - resimYuksekligi) / 2,
        resimGenisligi,
        resimYuksekligi,
      );
    }

    const tarih = new Date().toISOString().slice(0, 10);
    doc.save(`siyerobs-rapor-${tarih}.pdf`);
  }

  async function grafikliExcelOlustur(ogrenciIdleri: string[]) {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const { data } = await supabase
      .from('ogrenciler')
      .select('id, numara, kullanicilar(ad, soyad), siniflar(ad)')
      .in('id', ogrenciIdleri);
    const ozetSayfa = wb.addWorksheet('Özet');
    ozetSayfa.columns = [
      { header: 'Sıra', key: 'sira', width: 8 },
      { header: 'Ad Soyad', key: 'adSoyad', width: 25 },
      { header: 'Sınıf', key: 'sinif', width: 20 },
      { header: 'Not Ortalaması', key: 'notOrt', width: 16 },
      { header: 'Yoklama Oranı', key: 'yoklamaOrt', width: 16 },
      { header: 'Genel Ortalama', key: 'genelOrt', width: 16 },
      { header: 'Katılım %', key: 'katilimYuzdesi', width: 12 },
      { header: 'Katıldı/Toplam', key: 'katildi', width: 16 },
      { header: 'Geç/Toplam', key: 'gec', width: 14 },
      { header: 'İzinli/Toplam', key: 'izinli', width: 16 },
      { header: 'Katılmadı/Toplam', key: 'katilmadi', width: 18 },
    ];
    ozetSayfa.getRow(1).font = { bold: true };
    const siraliOgrenciler = await Promise.all((data ?? []).map(async (o: any) => ({ o, ort: await ogrenciOrtalamalari(o.id) })));
    siraliOgrenciler.sort((a, b) => (b.ort.genelOrt ?? -1) - (a.ort.genelOrt ?? -1));
    for (const [index, { o, ort }] of siraliOgrenciler.entries()) {
      ozetSayfa.addRow({
        sira: index + 1,
        adSoyad: `${(o.kullanicilar as any)?.ad ?? ''} ${(o.kullanicilar as any)?.soyad ?? ''}`.trim(),
        sinif: arsivSinif?.ad ?? (o.siniflar as any)?.ad ?? '',
        notOrt: ort.notOrt ?? '-',
        yoklamaOrt: ort.yoklamaOrt ?? '-',
        genelOrt: ort.genelOrt ?? '-',
        katilimYuzdesi: ort.katilimYuzdesi === null ? '-' : `%${ort.katilimYuzdesi.toFixed(1)}`,
        katildi: `${ort.katildi}/${ort.toplam}`,
        gec: `${ort.gec}/${ort.toplam}`,
        izinli: `${ort.izinli}/${ort.toplam}`,
        katilmadi: `${ort.katilmadi}/${ort.toplam}`,
      });
      const adSoyad = `${(o.kullanicilar as any)?.ad ?? ''} ${(o.kullanicilar as any)?.soyad ?? ''}`.trim();
      const sayfaAdi = adSoyad.slice(0, 28) || 'Öğrenci';
      const ogrenciSayfa = wb.addWorksheet(sayfaAdi);
      const grafikVeri = await ogrenciGrafikVerisi(o.id);
      if (grafikVeri.length > 0) {
        const base64 = grafikCiz(grafikVeri, `${adSoyad} - Ders Bazlı Katılım Oranları`);
        const imgId = wb.addImage({ base64, extension: 'png' });
        ogrenciSayfa.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 1400, height: Math.max(430, 125 + grafikVeri.length * 84) } });
      } else {
        ogrenciSayfa.getCell('A1').value = 'Bu öğrenci için veri yok';
      }
    }
    const tarih = new Date().toISOString().slice(0, 10);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siyerobs-rapor-${tarih}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function grafiksizExcelOlustur(ogrenciIdleri: string[]) {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const addSheet = (name: string, rows: Record<string, unknown>[]) => {
      const sheet = wb.addWorksheet(name);
      if (!rows.length) return;
      sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 22 }));
      sheet.addRows(rows);
      sheet.getRow(1).font = { bold: true };
    };
    if (seciliAlanlar.includes('bilgiler')) {
      const { data } = await supabase
        .from('ogrenciler')
        .select('id, numara, aktif, kullanicilar(ad, soyad, email, telefon), siniflar(ad, programlar(ad))')
        .in('id', ogrenciIdleri);
      const zenginSatirlar = await Promise.all((data ?? []).map(async (d: any) => ({ d, ort: await ogrenciOrtalamalari(d.id) })));
      zenginSatirlar.sort((a, b) => (b.ort.genelOrt ?? -1) - (a.ort.genelOrt ?? -1));
      addSheet('Öğrenci Bilgileri', zenginSatirlar.map(({ d, ort }, index) => ({
        'Sıra': index + 1,
        'Ad': d.kullanicilar?.ad ?? '',
        'Soyad': d.kullanicilar?.soyad ?? '',
        'E-posta': d.kullanicilar?.email ?? '',
        'Telefon': d.kullanicilar?.telefon ?? '',
        'Sınıf': arsivSinif?.ad ?? d.siniflar?.ad ?? '',
        'Program': d.siniflar?.programlar?.ad ?? '',
        'Not Ortalaması': ort.notOrt ?? '-',
        'Yoklama Ortalaması': ort.yoklamaOrt ?? '-',
        'Genel Ortalama': ort.genelOrt ?? '-',
        'Katılım %': ort.katilimYuzdesi ?? '-',
        'Katıldı/Toplam': `${ort.katildi}/${ort.toplam}`,
        'Geç/Toplam': `${ort.gec}/${ort.toplam}`,
        'İzinli/Toplam': `${ort.izinli}/${ort.toplam}`,
        'Katılmadı/Toplam': `${ort.katilmadi}/${ort.toplam}`,
        'Aktif': d.aktif ? 'Evet' : 'Hayır',
      })));
    }
    const adHaritasiGerekli = ['devamsizlik', 'sinavlar'].some((a) => seciliAlanlar.includes(a as VeriAlani));
    const adHaritasi = adHaritasiGerekli ? await ogrenciAdHaritasi(ogrenciIdleri) : {};
    if (seciliAlanlar.includes('devamsizlik')) {
      let sorgu = supabase
        .from('yoklamalar')
        .select('ogrenci_id, tarih, durum, aciklama, dersler(ad)')
        .in('ogrenci_id', ogrenciIdleri);
      if (kapsam === 'ders') sorgu = sorgu.eq('ders_id', seciliHedef);
      if (arsivSinif) {
        const dersIdleri = await arsivDersIdleriniGetir();
        sorgu = sorgu.in('ders_id', dersIdleri);
      }
      const { data } = await sorgu;
      const ortalamalar = Object.fromEntries(await Promise.all(ogrenciIdleri.map(async id => [id, await ogrenciOrtalamalari(id)])));
      const satirlar = (data ?? []).map((d: any) => ({
        '_ogrenci_id': d.ogrenci_id,
        'Öğrenci': adHaritasi[d.ogrenci_id] ?? d.ogrenci_id,
        'Ders': d.dersler?.ad ?? '',
        'Tarih': d.tarih,
        'Durum': d.durum,
        'Açıklama': d.aciklama ?? '',
      }));
      satirlar.sort((a: any, b: any) => ((ortalamalar[b._ogrenci_id]?.genelOrt ?? -1) - (ortalamalar[a._ogrenci_id]?.genelOrt ?? -1)) || String(a['Tarih']).localeCompare(String(b['Tarih'])));
      addSheet('Devamsızlık', satirlar.map(({ _ogrenci_id, ...satir }: any) => satir));
      const ozetSatirlari = ogrenciIdleri.map(id => ({ id, ad: adHaritasi[id] ?? id, ...ortalamalar[id] }))
        .sort((a, b) => (b.genelOrt ?? -1) - (a.genelOrt ?? -1))
        .map((o, index) => ({
          'Sıra': index + 1,
          'Öğrenci': o.ad,
          'Katılım %': o.katilimYuzdesi ?? '-',
          'Katıldı/Toplam': `${o.katildi}/${o.toplam}`,
          'Geç/Toplam': `${o.gec}/${o.toplam}`,
          'İzinli/Toplam': `${o.izinli}/${o.toplam}`,
          'Katılmadı/Toplam': `${o.katilmadi}/${o.toplam}`,
        }));
      addSheet('Katılım Özeti', ozetSatirlari);
    }
    if (seciliAlanlar.includes('sinavlar')) {
      let sorgu = supabase
        .from('notlar')
        .select('ogrenci_id, puan, tarih, sinavlar(baslik, tarih, saat, konum)')
        .in('ogrenci_id', ogrenciIdleri)
        .not('sinav_id', 'is', null);
      if (kapsam === 'ders') sorgu = sorgu.eq('ders_id', seciliHedef);
      if (arsivSinif) {
        const dersIdleri = await arsivDersIdleriniGetir();
        sorgu = sorgu.in('ders_id', dersIdleri);
      }
      const { data } = await sorgu;
      const ortalamaHaritasi = Object.fromEntries(await Promise.all(ogrenciIdleri.map(async id => [id, await ogrenciOrtalamalari(id)])));
      const satirlar = (data ?? []).map((d: any) => ({
        'Öğrenci': adHaritasi[d.ogrenci_id] ?? d.ogrenci_id,
        'Sınav': d.sinavlar?.baslik ?? '',
        'Sınav Tarihi': d.sinavlar?.tarih ?? '',
        'Saat': d.sinavlar?.saat ?? '',
        'Konum': d.sinavlar?.konum ?? '',
        'Puan': d.puan,
        '_ortalama': ortalamaHaritasi[d.ogrenci_id]?.genelOrt ?? -1,
      }));
      satirlar.sort((a: any, b: any) => b._ortalama - a._ortalama);
      addSheet('Sınavlar', satirlar.map(({ _ortalama, ...satir }: any) => satir));
    }
    const tarih = new Date().toISOString().slice(0, 10);
    const buffer = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `siyerobs-rapor-${tarih}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function excelOlustur() {
    setYukleniyor(true);
    try {
      const ogrenciIdleri = await ogrenciIdleriniGetir();
      if (ogrenciIdleri.length === 0) {
        alert('Seçilen kapsamda öğrenci bulunamadı.');
        return;
      }
      if (ciktiTuru === 'grafikli') await grafikliExcelOlustur(ogrenciIdleri);
      else if (ciktiTuru === 'pdf') await pdfOlustur(ogrenciIdleri);
      else await grafiksizExcelOlustur(ogrenciIdleri);
      kapat();
      setAdim('kapsam');
    } catch (e: any) {
      alert('Export başarısız: ' + JSON.stringify(e?.message || e));
    } finally {
      setYukleniyor(false);
    }
  }

    async function tamYedekAl() {
    if (!izinliProgramIdler || izinliProgramIdler.length === 0) {
      toast('Aktif program bulunamadı.');
      return;
    }
    const programId = izinliProgramIdler[0];
    setYedekIndiriyor(true);
    try {
      const { data: programData } = await supabase.from('programlar').select('*').eq('id', programId).single();
      const { data: siniflar } = await supabase.from('siniflar').select('*').eq('program_id', programId);
      const sinifIdleri = siniflar?.map((s: any) => s.id) || [];

      let ogrenciler: any[] = [], dersler: any[] = [], notlar: any[] = [], yoklamalar: any[] = [], duyurular: any[] = [];

      if (sinifIdleri.length > 0) {
        const { data: oData } = await supabase.from('ogrenciler').select('*, kullanicilar(*)').in('sinif_id', sinifIdleri);
        ogrenciler = oData || [];
        const { data: dData } = await supabase.from('dersler').select('*').in('sinif_id', sinifIdleri);
        dersler = dData || [];
        const dersIdleri = dersler.map((d) => d.id);
        if (dersIdleri.length > 0) {
          const { data: nData } = await supabase.from('notlar').select('*').in('ders_id', dersIdleri);
          notlar = nData || [];
          const { data: yData } = await supabase.from('yoklamalar').select('*').in('ders_id', dersIdleri);
          yoklamalar = yData || [];
        }
      }

      const { data: duyuruData } = await supabase.from('duyurular').select('*').eq('program_id', programId);
      duyurular = duyuruData || [];

      const yedekVerisi = {
        olusturulma_tarihi: new Date().toISOString(),
        program: programData, siniflar, ogrenciler, dersler, notlar, yoklamalar, duyurular,
      };

      const jsonString = JSON.stringify(yedekVerisi, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SVOBS_Yedek_${programData?.ad?.replace(/\s+/g, '_') || 'Program'}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Yedek indirildi');
    } catch (error: any) {
      toast.error('Yedek alınırken hata oluştu: ' + error.message);
    } finally {
      setYedekIndiriyor(false);
    }
  }

    return (
    <>
      {acik && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) kapat(); }}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl p-6 shadow-2xl max-h-[88vh] overflow-y-auto animate-modal border border-slate-200 bg-white"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', opacity: 1 }}
          >
                        <div className="relative pb-3 border-b border-slate-100 mb-4 pr-10">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {ekran === 'secim' ? 'Dışa Aktar' : 'Excel Raporu / PDF Oluştur'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {ekran === 'secim' ? 'Ne yapmak istersiniz?' : 'Dışa aktarmak istediğiniz verileri belirleyin'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => kapat()}
                className="absolute right-0 top-0 size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0 text-base font-bold"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            {ekran === 'secim' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => { setEkran('wizard'); setAdim('kapsam'); setKapsam(null); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition text-left cursor-pointer"
                >
                  <FileSpreadsheet className="size-5 text-[#1b4332] shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Excel Raporu / PDF</p>
                    <p className="text-xs text-slate-500">Program, sınıf, ders veya öğrenci bazında çıktı oluştur</p>
                  </div>
                </button>
                <button
                  type="button"
                  disabled={yedekIndiriyor}
                  onClick={tamYedekAl}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition text-left cursor-pointer disabled:opacity-50"
                >
                  <Database className="size-5 text-[#1b4332] shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {yedekIndiriyor ? 'İndiriliyor...' : 'Tam Yedek (JSON)'}
                    </p>
                    <p className="text-xs text-slate-500">Programın tüm verisini JSON olarak indir</p>
                  </div>
                </button>
              </div>
            )}

            {ekran === 'wizard' && (
              <>
            {adim === 'kapsam' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Kapsamı seç</p>
                {[
                  ['program', 'Program bazında'],
                  ['sinif', 'Sınıf bazında'],
                  ['ders', 'Ders bazında'],
                  ['kisi', 'Kişi bazında'],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => kapsamSec(val as Kapsam)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition text-left cursor-pointer text-sm font-medium text-slate-800"
                  >
                    <span>{label}</span>
                    <span className="text-slate-400">›</span>
                  </button>
                ))}
              </div>
            )}

            {adim === 'hedef' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {kapsam === 'program' ? 'Program seçin' : kapsam === 'sinif' ? 'Sınıf seçin' : kapsam === 'ders' ? 'Ders seçin' : 'Kişi seçin'}
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {kapsam !== 'kisi' && hedefler.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => { setSeciliHedef(h.id); setAdim('alanlar'); }}
                      className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-sm font-medium transition"
                    >
                      {h.ad}
                    </button>
                  ))}
                  {kapsam === 'kisi' && hedefler.map((h) => (
                    <label key={h.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={seciliKisiler.includes(h.id)}
                        onChange={() => kisiToggle(h.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span>{h.ad}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdim('kapsam')}
                    className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                  >
                    Geri
                  </button>
                  {kapsam === 'kisi' && (
                    <button
                      type="button"
                      disabled={seciliKisiler.length === 0}
                      onClick={() => setAdim('alanlar')}
                      className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition disabled:opacity-50"
                    >
                      İleri
                    </button>
                  )}
                </div>
              </div>
            )}

            {adim === 'alanlar' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Çıktı Formatı</p>
                  <div className="grid grid-cols-1 gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 select-none sm:grid-cols-3">
                    {[
                      { id: 'tablo', label: 'Excel (Tablo)' },
                      { id: 'grafikli', label: 'Excel (Grafikli)' },
                      { id: 'pdf', label: 'PDF (Detaylı)' },
                    ].map((item) => {
                      const aktif = ciktiTuru === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCiktiTuru(item.id as any)}
                          className={`relative flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                            aktif ? 'bg-[#1b4332] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {ciktiTuru === 'tablo' && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dahil Edilecek Veriler</p>
                    {[
                      ['bilgiler', 'Öğrenci Bilgileri'],
                      ['devamsizlik', 'Devamsızlık Kayıtları'],
                      ['sinavlar', 'Sınav & Not Dökümleri'],
                    ].map(([key, label]) => {
                      const secili = seciliAlanlar.includes(key as any);
                      return (
                        <div
                          key={key}
                          onClick={() => alanToggle(key as any)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer select-none ${
                            secili ? 'bg-emerald-500/10 border-emerald-500/35' : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`size-5 rounded-lg border flex items-center justify-center ${secili ? 'bg-[#1b4332] border-[#1b4332] text-white' : 'border-slate-300 bg-white'}`}>
                              {secili && <span className="text-xs font-bold leading-none">✓</span>}
                            </div>
                            <span className="text-xs font-semibold text-slate-800">{label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdim('hedef')}
                    className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                  >
                    Geri
                  </button>
                  <button
                    type="button"
                    disabled={(ciktiTuru === 'tablo' && seciliAlanlar.length === 0) || yukleniyor}
                    onClick={excelOlustur}
                    className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-[#1b4332] text-white hover:bg-[#153426] transition disabled:opacity-50"
                  >
                    {yukleniyor ? 'Oluşturuluyor...' : 'İndir'}
                  </button>
                                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
