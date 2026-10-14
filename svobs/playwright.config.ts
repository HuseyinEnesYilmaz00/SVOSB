import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  outputDir: '/tmp/svobs-playwright-results',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: process.env.SVOBS_URL || 'http://localhost:3001', headless: true },
  reporter: [['list']],
})
