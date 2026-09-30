import { type Page } from '@playwright/test'

const TEST_USER = {
  email: process.env.E2E_EMAIL || 'weslleyadesousa@gmail.com',
  password: process.env.E2E_PASSWORD || 'password',
}

export async function login(page: Page) {
  await page.goto('/entrar')
  // /entrar is prerendered: wait for hydration before submitting (else native submit)
  await page.waitForLoadState('networkidle')

  // Ensure fields are visible (scroll if needed on mobile)
  const emailInput = page.locator('#email')
  await emailInput.scrollIntoViewIfNeeded()
  await emailInput.fill(TEST_USER.email)

  const passwordInput = page.locator('#password')
  await passwordInput.scrollIntoViewIfNeeded()
  await passwordInput.fill(TEST_USER.password)

  const submitBtn = page.locator('button[type="submit"]')
  await submitBtn.scrollIntoViewIfNeeded()
  await submitBtn.click()

  await page.waitForURL('**/hoje', { timeout: 15000 })
}
