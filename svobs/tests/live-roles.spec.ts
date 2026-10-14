import { test, expect, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'

try { process.loadEnvFile('.env.local') } catch { /* CI supplies environment variables. */ }
const enabled = !!process.env.SVOBS_QA_ADMIN_PASSWORD
const runId = process.env.SVOBS_QA_RUN_ID || `qa-${Date.now()}`
const password = process.env.SVOBS_QA_TEST_PASSWORD || randomBytes(18).toString('base64url')
const reportPath = `/tmp/${runId}-accounts.json`
const programs = [
  { name: 'Cagin Musablari', email: 'siyeregitimbirim@gmail.com', slug: 'musab' },
  { name: 'Siyer Akademi', email: 'siyeregitimbirim@gmail.com', slug: 'akademi' },
  { name: 'Cagin Esmalari', email: 'esmaadmin@siyervakfi.com', slug: 'esma' },
]
const records: Record<string, unknown>[] = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : []
function saveRecord(record: Record<string, unknown>) {
  records.push(record)
  fs.writeFileSync(reportPath, JSON.stringify(records, null, 2), { mode: 0o600 })
}
function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } })
}
async function login(page: Page, email: string, pass: string, route: string) {
  await page.goto('/giris')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(pass)
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${route}$`), { timeout: 45_000 })
}
async function createAccount(page: Page, kind: 'student' | 'teacher', email: string, classId: string) {
  if (kind === 'teacher') {
    await page.getByRole('button', { name: 'Diğer', exact: true }).click()
    await page.getByRole('button', { name: 'Hocalar', exact: true }).click()
    await page.getByRole('button', { name: /Hoca Ekle/ }).click()
  } else {
    await page.getByRole('button', { name: /Öğrenci Ekle/ }).click()
  }
  await page.getByPlaceholder('Ad', { exact: true }).fill(`QA ${runId}`)
  await page.getByPlaceholder('Soyad', { exact: true }).fill(kind === 'student' ? 'Öğrenci' : 'Öğretmen')
  await page.getByPlaceholder('ornek@mail.com').fill(email)
  await page.getByPlaceholder('En az 8 karakter').fill(password)
  if (kind === 'student') await page.locator('select').last().selectOption(classId)
  const response = page.waitForResponse(r => r.url().endsWith('/api/admin/kullanici-olustur') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click()
  const result = await response
  const body = await result.json()
  expect(result.ok(), JSON.stringify(body)).toBeTruthy()
  expect(body.user.id).toBeTruthy()
  return body.user.id as string
}
async function insert(db: SupabaseClient, table: string, row: Record<string, unknown>) {
  const { data, error } = await db.from(table).insert(row).select().single()
  expect(error, `${table}: ${error?.message}`).toBeNull()
  return data
}

for (const program of programs) {
  test(`${program.slug}: admin creates accounts; teacher and student workflows`, async ({ page, browser }) => {
    test.skip(!enabled, 'Set SVOBS_QA_ADMIN_PASSWORD to explicitly enable new-record live tests.')
    test.setTimeout(240_000)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    const db = client()
    const { error: loginError } = await db.auth.signInWithPassword({ email: program.email, password: process.env.SVOBS_QA_ADMIN_PASSWORD! })
    expect(loginError).toBeNull()
    const { data: selected, error } = await db.from('programlar').select('id').eq('ad', program.name).single()
    expect(error).toBeNull()
    const previous = records.find(r => r.program === program.slug)
    const existingClass = await db.from('siniflar').select('id').eq('program_id', selected!.id).eq('ad', `QA ${runId} ${program.slug}`).maybeSingle()
    const classRow = previous ? { id: previous.classId as string } : existingClass.data || await insert(db, 'siniflar', {
      program_id: selected!.id, ad: `QA ${runId} ${program.slug}`, donem: '2026-2027', yariyil: 'guz', arsivlendi: false,
    })
    const existingLesson = await db.from('dersler').select('id').eq('sinif_id', classRow.id).eq('ad', `QA ${runId} ders`).maybeSingle()
    const lesson = previous ? { id: previous.lessonId as string } : existingLesson.data || await insert(db, 'dersler', {
      sinif_id: classRow.id, ad: `QA ${runId} ders`, gun: 'Perşembe', saat: '14:00', aktif: true, periyot: 'haftalik',
    })
    const studentEmail = `${runId}-${program.slug}-student@example.com`
    const teacherEmail = `${runId}-${program.slug}-teacher@example.com`
    await login(page, program.email, process.env.SVOBS_QA_ADMIN_PASSWORD!, '/admin')
    await page.getByRole('button', { name: /Öğrenci Ekle/ }).waitFor({ timeout: 45_000 })
    const programButton = page.getByRole('button', { name: program.name, exact: true })
    if (await programButton.count()) await programButton.click()
    await page.getByRole('button', { name: /Öğrenci Ekle/ }).waitFor({ timeout: 45_000 })
    const studentId = previous?.studentId as string || await createAccount(page, 'student', studentEmail, classRow.id)
    const teacherId = previous?.teacherId as string || await createAccount(page, 'teacher', teacherEmail, classRow.id)
    if (!previous) saveRecord({ program: program.slug, programId: selected!.id, classId: classRow.id, lessonId: lesson.id, studentId, teacherId, studentEmail, teacherEmail })
    const { error: assignmentError } = await db.from('ogretmen_dersleri').upsert({ ogretmen_id: teacherId, ders_id: lesson.id }, { onConflict: 'ogretmen_id,ders_id' })
    expect(assignmentError).toBeNull()
    const { data: student, error: studentError } = await db.from('ogrenciler').select('id').eq('kullanici_id', studentId).single()
    expect(studentError).toBeNull()

    // Explicit allowlist: never click unknown actions on existing records.
    for (const tab of ['Dersler', 'Devam', 'Ödevler']) {
      await page.getByRole('button', { name: tab, exact: true }).click()
      await expect(page.locator('body')).not.toContainText('Admin paneli açılamadı')
    }
    for (const tab of ['Sınıflar', 'Notlar', 'Duyurular', 'Hocalar', 'Genel Bakış']) {
      await page.getByRole('button', { name: 'Diğer', exact: true }).click()
      await page.getByRole('button', { name: tab, exact: true }).click()
    }

    const teacherContext = await browser.newContext()
    const teacherPage = await teacherContext.newPage()
    teacherPage.on('pageerror', e => errors.push(e.message))
    await login(teacherPage, teacherEmail, password, '/ogretmen')
    await expect(teacherPage.locator('body')).toContainText(`QA ${runId}`, { timeout: 30_000 })
    // Only the newly created teacher's new class appears here.
    await teacherPage.getByRole('button', { name: 'Katıldı', exact: true }).first().click()
    await teacherPage.getByRole('button', { name: 'Kaydet', exact: true }).click()
    await expect(teacherPage.locator('body')).toContainText('Yoklama kaydedildi')
    // Saving again must update, never duplicate attendance.
    await teacherPage.getByRole('button', { name: 'Kaydet', exact: true }).click()
    const teacherDb = client()
    expect((await teacherDb.auth.signInWithPassword({ email: teacherEmail, password })).error).toBeNull()
    const attendance = await teacherDb.from('yoklamalar').select('id, durum').eq('ders_id', lesson.id).eq('ogrenci_id', student!.id)
    expect(attendance.error).toBeNull()
    expect(attendance.data).toHaveLength(1)
    expect(attendance.data![0].durum).toBe('katildi')
    if (!previous) await insert(teacherDb, 'notlar', { ogrenci_id: student!.id, ders_id: lesson.id, baslik: `QA ${runId}`, puan: 85, tarih: '2026-09-24' })
    for (const tab of ['Notlar', 'Ödevler', 'Duyurular']) await teacherPage.getByRole('button', { name: tab, exact: true }).click()

    const studentContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const studentPage = await studentContext.newPage()
    studentPage.on('pageerror', e => errors.push(e.message))
    await login(studentPage, studentEmail, password, '/ogrenci')
    await expect(studentPage.locator('body')).toContainText(`QA ${runId}`, { timeout: 30_000 })
    for (const tab of ['Dersler', 'Duyurular', 'Hesabım', 'Bildir', 'Program']) {
      await studentPage.getByRole('button', { name: tab, exact: true }).click()
    }
    const overflow = await studentPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBeFalsy()
    await studentPage.screenshot({ path: `/tmp/${runId}-${program.slug}-student.png`, fullPage: true })
    const studentDb = client()
    expect((await studentDb.auth.signInWithPassword({ email: studentEmail, password })).error).toBeNull()
    // Role escalation must be rejected, not silently accepted.
    const escalation = await studentDb.from('kullanicilar').update({ rol: 'super_admin' }).eq('id', studentId)
    expect(escalation.error).not.toBeNull()
    const denied = await studentPage.request.post('/api/admin/sifre-sifirla', { data: { userId: studentId, password } })
    expect(denied.status()).toBe(403)
    const otherProgram = await db.from('programlar').select('id').neq('id', selected!.id).limit(1)
    if (otherProgram.data?.length && program.slug === 'musab') {
      // The student can see only their own program, even through the direct API.
      const other = await studentDb.from('programlar').select('id').eq('id', otherProgram.data[0].id)
      expect(other.data).toEqual([])
    }
    expect(errors).toEqual([])
    await teacherContext.close()
    await studentContext.close()
  })
}

test('program boundaries reject cross-program reads and account changes', async ({ page }) => {
  test.skip(!enabled, 'Live QA is opt-in.')
  const musab = records.find(r => r.program === 'musab')!
  const esma = records.find(r => r.program === 'esma')!
  expect(musab).toBeTruthy()
  expect(esma).toBeTruthy()
  await login(page, 'esmaadmin@siyervakfi.com', process.env.SVOBS_QA_ADMIN_PASSWORD!, '/admin')
  for (const [route, data] of [
    ['sifre-sifirla', { userId: musab.studentId, password }],
    ['kullanici-sil', { userId: musab.teacherId }],
    ['ogrenci-sil', { ogrenciId: '00000000-0000-4000-8000-000000000001', kullaniciId: musab.studentId }],
    ['kullanici-olustur', { ad: 'QA', soyad: 'Forbidden', email: `${runId}-forbidden@example.com`, password, sinif_id: musab.classId }],
  ] as const) {
    const res = await page.request.post(`/api/admin/${route}`, { data })
    expect([400, 403]).toContain(res.status())
  }
  const db = client()
  expect((await db.auth.signInWithPassword({ email: 'esmaadmin@siyervakfi.com', password: process.env.SVOBS_QA_ADMIN_PASSWORD! })).error).toBeNull()
  expect((await db.from('kullanicilar').select('id').eq('id', musab.studentId)).data).toEqual([])
  expect((await db.from('siniflar').select('id').eq('id', musab.classId)).data).toEqual([])
  // Cross-program writes use only this run's fixtures.
  const denied = await db.from('dersler').insert({ sinif_id: musab.classId, ad: `QA ${runId} forbidden`, aktif: true })
  expect(denied.error).not.toBeNull()
  const anonymous = client()
  const exposed = await anonymous.from('kullanicilar').select('id').limit(1)
  expect(exposed.error).not.toBeNull()
})

test('report downloads and assignment upload/download preserve program boundaries', async ({ page, browser }) => {
  test.skip(!enabled, 'Live QA is opt-in.')
  test.setTimeout(240_000)
  const fixture = records.find(r => r.program === 'musab')!
  expect(fixture).toBeTruthy()
  await login(page, 'siyeregitimbirim@gmail.com', process.env.SVOBS_QA_ADMIN_PASSWORD!, '/admin')
  await page.getByRole('button', { name: /Öğrenci Ekle/ }).waitFor({ timeout: 30_000 })
  for (const format of ['Excel (Tablo)', 'Excel (Grafikli)', 'PDF (Detaylı)']) {
    await page.getByRole('button', { name: 'Diğer', exact: true }).click()
    await page.getByRole('button', { name: 'Dışa Aktar', exact: true }).click()
    await page.getByRole('button', { name: /Excel Raporu/ }).click()
    await page.getByRole('button', { name: 'Sınıf bazında' }).click()
    await page.getByRole('button', { name: `QA ${runId} musab`, exact: true }).click()
    await page.getByRole('button', { name: format, exact: true }).click()
    const download = page.waitForEvent('download', { timeout: 60_000 })
    await page.getByRole('button', { name: 'İndir', exact: true }).click()
    const file = await download
    expect(await file.failure()).toBeNull()
    const stream = await file.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
    const buffer = Buffer.concat(chunks)
    expect(buffer.length).toBeGreaterThan(500)
    expect(buffer.subarray(0, format.startsWith('PDF') ? 4 : 2).toString()).toBe(format.startsWith('PDF') ? '%PDF' : 'PK')
  }
  const teacherDb = client()
  expect((await teacherDb.auth.signInWithPassword({ email: fixture.teacherEmail as string, password })).error).toBeNull()
  const { data: existing } = await teacherDb.from('odevler').select('id').eq('ders_id', fixture.lessonId).eq('baslik', `QA ${runId} upload`).maybeSingle()
  const assignment = existing || await insert(teacherDb, 'odevler', { ders_id: fixture.lessonId, program_id: fixture.programId,
    baslik: `QA ${runId} upload`, tur: 'makale', donem: '2026-2027', olusturan_id: fixture.teacherId })
  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  await login(studentPage, fixture.studentEmail as string, password, '/ogrenci')
  const studentDb = client()
  expect((await studentDb.auth.signInWithPassword({ email: fixture.studentEmail as string, password })).error).toBeNull()
  const { data: student } = await studentDb.from('ogrenciler').select('id').eq('kullanici_id', fixture.studentId).single()
  const { default: HTMLtoDOCX } = await import('@turbodocx/html-to-docx')
  const document = await HTMLtoDOCX('<p>QA assignment content</p>', null, {})
  let submissionId = ''
  for (let i = 0; i < 2; i++) {
    const uploaded = await studentPage.request.post('/api/odev-teslim', { multipart: {
      dosya: { name: 'qa.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from(new Uint8Array(document instanceof Blob ? await document.arrayBuffer() : document)) },
      odevId: assignment.id, dersId: fixture.lessonId as string, ogrenciId: student!.id,
    } })
    const body = await uploaded.json()
    expect(uploaded.status(), JSON.stringify(body)).toBe(200)
    submissionId = body.teslim.id
  }
  expect((await studentDb.from('odev_teslimleri').select('id').eq('odev_id', assignment.id).eq('ogrenci_id', student!.id)).data).toHaveLength(1)
  const ownDownload = await studentPage.request.get(`/api/odev-export-docx?id=${submissionId}`)
  expect(ownDownload.status()).toBe(200)
  expect((await ownDownload.body()).subarray(0, 2).toString()).toBe('PK')
  const otherContext = await browser.newContext()
  const otherPage = await otherContext.newPage()
  await login(otherPage, 'esmaadmin@siyervakfi.com', process.env.SVOBS_QA_ADMIN_PASSWORD!, '/admin')
  expect((await otherPage.request.get(`/api/odev-export-docx?id=${submissionId}`)).status()).toBe(403)
  await studentContext.close()
  await otherContext.close()
})

test('teacher saves exam grades repeatedly without duplicate rows', async () => {
  test.skip(!enabled, 'Live QA is opt-in.')
  const fixture = records.find(r => r.program === 'musab')!
  const db = client()
  expect((await db.auth.signInWithPassword({ email: fixture.teacherEmail as string, password })).error).toBeNull()
  const { data: student } = await db.from('ogrenciler').select('id').eq('kullanici_id', fixture.studentId).single()
  const existing = await db.from('sinavlar').select('id, baslik, tarih').eq('ders_id', fixture.lessonId).eq('baslik', `QA ${runId} exam`).maybeSingle()
  const exam = existing.data || await insert(db, 'sinavlar', { ders_id: fixture.lessonId, baslik: `QA ${runId} exam`, tarih: '2026-09-24', olusturan_id: fixture.teacherId })
  const { saveExamGrades } = await import('../src/lib/save-grades')
  await saveExamGrades(db, fixture.lessonId as string, exam, { [student!.id]: '80' })
  await saveExamGrades(db, fixture.lessonId as string, exam, { [student!.id]: '85' })
  const grades = await db.from('notlar').select('id, puan').eq('sinav_id', exam.id).eq('ogrenci_id', student!.id)
  expect(grades.data).toHaveLength(1)
  expect(grades.data![0].puan).toBe(85)
  await expect(saveExamGrades(db, fixture.lessonId as string, exam, { [student!.id]: '101' })).rejects.toThrow('0 ile 100')
  const announcement = await db.from('duyurular').select('id').eq('hedef_sinif_id', fixture.classId).eq('baslik', `QA ${runId} notice`).maybeSingle()
  if (!announcement.data) await insert(db, 'duyurular', { program_id: fixture.programId, hedef_tipi: 'sinif', hedef_sinif_id: fixture.classId,
    yayinlayan_id: fixture.teacherId, baslik: `QA ${runId} notice`, icerik: 'Yalnızca yeni QA sınıfının test duyurusudur.' })
})

test('read-only screen navigation has no failed API requests', async ({ browser }) => {
  test.skip(!enabled, 'Live QA is opt-in.')
  test.setTimeout(180_000)
  const fixture = records.find(r => r.program === 'musab')!
  const roles = [
    { email: 'siyeregitimbirim@gmail.com', pass: process.env.SVOBS_QA_ADMIN_PASSWORD!, route: '/admin', tabs: ['Dersler', 'Devam', 'Ödevler', 'Öğrenciler'] },
    { email: 'esmaadmin@siyervakfi.com', pass: process.env.SVOBS_QA_ADMIN_PASSWORD!, route: '/admin', tabs: ['Dersler', 'Devam', 'Ödevler', 'Öğrenciler'] },
    { email: fixture.teacherEmail as string, pass: password, route: '/ogretmen', tabs: ['Notlar', 'Ödevler', 'Duyurular', 'Yoklama'] },
    { email: fixture.studentEmail as string, pass: password, route: '/ogrenci', tabs: ['Dersler', 'Duyurular', 'Hesabım', 'Bildir', 'Program'] },
  ]
  for (const role of roles) {
    const context = await browser.newContext({ viewport: { width: 820, height: 1180 } })
    const page = await context.newPage()
    const failures: string[] = []
    page.on('response', response => {
      if (response.status() >= 400) failures.push(`${response.status()} ${new URL(response.url()).pathname}`)
    })
    page.on('pageerror', error => failures.push(error.message))
    await login(page, role.email, role.pass, role.route)
    await page.waitForLoadState('networkidle')
    for (const tab of role.tabs) {
      await page.getByRole('button', { name: tab, exact: true }).click()
      await page.waitForLoadState('networkidle')
    }
    if (role.route === '/admin') {
      for (const tab of ['Sınıflar', 'Notlar', 'Duyurular', 'Hocalar', 'Genel Bakış']) {
        await page.getByRole('button', { name: 'Diğer', exact: true }).click()
        await page.getByRole('button', { name: tab, exact: true }).click()
        await page.waitForLoadState('networkidle')
      }
    }
    expect(failures, role.route).toEqual([])
    await context.close()
  }
})
