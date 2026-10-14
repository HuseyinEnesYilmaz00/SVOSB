import { test, expect } from '@playwright/test'
import { occursOn, dateKey, fortnightDates, weekDates } from '../src/components/student/weekly-schedule'

test('calendar dates and repeated lessons respect their start date', () => {
  const lesson = { id: 'test', ad: 'Ders', gun: 'Perşembe', saat: '14:00', periyot: '2haftada1', baslangic_tarihi: '2026-09-17' }
  expect(occursOn(lesson, new Date(2026, 8, 24))).toBe(false)
  expect(occursOn(lesson, new Date(2026, 9, 1))).toBe(true)
  expect(occursOn({ ...lesson, periyot: 'haftalik' }, new Date(2026, 8, 10))).toBe(false)
  expect(weekDates(new Date(2026, 8, 27)).map(dateKey)).toEqual(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'])
  expect(fortnightDates(new Date(2026, 8, 27)).map(dateKey)).toEqual([
    '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27',
    '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
  ])
})

test('student schedule fits phones, supports day and week views, and shows account safely', async ({ page }) => {
  test.skip(!process.env.SVOBS_QA_TEST_PASSWORD, 'Read-only live test requires QA credentials.')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/giris')
  await page.locator('#email').fill('qa-20260924-1123-musab-student@example.com')
  await page.locator('#password').fill(process.env.SVOBS_QA_TEST_PASSWORD!)
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ders programım' })).toBeVisible({ timeout: 60000 })
  await page.getByRole('button', { name: /^Bu hafta, Perşembe,/ }).click()
  await expect(page.locator('article').first()).toBeVisible()
  await page.screenshot({ path: '/tmp/svobs-student-mobile.png', fullPage: true })
  for (const width of [320, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Tüm program', exact: true }).click()
  await expect(page.getByText('İki haftaya genel bakış')).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Pazartesi/ })).toBeVisible()
  await page.getByRole('button', { name: /^Bu hafta, Pazartesi,/ }).click()
  await expect(page.getByText('Bu gün için dersin yok.', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 320, height: 640 })
  await page.getByRole('button', { name: 'Hesabım', exact: true }).click()
  await expect(page.getByText('qa-20260924-1123-musab-student@example.com', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  // Simulated read responses exercise edge cases without writing any database records.
  const dates = weekDates(new Date())
  await page.route('**/rest/v1/dersler?*', async route => {
    if (!new URL(route.request().url()).searchParams.get('select')?.includes('periyot')) return route.continue()
    await route.fulfill({ json: [
      { id: 'schedule-demo-1', ad: 'Siyer Okumaları', gun: 'Perşembe', saat: '14:00:00', periyot: 'haftalik', ogretmen_dersleri: [] },
      { id: 'schedule-demo-2', ad: 'İslam Tarihi', gun: 'Perşembe', saat: '10:00:00', periyot: 'haftalik', ogretmen_dersleri: [] },
    ] })
  })
  await page.route('**/rest/v1/ders_oturumlari?*', route => route.fulfill({ json: [
    { ders_id: 'schedule-demo-1', tarih: dateKey(dates[3]) },
    // A cancellation outside this week must never cancel this week's lesson.
    { ders_id: 'schedule-demo-2', tarih: '2099-01-01' },
  ] }))
  await page.reload()
  await page.getByRole('button', { name: /^Bu hafta, Perşembe,/ }).click()
  await expect(page.getByText('Ders iptal edildi', { exact: true })).toBeVisible()
  await expect(page.getByText('Ders var', { exact: true })).toBeVisible()
  await expect(page.locator('article').first()).toContainText('İslam Tarihi')
  expect(errors).toEqual([])
})
