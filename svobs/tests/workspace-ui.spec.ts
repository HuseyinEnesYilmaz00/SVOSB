import { test, expect, type Page } from '@playwright/test'

async function login(page: Page, email: string, password: string, heading: string) {
  await page.goto('/giris')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click()
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({ timeout: 60000 })
  await page.addStyleTag({ content: 'nextjs-portal{display:none}' })
}
async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}
for (const program of ['musab', 'esma']) {
  test(`${program}: teacher responsive navigation and attendance controls (read only)`, async ({ page }) => {
    test.skip(!process.env.SVOBS_QA_TEST_PASSWORD, 'Requires existing QA teacher credentials.')
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, `qa-20260924-1123-${program}-teacher@example.com`, process.env.SVOBS_QA_TEST_PASSWORD!, 'Yoklama')
    await expect(page.getByLabel('Ders ve sınıf')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Katıldı', exact: true }).first()).toBeVisible({ timeout: 20000 })
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await fits(page)
      const nav = page.getByRole('navigation', { name: width >= 1024 ? 'Öğretmen bölümleri' : 'Öğretmen mobil menüsü' })
      for (const name of ['Notlar', 'Ödevler', 'Duyurular', 'Yoklama']) {
        await nav.getByRole('button', { name, exact: true }).click()
        await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
        await page.waitForTimeout(350)
        await fits(page)
      }
    }
    await expect(page.getByRole('button', { name: 'Katıldı', exact: true }).first()).toBeVisible({ timeout: 30000 })
    await page.screenshot({ path: `/tmp/svobs-${program}-teacher-desktop.png`, fullPage: true, style: 'nextjs-portal{display:none}' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: `/tmp/svobs-${program}-teacher-mobile.png`, fullPage: true, style: 'nextjs-portal{display:none}' })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('navigation', { name: 'Öğretmen mobil menüsü' }).getByRole('button', { name: 'Notlar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Notlar', exact: true })).toBeVisible()
    expect(errors).toEqual([])
  })
  test(`${program}: admin search, context switch, desktop/mobile navigation (read only)`, async ({ page }) => {
    test.skip(!process.env.SVOBS_QA_ADMIN_PASSWORD, 'Requires admin credentials; no records are changed.')
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, `${program}admin@siyervakfi.com`, process.env.SVOBS_QA_ADMIN_PASSWORD!, 'Öğrenciler')
    await page.getByRole('searchbox', { name: 'Öğrenci ara' }).fill('QA')
    await expect(page.getByRole('searchbox')).toHaveValue('QA')
    await page.screenshot({ path: `/tmp/svobs-${program}-admin-mobile.png`, fullPage: true, style: 'nextjs-portal{display:none}' })
    await page.getByRole('button', { name: '+ Öğrenci Ekle', exact: true }).click()
    await expect(page.getByText('Yeni Öğrenci', { exact: true })).toBeVisible()
    await fits(page)
    await page.getByRole('button', { name: 'İptal', exact: true }).click()
    await expect(page.getByText('Yeni Öğrenci', { exact: true })).not.toBeVisible()
    await page.getByRole('searchbox').fill('no-match-qa-947573')
    await expect(page.getByText('Aramana uygun öğrenci bulunamadı.').or(page.getByText('Henüz öğrenci eklenmemiş', { exact: true }))).toBeVisible()
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await fits(page)
      const nav = page.getByRole('navigation', { name: width >= 1024 ? 'Yönetim bölümleri' : 'Yönetim mobil menüsü' })
      for (const name of ['Dersler', 'Devam', 'Ödevler', 'Öğrenciler']) {
        await nav.getByRole('button', { name, exact: true }).click()
        await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
        await page.waitForTimeout(450)
        await fits(page)
      }
    }
    await page.getByRole('searchbox').fill('QA')
    await page.screenshot({ path: `/tmp/svobs-${program}-admin-desktop.png`, fullPage: true, style: 'nextjs-portal{display:none}' })
    await page.setViewportSize({ width: 320, height: 640 })
    await page.getByRole('button', { name: 'Diğer', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Diğer', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Diğer', exact: true })).toBeFocused()
    for (const name of ['Sınıflar', 'Notlar', 'Duyurular', 'Hocalar', 'Genel Bakış']) {
      await page.getByRole('button', { name: 'Diğer', exact: true }).click()
      await page.locator('#workspace-more').getByRole('button', { name, exact: true }).click()
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
      await page.waitForTimeout(450)
      await fits(page)
    }
    const select = page.getByLabel('Eğitim programı')
    if (await select.locator('option').count() > 1) {
      await select.selectOption({ index: 1 })
      await fits(page)
    }
    expect(errors).toEqual([])
  })
}
