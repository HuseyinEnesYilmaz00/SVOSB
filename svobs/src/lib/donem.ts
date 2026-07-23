// Bugünün tarihine göre "şu an içinde bulunduğumuz" akademik dönemi hesaplar.
// Eylül (9. ay) ve sonrası -> yeni akademik yıl başlamış demektir.
export function guncelAkademikDonem(): string {
  const bugun = new Date()
  const yil = bugun.getFullYear()
  const ay = bugun.getMonth() + 1 // 1-12
  const baslangicYili = ay >= 9 ? yil : yil - 1
  return `${baslangicYili}-${baslangicYili + 1}`
}

// Bir sınıfın kayıtlı dönemini (örn. "2024-2025") alır, bugünün tarihine göre
// gerekirse ileri sarar (örn. Eylül 2026 gelmişse "2026-2027" döner).
// Sınıf atlama YOK — sadece aynı sınıfın dönem etiketi ileri kayıyor.
export function guncelDonem(kayitliDonem: string): string {
  const eslesme = kayitliDonem?.match(/(\d{4})/)
  if (!eslesme) return kayitliDonem

  const kayitliBaslangicYili = parseInt(eslesme[1], 10)
  const guncelBaslangicYili = parseInt(guncelAkademikDonem().split('-')[0], 10)

  const nihaiYil = Math.max(kayitliBaslangicYili, guncelBaslangicYili)
  return `${nihaiYil}-${nihaiYil + 1}`
}


// Herhangi bir tarihin (örn. yoklama/teslim tarihi) hangi akademik döneme
// düştüğünü hesaplar. Eylül ve sonrası -> o yılın akademik dönemi.
export function tarihtenDonem(tarihStr: string): string {
  const tarih = new Date(tarihStr)
  const yil = tarih.getFullYear()
  const ay = tarih.getMonth() + 1
  const baslangicYili = ay >= 9 ? yil : yil - 1
  return `${baslangicYili}-${baslangicYili + 1}`
}
