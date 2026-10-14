import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
try { process.loadEnvFile('.env.local') } catch { /* CI supplies environment. */ }

test('recovery token opens password form in a fresh browser and cannot be reused', async ({ browser, baseURL }) => {
  test.skip(!process.env.SVOBS_QA_RECOVERY, 'Uses an existing disposable QA account; never sends email or changes a password.')
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: 'qa-20260924-1123-musab-student@example.com' })
  expect(error).toBeNull()
  if (!data.properties) throw new Error('Recovery link was not generated')
  expect(new URL(data.properties.action_link).searchParams.get('redirect_to')).toBe('https://svobs.siyerobs.workers.dev')
  const link = new URL('/auth/callback', baseURL)
  link.searchParams.set('token_hash', data.properties.hashed_token)
  link.searchParams.set('type', 'recovery')
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(link.toString())
  await expect(page).toHaveURL(new URL('/sifre-degistir', baseURL).toString())
  await expect(page.getByLabel('Yeni Şifre', { exact: true })).toBeEnabled({ timeout: 30000 })
  await page.goto(link.toString())
  await expect(page).toHaveURL(/\/sifre-degistir\?hata=gecersiz-link$/)
  await expect(page.getByLabel('Yeni Şifre', { exact: true })).toBeDisabled()
  await context.close()
})
