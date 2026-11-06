import { test, expect, gotoApp, AUDIT_PASSWORD, API, WEB, sql, USERS } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Configurações: trocar senha (senha atual errada, confirmação diferente, sucesso) e excluir conta
 * com cancelamento. Usuário próprio `e2e-account@audit.test` (a senha volta ao padrão a cada execução).
 */
test.use({ auditUser: 'account' })
test.describe.configure({ mode: 'serial' })

const pw = (page: Page, label: string) => page.getByLabel(label, { exact: true })

async function me(page: Page) {
  return page.context().request.get(`${API}/me`, { headers: { Accept: 'application/json', Origin: WEB, Referer: `${WEB}/` } })
}

test.describe('Trocar senha', () => {
  test('senha atual errada: erro no campo e a senha não muda', async ({ page }) => {
    await gotoApp(page, '/configuracoes')
    await pw(page, 'Senha atual').fill('senha-errada-123')
    await pw(page, 'Nova senha').fill('NovaSenha-123')
    await pw(page, 'Confirmar nova senha').fill('NovaSenha-123')
    const res = page.waitForResponse(r => r.url().endsWith('/api/user/password'))
    await page.getByRole('button', { name: 'Trocar senha' }).click()
    expect((await res).status()).toBe(422)
    await expect(pw(page, 'Senha atual')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#pw-current_password-error')).toBeVisible()
    await expect(page.locator('#pw-current_password-error')).not.toBeEmpty()
    // Continua logado e com a senha antiga
    expect((await me(page)).status()).toBe(200)
  })

  test('confirmação diferente é barrada no cliente (sem chamada à API)', async ({ page }) => {
    let calls = 0
    await page.route('**/api/user/password', (r) => { calls++; return r.fallback() })
    await gotoApp(page, '/configuracoes')
    await pw(page, 'Senha atual').fill(AUDIT_PASSWORD)
    await pw(page, 'Nova senha').fill('NovaSenha-123')
    await pw(page, 'Confirmar nova senha').fill('Outra-123')
    await page.getByRole('button', { name: 'Trocar senha' }).click()
    await expect(page.getByText('As senhas não conferem.')).toBeVisible()
    expect(calls).toBe(0)
  })

  test('nova senha curta mantém o botão desabilitado', async ({ page }) => {
    await gotoApp(page, '/configuracoes')
    await pw(page, 'Senha atual').fill(AUDIT_PASSWORD)
    await pw(page, 'Nova senha').fill('1234567')
    await pw(page, 'Confirmar nova senha').fill('1234567')
    await expect(page.getByRole('button', { name: 'Trocar senha' })).toBeDisabled()
  })

  test('senha correta: troca, avisa e mantém esta sessão', async ({ page }) => {
    const before = sql(`select password from users where email='${USERS.account.email}'`)
    await gotoApp(page, '/configuracoes')
    await pw(page, 'Senha atual').fill(AUDIT_PASSWORD)
    await pw(page, 'Nova senha').fill('NovaSenha-Audit-1')
    await pw(page, 'Confirmar nova senha').fill('NovaSenha-Audit-1')
    await page.getByRole('button', { name: 'Trocar senha' }).click()
    await expect(page.getByRole('status').getByText('Senha alterada. As outras sessões foram encerradas.')).toBeVisible()
    expect(sql(`select password from users where email='${USERS.account.email}'`)).not.toBe(before)
    expect((await me(page)).status()).toBe(200)
    await expect(pw(page, 'Senha atual')).toHaveValue('')
  })
})

test.describe('Excluir conta', () => {
  test('cancelar no passo 1 e voltar/cancelar no passo 2 não exclui nada', async ({ page }) => {
    let deletes = 0
    await page.route('**/api/user', (r) => { if (r.request().method() === 'DELETE') deletes++; return r.fallback() })
    await gotoApp(page, '/configuracoes')

    await page.getByRole('button', { name: 'Excluir conta' }).click()
    const modal = page.getByRole('alertdialog')
    await expect(modal.getByRole('heading', { name: 'Excluir sua conta?' })).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    await modal.getByRole('button', { name: 'Cancelar' }).click()
    await expect(modal).toBeHidden()

    await page.getByRole('button', { name: 'Excluir conta' }).click()
    await modal.getByLabel('Entendo que isso é permanente').check()
    await modal.getByRole('button', { name: 'Continuar' }).click()
    await expect(modal.getByLabel('Digite sua senha atual')).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Excluir minha conta' })).toBeDisabled()
    await modal.getByRole('button', { name: 'Voltar' }).click()
    await modal.getByRole('button', { name: 'Cancelar' }).click()
    await page.keyboard.press('Escape')

    // Reabrir começa do passo 1, sem a senha antiga
    await page.getByRole('button', { name: 'Excluir conta' }).click()
    await expect(modal.getByLabel('Entendo que isso é permanente')).not.toBeChecked()
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()

    expect(deletes).toBe(0)
    expect((await me(page)).status()).toBe(200)
    expect(sql(`select count(*) from users where email='${USERS.account.email}'`)).toBe('1')
  })

  test('senha errada no passo 2: erro inline, conta mantida', async ({ page }) => {
    await gotoApp(page, '/configuracoes')
    await page.getByRole('button', { name: 'Excluir conta' }).click()
    const modal = page.getByRole('alertdialog')
    await modal.getByLabel('Entendo que isso é permanente').check()
    await modal.getByRole('button', { name: 'Continuar' }).click()
    await modal.getByLabel('Digite sua senha atual').fill('nao-e-a-senha')
    const res = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'DELETE')
    await modal.getByRole('button', { name: 'Excluir minha conta' }).click()
    expect((await res).status()).toBe(422)
    await expect(modal.getByRole('alert')).not.toBeEmpty()
    await modal.getByRole('button', { name: 'Voltar' }).click()
    await modal.getByRole('button', { name: 'Cancelar' }).click()
    expect((await me(page)).status()).toBe(200)
    expect(sql(`select deletion_requested_at is null from users where email='${USERS.account.email}'`)).toBe('t')
  })
})
