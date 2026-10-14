import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const [mode, file] = process.argv.slice(2)
if (!['snapshot', 'verify'].includes(mode) || !file) {
  throw new Error('Usage: node --env-file=.env.local scripts/qa-data-snapshot.mjs snapshot|verify /tmp/snapshot.json')
}
const tables = ['kullanicilar', 'kullanici_programlar', 'programlar', 'siniflar', 'dersler', 'ogrenciler',
  'ogretmen_dersleri', 'ders_sorumlulari', 'yoklamalar', 'notlar', 'sinavlar', 'odevler', 'odev_teslimleri',
  'duyurular', 'ders_oturumlari', 'push_abonelikleri']
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })
const current = {}
for (const table of tables) {
  current[table] = {}
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from(table).select('*').order('id').range(offset, offset + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    for (const row of data) current[table][row.id] = createHash('sha256').update(JSON.stringify(row)).digest('hex')
    if (data.length < 1000) break
  }
}
if (mode === 'snapshot') {
  fs.writeFileSync(file, JSON.stringify(current), { mode: 0o600, flag: 'wx' })
  console.log('Snapshot saved (row IDs and hashes only).')
} else {
  const before = JSON.parse(fs.readFileSync(file, 'utf8'))
  let existing = 0, changed = 0, missing = 0
  for (const [table, rows] of Object.entries(before)) {
    for (const [id, hash] of Object.entries(rows)) {
      existing++
      if (!current[table]?.[id]) missing++
      else if (current[table][id] !== hash) changed++
    }
  }
  console.log(JSON.stringify({ existing, changed, missing }))
  if (changed || missing) process.exitCode = 1
}
