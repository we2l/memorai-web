import { test, expect, gotoApp, apiCall, uid } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Card: criar, editar, excluir, cloze válido e inválido (aba Cards do caderno).
 */
test.use({ auditUser: 'pro' })

const cardDialog = (page: Page) => page.getByRole('dialog', { name: /flashcard/ })
const front = (page: Page) => cardDialog(page).locator('.ProseMirror').nth(0)
const back = (page: Page) => cardDialog(page).locator('.ProseMirror').nth(1)

async function openCardsTab(page: Page) {
  await gotoApp(page, '/hoje')
  const name = `Cards ${uid()}`
  const t = await apiCall(page, 'POST', '/topics', { name })
  await gotoApp(page, `/cadernos?topic=${t.data.id}`)
  await page.getByRole('tab', { name: /^Cards/ }).click()
  return t.data.id as string
}

async function cardsOf(page: Page, topicId: string) {
  const res = await apiCall(page, 'GET', `/topics/${topicId}/flashcards?per_page=50`)
  return res.data as Array<{ id: string; front: string; back: string | null; type?: string; cloze_index?: number | null }>
}

async function typeInto(page: Page, target: ReturnType<typeof front>, text: string) {
  await target.click()
  await page.keyboard.type(text)
}

test.describe('Card — caminho feliz', () => {
  test('criar → editar → excluir com confirmação', async ({ page }) => {
    const topicId = await openCardsTab(page)
    await page.getByRole('button', { name: /Criar (primeiro )?card/ }).first().click()
    await expect(cardDialog(page)).toBeVisible()
    await typeInto(page, front(page), 'Capital da França?')
    await typeInto(page, back(page), 'Paris')
    await cardDialog(page).getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('status').getByText('Card criado!')).toBeVisible()
    await expect(cardDialog(page)).toBeHidden()
    await expect(page.getByRole('tab', { name: /^Cards\s*\(1\)/ })).toBeVisible()
    let cards = await cardsOf(page, topicId)
    expect(cards).toHaveLength(1)
    expect(cards[0].front).toContain('Capital da França?')

    // Editar
    const row = page.getByRole('main').getByText('Capital da França?').first()
    await row.hover()
    await page.getByRole('button', { name: 'Editar card' }).first().click()
    await expect(cardDialog(page).getByRole('heading', { name: 'Editar card' })).toBeVisible()
    await back(page).click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('Paris (Île-de-France)')
    await cardDialog(page).getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('status').getByText('Card atualizado!')).toBeVisible()
    cards = await cardsOf(page, topicId)
    expect(cards[0].back).toContain('Île-de-France')

    // Excluir (cancelar primeiro, depois confirmar)
    await page.getByRole('main').getByText('Capital da França?').first().hover()
    await page.getByRole('button', { name: 'Excluir card' }).first().click()
    await expect(page.getByRole('alertdialog').getByRole('heading', { name: 'Excluir card?' })).toBeVisible()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click()
    expect(await cardsOf(page, topicId)).toHaveLength(1)
    await page.getByRole('main').getByText('Capital da França?').first().hover()
    await page.getByRole('button', { name: 'Excluir card' }).first().click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()
    await expect.poll(async () => (await cardsOf(page, topicId)).length).toBe(0)
  })

  test('cloze válido {{c1::…}} esconde o verso e vira card de lacuna', async ({ page }) => {
    const topicId = await openCardsTab(page)
    await page.getByRole('button', { name: /Criar (primeiro )?card/ }).first().click()
    await typeInto(page, front(page), 'A capital do Brasil é {{c1::Brasília}}.')
    await expect(cardDialog(page).getByText('O verso é gerado automaticamente pelas lacunas.')).toBeVisible()
    await cardDialog(page).getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('status').getByText('Card criado!')).toBeVisible()
    const cards = await cardsOf(page, topicId)
    expect(cards).toHaveLength(1)
    expect(cards[0].cloze_index).toBe(1)

    // Na revisão a resposta fica escondida até virar
    await gotoApp(page, `/revisar?topic_id=${topicId}`)
    const card = page.locator('.review-card').first()
    await expect(card).toContainText('A capital do Brasil é')
    await expect(card).not.toContainText('Brasília')
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Verso do card' })).toContainText('Brasília')
  })
})

test.describe('Card — caminho triste', () => {
  test('cloze inválido (lacuna sem fechar) é recusado antes de salvar', async ({ page }) => {
    const topicId = await openCardsTab(page)
    await page.getByRole('button', { name: /Criar (primeiro )?card/ }).first().click()
    await typeInto(page, front(page), 'A capital do Brasil é {{c1::Brasília')
    const save = cardDialog(page).getByRole('button', { name: 'Salvar', exact: true })
    // Esperado: Salvar desabilitado ou erro de validação. BUG: o regex de detecção (/\{\{c\d+::/) aceita
    // a lacuna aberta, esconde o verso e o servidor grava um card de lacuna sem lacuna.
    const blocked = await save.isDisabled()
    if (!blocked) {
      await save.click()
      await page.waitForTimeout(1000)
      const cards = await cardsOf(page, topicId)
      // Evidência: o card salvo mostra a resposta na frente durante a revisão
      if (cards.length) {
        await gotoApp(page, `/revisar?topic_id=${topicId}`)
        const shown = await page.locator('.review-card').first().innerText().catch(() => '')
        test.info().annotations.push({ type: 'evidência', description: `card salvo: ${JSON.stringify(cards[0].front)} (type=${cards[0].type}); frente na revisão: ${JSON.stringify(shown)}` })
        console.log('[evidência cloze inválido] frente na revisão =', JSON.stringify(shown))
      }
      expect(cards, 'cloze inválido foi salvo').toHaveLength(0)
    }
  })

  test('frente apagada depois de digitada não habilita Salvar', async ({ page }) => {
    const topicId = await openCardsTab(page)
    await page.getByRole('button', { name: /Criar (primeiro )?card/ }).first().click()
    await typeInto(page, front(page), 'temp')
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    await typeInto(page, back(page), 'verso sem frente')
    const save = cardDialog(page).getByRole('button', { name: 'Salvar', exact: true })
    // BUG: canSubmit testa `!form.front`, mas o editor devolve "<p></p>" (string não vazia)
    if (await save.isEnabled()) {
      await save.click()
      await page.waitForTimeout(1000)
      const cards = await cardsOf(page, topicId)
      console.log('[evidência frente vazia] cards gravados =', JSON.stringify(cards.map(c => c.front)))
      expect(cards, 'card com frente vazia foi gravado').toHaveLength(0)
    }
    await expect(save).toBeDisabled()
  })

  test('erro 500 ao criar: aviso de erro e o texto continua no formulário', async ({ page }) => {
    await openCardsTab(page)
    await page.route('**/api/flashcards', route => route.request().method() === 'POST'
      ? route.fulfill({ status: 500, json: { message: 'Server Error' } })
      : route.fallback())
    await page.getByRole('button', { name: /Criar (primeiro )?card/ }).first().click()
    await typeInto(page, front(page), 'Pergunta que não pode sumir')
    await typeInto(page, back(page), 'Resposta')
    await cardDialog(page).getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('alert').getByText('Erro ao criar card.')).toBeVisible()
    await expect(front(page)).toContainText('Pergunta que não pode sumir')
  })
})
