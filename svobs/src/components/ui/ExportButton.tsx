'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

type Kapsam = 'program' | 'sinif' | 'kisi';
type VeriAlani = 'bilgiler' | 'devamsizlik' | 'sinavlar';

interface Secenek { id: string; ad: string; }

const DURUM_RENK = { Devam: '#16a34a', 'Geç Katıldı': '#ca8a04', Mazeret: '#2563eb', Katılmadı: '#dc2626' };

export default function ExportButton({ izinliProgramIdler }: { izinliProgramIdler?: string[] }) {
  const [acik, setAcik] = useState(false);
  const [adim, setAdim] = useState<'kapsam' | 'hedef' | 'alanlar'>('kapsam');
  const [kapsam, setKapsam] = useState<Kapsam | null>(null);
  const [hedefler, setHedefler] = useState<Secenek[]>([]);
  const [seciliHedef, setSeciliHedef] = useState<string>(''); // program / sinif için
  const [seciliKisiler, setSeciliKisiler] = useState<string[]>([]); // kisi için (çoklu)
  const [seciliAlanlar, setSeciliAlanlar] = useState<VeriAlani[]>(['bilgiler']);
  const [ciktiTuru, setCiktiTuru] = useState<'tablo' | 'grafikli' | 'pdf'>('tablo');
  const [yukleniyor, setYukleniyor] = useState(false);
  
  // JSON Yedekleme için ayrı loading state'i
  const [yedekIndiriyor, setYedekIndiriyor] = useState(false);
  
  const supabase = createClient();

  // --- SENİN EXCEL/PDF RAPORLAMA FONKSİYONLARIN BAŞLANGICI ---
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
      let sorgu = supabase.from('ogrenciler').select('id, kullanicilar(ad, soyad), siniflar!inner(program_id)');
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
    if (kapsam === 'kisi') return seciliKisiler;
    if (kapsam === 'sinif') {
      const { data } = await supabase.from('ogrenciler').select('id').eq('sinif_id', seciliHedef);
      return (data ?? []).map((d: any) => d.id);
    }
    const { data: siniflarData } = await supabase.from('siniflar').select('id').eq('program_id', seciliHedef);
    const sinifIdleri = (siniflarData ?? []).map((s: any) => s.id);
    if (sinifIdleri.length === 0) return [];
    const { data } = await supabase.from('ogrenciler').select('id').in('sinif_id', sinifIdleri);
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

  async function ogrenciGrafikVerisi(ogrenciId: string) {
    const { data: ogrenci } = await supabase.from('ogrenciler').select('sinif_id').eq('id', ogrenciId).single();
    if (!ogrenci) return [];
    const { data: dersler } = await supabase.from('dersler').select('id, ad').eq('sinif_id', ogrenci.sinif_id);
    const { data: yoklamalar } = await supabase.from('yoklamalar').select('ders_id, durum').eq('ogrenci_id', ogrenciId);

    return (dersler ?? []).map((d: any) => {
      const buDers = (yoklamalar ?? []).filter((y: any) => y.ders_id === d.id);
      return {
        ad: d.ad,
        Devam: buDers.filter((y: any) => y.durum === 'katildi').length,
        'Geç Katıldı': buDers.filter((y: any) => y.durum === 'gec').length,
        Mazeret: buDers.filter((y: any) => y.durum === 'izinli').length,
        Katılmadı: buDers.filter((y: any) => y.durum === 'katilmadi').length,
      };
    });
  }

  async function ogrenciOrtalamalari(ogrenciId: string) {
  const { data: notlar } = await supabase.from('notlar').select('puan').eq('ogrenci_id', ogrenciId);
  const { data: yoklamalar } = await supabase.from('yoklamalar').select('durum').eq('ogrenci_id', ogrenciId);
  
  // Geç ve İzinli = 0
  const devamPuanlari: Record<string, number> = { katildi: 100, gec: 0, izinli: 0, katilmadi: 0 };

  const sinavOrt = notlar && notlar.length > 0 ? notlar.reduce((s: number, n: any) => s + n.puan, 0) / notlar.length : null;
  const devamOrt = yoklamalar && yoklamalar.length > 0 ? yoklamalar.reduce((s: number, y: any) => s + (devamPuanlari[y.durum] || 0), 0) / yoklamalar.length : null;

  let genel: number | null = null;
  // %50 / %50 Ağırlık
  if (sinavOrt !== null && devamOrt !== null) genel = sinavOrt * 0.5 + devamOrt * 0.5;
  else if (sinavOrt !== null) genel = sinavOrt;
  else if (devamOrt !== null) genel = devamOrt;

  return {
    notOrt: sinavOrt !== null ? Math.round(sinavOrt * 10) / 10 : null,
    yoklamaOrt: devamOrt !== null ? Math.round(devamOrt * 10) / 10 : null,
    genelOrt: genel !== null ? Math.round(genel * 10) / 10 : null,
  };
}


  function grafikCiz(veri: any[], baslik: string): string {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 450;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(baslik, 20, 30);

    const alanUst = 60, alanAlt = 60, alanSol = 55, alanSag = 20;
    const grafikYuksek = canvas.height - alanUst - alanAlt;
    const grafikGenis = canvas.width - alanSol - alanSag;
    const maxDeger = Math.max(1, ...veri.flatMap((v) => [v.Devam, v['Geç Katıldı'], v.Mazeret, v.Katılmadı]));

    ctx.strokeStyle = '#d1d5db';
    ctx.beginPath();
    ctx.moveTo(alanSol, alanUst);
    ctx.lineTo(alanSol, alanUst + grafikYuksek);
    ctx.lineTo(alanSol + grafikGenis, alanUst + grafikYuksek);
    ctx.stroke();

    const adimSayisi = 5;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= adimSayisi; i++) {
      const deger = Math.round((maxDeger * i) / adimSayisi);
      const y = alanUst + grafikYuksek - (grafikYuksek * i) / adimSayisi;

      ctx.strokeStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(alanSol, y);
      ctx.lineTo(alanSol + grafikGenis, y);
      ctx.stroke();

      ctx.fillStyle = '#6b7280';
      ctx.fillText(String(deger), alanSol - 8, y);
    }
    ctx.textBaseline = 'alphabetic';

    const dersGenislik = grafikGenis / veri.length;
    const barGenislik = (dersGenislik * 0.7) / 4;

    veri.forEach((v, i) => {
      const dersX = alanSol + i * dersGenislik + dersGenislik * 0.15;
      const anahtarlar = ['Devam', 'Geç Katıldı', 'Mazeret', 'Katılmadı'] as const;
      anahtarlar.forEach((key, j) => {
        const deger = v[key];
        const barYuksek = (deger / maxDeger) * grafikYuksek;
        const x = dersX + j * barGenislik;
        const y = alanUst + grafikYuksek - barYuksek;
        ctx.fillStyle = (DURUM_RENK as any)[key];
        ctx.fillRect(x, y, barGenislik - 2, barYuksek);
      });

      ctx.fillStyle = '#374151';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(v.ad, dersX + dersGenislik * 0.35, alanUst + grafikYuksek + 18);
    });

    let legendX = alanSol;
    Object.entries(DURUM_RENK).forEach(([ad, renk]) => {
      ctx.fillStyle = renk;
      ctx.fillRect(legendX, canvas.height - 20, 10, 10);
      ctx.fillStyle = '#374151';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ad, legendX + 14, canvas.height - 11);
      legendX += ctx.measureText(ad).width + 40;
    });

    return canvas.toDataURL('image/png').split(',')[1];
  }

  function dersDegeriHesapla(ogrenciId: string, dersId: string, tumNotlar: any[], tumYoklamalar: any[]): number | null {
  const notlarBu = tumNotlar.filter((n) => n.ogrenci_id === ogrenciId && n.ders_id === dersId);
  if (notlarBu.length > 0) {
    return Math.round((notlarBu.reduce((s, n) => s + n.puan, 0) / notlarBu.length) * 10) / 10;
  }
  // Geç ve İzinli = 0
  const devamPuanlari: Record<string, number> = { katildi: 100, gec: 0, izinli: 0, katilmadi: 0 };
  const yoklamaBu = tumYoklamalar.filter((y) => y.ogrenci_id === ogrenciId && y.ders_id === dersId);
  if (yoklamaBu.length === 0) return null;
  return Math.round((yoklamaBu.reduce((s, y) => s + (devamPuanlari[y.durum] || 0), 0) / yoklamaBu.length) * 10) / 10;
}


  async function fontYukleVeEkle(doc: jsPDF) {
    const res = await fetch('/fonts/Roboto-Regular.ttf');
    const buffer = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    doc.addFileToVFS('Roboto-Regular.ttf', base64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');
  }

  async function pdfOlustur(ogrenciIdleri: string[]) {
    const doc = new jsPDF({ orientation: 'landscape' });
    await fontYukleVeEkle(doc);

    const { data: ogrenciler } = await supabase
      .from('ogrenciler')
      .select('id, numara, kullanicilar(ad, soyad), sinif_id, siniflar(ad)')
      .in('id', ogrenciIdleri)
      .order('numara');

    const sinifIdleri = [...new Set((ogrenciler ?? []).map((o: any) => o.sinif_id))];

    const { data: tumNotlar } = await supabase.from('notlar').select('ogrenci_id, ders_id, puan').in('ogrenci_id', ogrenciIdleri).not('ders_id', 'is', null);
    const { data: tumYoklamalar } = await supabase.from('yoklamalar').select('ogrenci_id, ders_id, durum').in('ogrenci_id', ogrenciIdleri);

    let ilkSayfa = true;
    const devamPuanlari: Record<string, number> = { katildi: 100, gec: 0, izinli: 0, katilmadi: 0 };

    for (const sinifId of sinifIdleri) {
      const { data: dersler } = await supabase.from('dersler').select('id, ad').eq('sinif_id', sinifId).order('ad');
      const sinifOgrencileri = (ogrenciler ?? []).filter((o: any) => o.sinif_id === sinifId);
      const sinifAdi = (sinifOgrencileri[0]?.siniflar as any)?.ad ?? '';

      if (!ilkSayfa) doc.addPage();
      ilkSayfa = false;

      doc.setFont('Roboto');
      doc.setFontSize(13);
      doc.text(`${sinifAdi} — Sınav ve Yoklama Sonuçları`, 14, 15);

      const basliklar = ['#', 'Ad Soyad', ...(dersler ?? []).map((d: any) => d.ad), 'Not Ort.', 'Yoklama Ort.', 'Genel Ort.'];
      const satirlar: any[] = [];

      for (const o of sinifOgrencileri) {
        const adSoyad = `${(o.kullanicilar as any)?.ad ?? ''} ${(o.kullanicilar as any)?.soyad ?? ''}`.trim();
        const dersDegerleri = (dersler ?? []).map((d: any) => {
          const v = dersDegeriHesapla(o.id, d.id, tumNotlar ?? [], tumYoklamalar ?? []);
          return v === null ? '-' : v;
        });

                // pdfOlustur fonksiyonunun içindeki döngüde yer alan kısmı güncelliyoruz:
        const notlarBuOgrenci = (tumNotlar ?? []).filter((n: any) => n.ogrenci_id === o.id);
        const yoklamalarBuOgrenci = (tumYoklamalar ?? []).filter((y: any) => y.ogrenci_id === o.id);
        
        const notOrt = notlarBuOgrenci.length > 0 ? Math.round((notlarBuOgrenci.reduce((s: number, n: any) => s + n.puan, 0) / notlarBuOgrenci.length) * 10) / 10 : null;
        
        // Geç ve İzinli = 0
        const devamPuanlari: Record<string, number> = { katildi: 100, gec: 0, izinli: 0, katilmadi: 0 };
        const yoklamaOrt = yoklamalarBuOgrenci.length > 0 ? Math.round((yoklamalarBuOgrenci.reduce((s: number, y: any) => s + (devamPuanlari[y.durum] || 0), 0) / yoklamalarBuOgrenci.length) * 10) / 10 : null;
        
        // %50 / %50 Ağırlık
        const genelOrt = notOrt !== null && yoklamaOrt !== null ? Math.round((notOrt * 0.5 + yoklamaOrt * 0.5) * 10) / 10 : (notOrt ?? yoklamaOrt);

        satirlar.push([o.numara, adSoyad, ...dersDegerleri, notOrt ?? '-', yoklamaOrt ?? '-', genelOrt ?? '-']);
      }

      autoTable(doc, {
        head: [basliklar],
        body: satirlar,
        startY: 20,
        styles: { fontSize: 8, font: 'Roboto' },
        headStyles: { fillColor: [52, 78, 65], font: 'Roboto' },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index >= 2) {
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
      const base64 = grafikCiz(grafikVeri, `${adSoyad} — Devam Durumu`);
      doc.addPage();
      doc.addImage(`data:image/png;base64,${base64}`, 'PNG', 15, 20, 260, 130);
    }

    const tarih = new Date().toISOString().slice(0, 10);
    doc.save(`siyerobs-rapor-${tarih}.pdf`);
  }

  async function grafikliExcelOlustur(ogrenciIdleri: string[]) {
    const wb = new ExcelJS.Workbook();

    const { data } = await supabase
      .from('ogrenciler')
      .select('id, numara, kullanicilar(ad, soyad), siniflar(ad)')
      .in('id', ogrenciIdleri);

    const ozetSayfa = wb.addWorksheet('Özet');
    ozetSayfa.columns = [
      { header: '#', key: 'numara', width: 6 },
      { header: 'Ad Soyad', key: 'adSoyad', width: 25 },
      { header: 'Sınıf', key: 'sinif', width: 20 },
      { header: 'Not Ortalaması', key: 'notOrt', width: 16 },
      { header: 'Yoklama Oranı', key: 'yoklamaOrt', width: 16 },
      { header: 'Genel Ortalama', key: 'genelOrt', width: 16 },
    ];
    ozetSayfa.getRow(1).font = { bold: true };

    for (const o of (data ?? [])) {
      const ort = await ogrenciOrtalamalari(o.id);
      ozetSayfa.addRow({
        numara: o.numara,
        adSoyad: `${(o.kullanicilar as any)?.ad ?? ''} ${(o.kullanicilar as any)?.soyad ?? ''}`.trim(),
        sinif: (o.siniflar as any)?.ad ?? '',
        notOrt: ort.notOrt ?? '-',
        yoklamaOrt: ort.yoklamaOrt ?? '-',
        genelOrt: ort.genelOrt ?? '-',
      });

      const adSoyad = `${(o.kullanicilar as any)?.ad ?? ''} ${(o.kullanicilar as any)?.soyad ?? ''}`.trim();
      const sayfaAdi = adSoyad.slice(0, 28) || 'Öğrenci';
      const ogrenciSayfa = wb.addWorksheet(sayfaAdi);

      const grafikVeri = await ogrenciGrafikVerisi(o.id);
      if (grafikVeri.length > 0) {
        const base64 = grafikCiz(grafikVeri, `${adSoyad} — Devam Durumu`);
        const imgId = wb.addImage({ base64, extension: 'png' });
        ogrenciSayfa.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 900, height: 450 } });
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
    const wb = XLSX.utils.book_new();

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

    const adHaritasiGerekli = ['devamsizlik', 'sinavlar'].some((a) => seciliAlanlar.includes(a as VeriAlani));
    const adHaritasi = adHaritasiGerekli ? await ogrenciAdHaritasi(ogrenciIdleri) : {};

    if (seciliAlanlar.includes('devamsizlik')) {
      const { data } = await supabase
        .from('yoklamalar')
        .select('ogrenci_id, tarih, durum, aciklama, dersler(ad)')
        .in('ogrenci_id', ogrenciIdleri);

      const satirlar = (data ?? []).map((d: any) => ({
        'Öğrenci': adHaritasi[d.ogrenci_id] ?? d.ogrenci_id,
        'Ders': d.dersler?.ad ?? '',
        'Tarih': d.tarih,
        'Durum': d.durum,
        'Açıklama': d.aciklama ?? '',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(satirlar), 'Devamsızlık');
    }

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
    XLSX.writeFile(wb, `siyerobs-rapor-${tarih}.xlsx`);
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
      
      setAcik(false);
      setAdim('kapsam');
    } catch (e: any) {
      alert('Export başarısız: ' + JSON.stringify(e?.message || e));
    } finally {
      setYukleniyor(false);
    }
  }

  // --- YENİ EKLENEN JSON YEDEKLEME FONKSİYONU ---
  async function tamYedekAl() {
    if (!izinliProgramIdler || izinliProgramIdler.length === 0) {
      alert('Aktif program bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }

    const programId = izinliProgramIdler[0];
    setYedekIndiriyor(true);

    try {
      // 1. Program bilgisini al
      const { data: programData } = await supabase.from('programlar').select('*').eq('id', programId).single();

      // 2. Sınıfları al
      const { data: siniflar } = await supabase.from('siniflar').select('*').eq('program_id', programId);
      const sinifIdleri = siniflar?.map(s => s.id) || [];

      let ogrenciler = [], dersler = [], notlar = [], yoklamalar = [], odevler = [], duyurular = [];

      if (sinifIdleri.length > 0) {
        // 3. Öğrenciler
        const { data: oData } = await supabase.from('ogrenciler').select('*, kullanicilar(*)').in('sinif_id', sinifIdleri);
        ogrenciler = oData || [];

        // 4. Dersler
        const { data: dData } = await supabase.from('dersler').select('*').in('sinif_id', sinifIdleri);
        dersler = dData || [];
        
        const dersIdleri = dersler.map(d => d.id);

        if (dersIdleri.length > 0) {
          // 5. Notlar
          const { data: nData } = await supabase.from('notlar').select('*').in('ders_id', dersIdleri);
          notlar = nData || [];

          // 6. Yoklamalar
          const { data: yData } = await supabase.from('yoklamalar').select('*').in('ders_id', dersIdleri);
          yoklamalar = yData || [];

          // 7. Ödevler
          const { data: odData } = await supabase.from('odevler').select('*').in('ders_id', dersIdleri);
          odevler = odData || [];
        }
      }

      // 8. Duyurular
      const { data: duyuruData } = await supabase.from('duyurular').select('*').eq('program_id', programId);
      duyurular = duyuruData || [];

      // Tüm veriyi birleştir
      const yedekVerisi = {
        olusturulma_tarihi: new Date().toISOString(),
        program: programData,
        siniflar,
        ogrenciler,
        dersler,
        notlar,
        yoklamalar,
        odevler,
        duyurular
      };

      // Blob ile bilgisayara JSON olarak indir
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

    } catch (error: any) {
      alert('Yedek alınırken bir hata oluştu: ' + error.message);
    } finally {
      setYedekIndiriyor(false);
    }
  }

  const devamEdilebilir = kapsam === 'kisi' ? seciliKisiler.length > 0 : !!seciliHedef;

  return (
    <>
      <div className="flex gap-2 items-center">
        {/* SENİN EXCEL/PDF BUTONUN */}
        <Button variant="outline" size="sm" onClick={() => setAcik(true)}>
          Rapor / Excel
        </Button>
        
        {/* YENİ EKLENEN SİSTEM YEDEKLEME BUTONU */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={tamYedekAl} 
          disabled={yedekIndiriyor}
          className={yedekIndiriyor ? 'animate-pulse bg-amber-50 text-amber-600 border-amber-200' : ''}
        >
          {yedekIndiriyor ? 'Hazırlanıyor...' : 'Tam Yedek İndir (JSON)'}
        </Button>
      </div>

      {/* SENİN MEVCUT MODAL KODLARIN */}
      {acik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[85vh] overflow-y-auto">
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

            {adim === 'hedef' && kapsam !== 'kisi' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {kapsam === 'program' ? 'Program seç' : 'Sınıf seç'}
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
                    disabled={!devamEdilebilir}
                    onClick={() => setAdim('alanlar')}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90"
                  >
                    Devam Et
                  </button>
                </div>
              </div>
            )}

            {adim === 'hedef' && kapsam === 'kisi' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Öğrenci seç (birden fazla seçebilirsin)</p>
                <div className="max-h-60 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
                  {hedefler.map((h) => (
                    <label key={h.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={seciliKisiler.includes(h.id)}
                        onChange={() => kisiToggle(h.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                      {h.ad}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setAdim('kapsam')} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted">Geri</button>
                  <button
                    disabled={!devamEdilebilir}
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
                <p className="text-sm text-muted-foreground">Çıktı türü</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCiktiTuru('tablo')}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${ciktiTuru === 'tablo' ? 'border-primary bg-muted' : 'border-border hover:bg-muted'}`}
                  >
                    Excel (Tablo)
                  </button>
                  <button
                    onClick={() => setCiktiTuru('grafikli')}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${ciktiTuru === 'grafikli' ? 'border-primary bg-muted' : 'border-border hover:bg-muted'}`}
                  >
                    Excel (Grafikli)
                  </button>
                  <button
                    onClick={() => setCiktiTuru('pdf')}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${ciktiTuru === 'pdf' ? 'border-primary bg-muted' : 'border-border hover:bg-muted'}`}
                  >
                    PDF (Detaylı)
                  </button>
                </div>

                {ciktiTuru === 'tablo' && (
                  <>
                    <p className="text-sm text-muted-foreground pt-2">Hangi veriler dahil olsun?</p>
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
                  </>
                )}

                {ciktiTuru === 'grafikli' && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                    Her öğrenci için ayrı sayfa + devam grafiği oluşturulacak. Öğrenci sayısı fazlaysa oluşturma birkaç saniye sürebilir.
                  </p>
                )}

                {ciktiTuru === 'pdf' && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                    Sınıf bazında ders sütunlu özet tablo + her öğrenci için ayrı sayfada devam grafiği oluşturulacak.
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setAdim('hedef')} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted">Geri</button>
                  <button
                    disabled={(ciktiTuru === 'tablo' && seciliAlanlar.length === 0) || yukleniyor}
                    onClick={excelOlustur}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90"
                  >
                    {yukleniyor ? 'Oluşturuluyor...' : 'İndir'}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => { setAcik(false); setAdim('kapsam'); setSeciliKisiler([]); setSeciliHedef(''); setCiktiTuru('tablo'); }}
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
