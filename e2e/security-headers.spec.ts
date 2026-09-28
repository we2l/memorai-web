import { test, expect } from '@playwright/test'

test('respostas do web trazem os headers de segurança', async ({ page }) => {
  const response = await page.goto('/')
  expect(response).not.toBeNull()

  const headers = response!.headers()
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['permissions-policy']).toContain('camera=()')
  expect(headers['content-security-policy-report-only']).toContain("frame-ancestors 'none'")
})
