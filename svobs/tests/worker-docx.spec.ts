import { test, expect } from '@playwright/test'
import fs from 'node:fs'

test('worker exports existing QA submission as a DOCX without native dependencies', async ({ page }) => {
  test.skip(!process.env.SVOBS_QA_ADMIN_PASSWORD, 'Read-only QA export test.')
  const [{id}] = JSON.parse(fs.readFileSync('/tmp/svobs-qa-submission.json', 'utf8'))
  await page.goto('/giris')
  await page.locator('#email').fill('siyeregitimbirim@gmail.com')
  await page.locator('#password').fill(process.env.SVOBS_QA_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Öğrenciler', exact: true })).toBeVisible({ timeout: 60000 })
  const response = await page.request.get(`/api/odev-export-docx?id=${id}`)
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  const data = await response.body()
  expect(data.length).toBeGreaterThan(500)
  expect(data.subarray(0, 2).toString()).toBe('PK')
})
