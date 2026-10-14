import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
try { process.loadEnvFile('.env.local') } catch { /* CI supplies environment. */ }

test('archived Bülbüldere stays in archive, not current class selectors', async ({ page }) => {
  test.skip(!process.env.SVOBS_QA_ADMIN_PASSWORD, 'Read-only check requires admin credentials.')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/giris')
  await page.locator('#email').fill('siyeregitimbirim@gmail.com')
  await page.locator('#password').fill(process.env.SVOBS_QA_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Öğrenciler', exact: true })).toBeVisible({ timeout: 60000 })
  const nav = page.getByRole('navigation', { name: 'Yönetim bölümleri' })
  await page.getByRole('button', { name: '+ Öğrenci Ekle', exact: true }).click()
  await expect(page.locator('option').filter({ hasText: /^Bülbüldere$/ })).toHaveCount(1, { timeout: 30000 })
  await page.getByRole('button', { name: 'İptal', exact: true }).click()
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const programId = await page.getByLabel('Eğitim programı').inputValue()
    const { data: courses, error } = await db.from('dersler').select('id, siniflar!inner(program_id, arsivlendi)').eq('siniflar.program_id', programId)
    expect(error).toBeNull()
    const expected = (courses || []).filter(course => {
      const classroom = Array.isArray(course.siniflar) ? course.siniflar[0] : course.siniflar
      return classroom && !classroom.arsivlendi
    }).map(course => course.id).sort()
    await page.getByRole('button', { name: 'Sorumluluk', exact: true }).first().click()
    const actual = await page.getByLabel('Ders Seç', { exact: true }).locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).filter(Boolean).sort())
    expect(actual).toEqual(expected)
    await page.getByRole('button', { name: 'İptal', exact: true }).click()
  }
  await nav.getByRole('button', { name: 'Dersler', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bülbüldere', exact: true })).toHaveCount(1, { timeout: 30000 })
  for (const name of ['Devam', 'Notlar', 'Ödevler']) {
    await nav.getByRole('button', { name, exact: true }).click()
    // Wait for the new panel, not the class selector shared by outgoing panels.
    if (name === 'Devam') await expect(page.locator('input[type="date"]')).toBeVisible()
    if (name === 'Notlar') await expect(page.getByRole('button', { name: 'Not Girişi', exact: true })).toBeVisible()
    if (name === 'Ödevler') await expect(page.getByRole('button', { name: '+ Ödev Ekle', exact: true })).toBeVisible()
    await expect(page.locator('option').filter({ hasText: /^Bülbüldere$/ })).toHaveCount(1, { timeout: 30000 })
  }
  await nav.getByRole('button', { name: 'Sınıflar', exact: true }).click()
  const row = page.getByRole('row').filter({ hasText: 'Bülbüldere' })
  await expect(row).toHaveCount(1, { timeout: 30000 })
  await expect(row).toContainText('2026-2027')
  await page.getByRole('button', { name: 'Arşivlenenleri Gör', exact: true }).click()
  await expect(row).toHaveCount(1, { timeout: 30000 })
  await expect(row).toContainText('2025-2026')
})
