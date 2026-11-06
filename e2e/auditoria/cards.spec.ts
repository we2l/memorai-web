import { test, expect, gotoApp, apiCall, uid } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Card: criar, editar, excluir, cloze válido e inválido (biblioteca de cards do caderno, /cadernos/{id}/cards).
 */
test.use({ auditUser: 'pro' })

const cardDialog = (page: Page) => page.getByRole('dialog', { name: /^(Novo|Editar) card$/ })
const front = (page: Page) => cardDialog(page).locator('.ProseMirror').nth(0)
const back = (page: Page) => cardDialog(page).locator('.ProseMirror').nth(1)

async function openCardsTab(page: Page) {
  await gotoApp(page, '/hoje')
  const name = `Cards ${uid()}`
  const t = await apiCall(page, 'POST', '/topics', { name })
  // The old Cards tab is the card library of the scope (4b-1)
  await gotoApp(page, `/cadernos/${t.data.id}/cards`)
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
    await expect(page.getByText(/^1 card em /)).toBeVisible()
    let cards = await cardsOf(page, topicId)
    expect(cards).toHaveLength(1)
    expect(cards[0].front).toContain('Capital da França?')

    // Editar: a linha abre o card (4c-1), com "Editar" e "Excluir" à vista (sem hover)
    const openCard = () => page.getByTestId('card-row-open').filter({ hasText: 'Capital da França?' }).click()
    const viewer = page.getByRole('dialog', { name: 'Card' })
    await openCard()
    await viewer.getByRole('button', { name: 'Editar' }).click()
    await expect(cardDialog(page).getByRole('heading', { name: 'Editar card' })).toBeVisible()
    await back(page).click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('Paris (Île-de-France)')
    await cardDialog(page).getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('status').getByText('Card atualizado!')).toBeVisible()
    cards = await cardsOf(page, topicId)
    expect(cards[0].back).toContain('Île-de-France')

    // Excluir (cancelar primeiro, depois confirmar)
    await openCard()
    await viewer.getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByRole('alertdialog').getByRole('heading', { name: 'Excluir card?' })).toBeVisible()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click()
    expect(await cardsOf(page, topicId)).toHaveLength(1)
    await openCard()
    await viewer.getByRole('button', { name: 'Excluir' }).click()
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
    const card = page.getByTestId('review-card')
    await expect(card).toContainText('A capital do Brasil é')
    await expect(card).not.toContainText('Brasília')
    await page.keyboard.press('Space')
    await expect(page.getByTestId('review-answer')).toContainText('Brasília')
  })
})

test.describe('Card — caminho triste', () => {
  test('cloze inválido (lacuna sem fechar) é recusado antes de salvar', async ({ page }) => {
    const topicId = await openCardsTab(page)
    await page.getByRole('button', { name: /Criar (primeiro )?card/ }).first().click()
    await typeInto(page, front(page), 'A capital do Brasil é {{c1::Brasília')
    const save = cardDialog(page).getByRole('button', { name: 'Salvar', exact: true })
    await expect(save).toBeDisabled()
    await expect(cardDialog(page).getByRole('alert')).toContainText('Falta fechar a lacuna')
    await typeInto(page, front(page), '}}')
    await expect(save).toBeEnabled()
    await expect(cardDialog(page).getByRole('alert')).toHaveCount(0)
    expect(await cardsOf(page, topicId)).toHaveLength(0)
  })

  test('frente apagada depois de digitada não habilita Salvar', async ({ page }) => {
    const topicId = await openCardsTab(page)
    await page.getByRole('button', { name: /Criar (primeiro )?card/ }).first().click()
    await typeInto(page, front(page), 'temp')
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    await typeInto(page, back(page), 'verso sem frente')
    const save = cardDialog(page).getByRole('button', { name: 'Salvar', exact: true })
    await expect(save).toBeDisabled()
    expect(await cardsOf(page, topicId)).toHaveLength(0)
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
