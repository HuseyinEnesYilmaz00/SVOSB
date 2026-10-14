import type { SupabaseClient } from '@supabase/supabase-js'

type Exam = { id: string; baslik: string; tarih: string }

export async function saveExamGrades(db: SupabaseClient, lessonId: string, exam: Exam, values: Record<string, string>) {
  const grades = Object.entries(values).filter(([, value]) => value.trim() !== '').map(([id, value]) => ({ id, score: Number(value) }))
  if (grades.some(({ score }) => !Number.isFinite(score) || score < 0 || score > 100)) {
    throw new Error('Notlar 0 ile 100 arasında olmalı.')
  }
  if (!grades.length) throw new Error('En az bir not girin.')
  const { data: existing, error } = await db.from('notlar').select('id, ogrenci_id')
    .eq('ders_id', lessonId).eq('sinav_id', exam.id).in('ogrenci_id', grades.map(g => g.id))
  if (error) throw new Error(error.message)
  const ids = new Map((existing || []).map(row => [row.ogrenci_id, row.id]))
  const newRows = grades.filter(g => !ids.has(g.id)).map(g => ({ ogrenci_id: g.id, ders_id: lessonId,
    sinav_id: exam.id, baslik: exam.baslik, puan: g.score, tarih: exam.tarih }))
  if (newRows.length) {
    const { error } = await db.from('notlar').insert(newRows)
    if (error) throw new Error(error.message)
  }
  const updates = await Promise.all(grades.filter(g => ids.has(g.id)).map(g =>
    db.from('notlar').update({ puan: g.score }).eq('id', ids.get(g.id))))
  const failed = updates.find(result => result.error)?.error
  if (failed) throw new Error(failed.message)
}
