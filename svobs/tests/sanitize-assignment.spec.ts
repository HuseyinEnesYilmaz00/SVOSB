import { test, expect } from '@playwright/test'
import { sanitizeAssignment } from '../src/lib/sanitize-assignment'

test('assignment HTML preserves formatting but strips executable content and remote images', () => {
  const html = sanitizeAssignment('<h2>Title</h2><p><strong>Text</strong><script>alert(1)</script><img src="http://127.0.0.1/private"><a href="javascript:alert(1)" onclick="alert(1)">bad</a><a href="https://example.com">safe</a></p>')
  expect(html).toContain('<strong>Text</strong>')
  expect(html).toContain('href="https://example.com"')
  expect(html).not.toMatch(/script|onclick|javascript:|127\.0\.0\.1|<img/)
})
