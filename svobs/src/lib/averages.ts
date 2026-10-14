type Grade = { ogrenci_id: string; puan: number | null }
type Attendance = { ogrenci_id: string; durum: string }

export function studentAverages(ids: string[], grades: Grade[], attendance: Attendance[]) {
  const totals = new Map(ids.map(id => [id, { sum: 0, count: 0, attended: 0, sessions: 0 }]))
  for (const grade of grades) {
    const total = totals.get(grade.ogrenci_id)
    if (total && grade.puan !== null && Number.isFinite(grade.puan)) {
      total.sum += grade.puan
      total.count++
    }
  }
  for (const entry of attendance) {
    const total = totals.get(entry.ogrenci_id)
    if (total) {
      total.sessions++
      if (entry.durum === 'katildi') total.attended++
    }
  }
  return Object.fromEntries([...totals].map(([id, total]) => {
    const grade = total.count ? total.sum / total.count : null
    const participation = total.sessions ? total.attended * 100 / total.sessions : null
    return [id, grade === null ? participation : participation === null ? grade : (grade + participation) / 2]
  })) as Record<string, number | null>
}
