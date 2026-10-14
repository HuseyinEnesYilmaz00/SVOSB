import { expect, test } from '@playwright/test'
import { safeAuthRedirect } from '../src/lib/auth-redirect'

test('auth callbacks never redirect credentials to another site', () => {
  for (const path of [null, '', 'https://example.com', '//example.com', '/\\example.com', '/\n/example.com']) {
    expect(safeAuthRedirect(path)).toBe('/sifre-degistir')
  }
  expect(safeAuthRedirect('/sifre-degistir')).toBe('/sifre-degistir')
  expect(safeAuthRedirect('/giris?from=recovery')).toBe('/giris?from=recovery')
})

test('missing or expired reset links show recovery guidance', async ({ page }) => {
  await page.goto('/auth/callback?next=//example.com')
  await expect(page).toHaveURL(/\/sifre-degistir\?hata=gecersiz-link$/)
  await expect(page.getByRole('main').getByRole('alert')).toContainText('geçersiz')
  await expect(page.getByRole('button', { name: 'Şifreyi Değiştir' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Yeni Bağlantı İste' })).toBeVisible()
})
