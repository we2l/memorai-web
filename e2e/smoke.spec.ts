import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('login e acesso ao dashboard', async ({ page }) => {
  await login(page)
  await expect(page).toHaveURL(/\/hoje/)
  await expect(page.locator('body')).toBeVisible()
})
