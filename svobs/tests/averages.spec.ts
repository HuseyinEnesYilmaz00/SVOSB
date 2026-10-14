import { test, expect } from '@playwright/test'
import { studentAverages } from '../src/lib/averages'

test('averages preserve zero grades and distinguish students without records', () => {
  expect(studentAverages(['zero', 'grade', 'attendance', 'both', 'empty'], [
    { ogrenci_id: 'zero', puan: 0 }, { ogrenci_id: 'grade', puan: 80 },
    { ogrenci_id: 'both', puan: 80 }, { ogrenci_id: 'empty', puan: null },
  ], [
    { ogrenci_id: 'attendance', durum: 'katildi' },
    { ogrenci_id: 'both', durum: 'katildi' }, { ogrenci_id: 'both', durum: 'katilmadi' },
    { ogrenci_id: 'outside', durum: 'katildi' },
  ])).toEqual({ zero: 0, grade: 80, attendance: 100, both: 65, empty: null })
})
