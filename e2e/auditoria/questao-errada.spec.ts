import AxeBuilder from '@axe-core/playwright'
import { test, expect, gotoApp, apiCall, uid } from './support/fixtures'

/**
 * Colar questão errada (prd-questao-errada): the question pasted from Qconcursos, TEC or an old exam becomes a
 * review card without AI, in a Free account after the trial (every AI POST is cut by the aiGuard fixture). The
 * card shows where it came from in the review ("Ver a questão"), in the library filter and on the hub's line.
 */
test.use({ auditUser: 'questao' })

const FGV = `Q2077829
Ano: 2023 Banca: FGV Órgão: TJ-RJ Prova: FGV - 2023 - TJ-RJ - Analista Judiciário
Sobre o controle concentrado de constitucionalidade, assinale a afirmativa correta.
(A) A ADI pode ter por objeto lei municipal em face da Constituição Federal.
(B) A ADPF tem caráter subsidiário.
(C) A ADC dispensa controvérsia judicial relevante.
Responder
Você errou! Resposta: B
Comentário: a ADPF só cabe quando não houver outro meio eficaz.`

const CEBRASPE = `1. Julgue o item. O habeas data protege a liberdade de locomoção.
( ) Certo ( ) Errado
Gabarito: Errado
2. Julgue o item. Compete à União legislar sobre direito penal.
( ) Certo ( ) Errado
Gabarito: Certo`

async function newTopic(page: import('@playwright/test').Page, name: string) {
  return (await apiCall(page, 'POST', '/topics', { name })).data.id as string
}

test('biblioteca: cola, confere, cria o card e revisa com "Ver a questão"', async ({ page, aiGuard }) => {
  await gotoApp(page, '/hoje')
  const topicId = await newTopic(page, `Constitucional ${uid()}`)
  await gotoApp(page, `/cadernos/${topicId}/cards`)

  await page.getByTestId('library-paste-question').click()
  const sheet = page.getByRole('dialog', { name: 'Questão que errei' })
  await expect(sheet).toBeVisible()
  await sheet.getByTestId('question-text').fill(FGV)
  await sheet.getByTestId('question-separate').click()

  const check = page.getByRole('dialog', { name: 'Confira antes de criar' })
  await expect(check.getByTestId('question-found')).toContainText('Achamos 1 questão.')
  await expect(check.getByTestId('question-stem')).toHaveValue('Sobre o controle concentrado de constitucionalidade, assinale a afirmativa correta.')
  await expect(check.getByTestId('question-alt-C')).toHaveValue('A ADC dispensa controvérsia judicial relevante.')
  await expect(check.getByRole('radio', { name: 'A ADPF tem caráter subsidiário.' })).toBeChecked()
  await expect(check.getByLabel('Comentário', { exact: false }).first()).toHaveValue('a ADPF só cabe quando não houver outro meio eficaz.')
  await expect(check.getByLabel('Fonte')).toHaveValue('FGV · 2023 · TJ-RJ')
  await check.getByTestId('question-reason-confused').click()
  await expect(check.getByTestId('question-reason-confused')).toHaveAttribute('aria-pressed', 'true')
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([])

  const created = page.waitForResponse(r => r.url().endsWith('/api/pasted-questions') && r.request().method() === 'POST')
  await check.getByTestId('question-create').click()
  expect((await created).status()).toBe(201)
  await expect(page.getByText(/Card criado em Constitucional/)).toBeVisible()
  await expect(page.getByTestId('card-row')).toHaveCount(1)
  await expect(page.getByTestId('card-row').first()).toContainText('Questão colada · FGV · 2023 · TJ-RJ')

  // Library filter "Questões coladas"
  await page.getByTestId('card-origin').selectOption('question')
  await expect(page).toHaveURL(/origin=question/)
  await expect(page.getByTestId('card-row')).toHaveCount(1)

  // "Revisar agora" of the toast: the explicit list
  await gotoApp(page, `/cadernos/${topicId}/cards`)
  await page.getByTestId('library-paste-question').click()
  await page.getByTestId('question-text').fill('O STF é o guardião da Constituição.\nGabarito: Certo')
  await page.getByTestId('question-separate').click()
  await page.getByTestId('question-create').click()
  await page.getByRole('button', { name: 'Revisar agora' }).click()
  await expect(page).toHaveURL(/\/revisar\?scope=cards&card_ids=/)
  await expect(page.getByTestId('review-front')).toContainText('O STF é o guardião da Constituição.')
  await expect(page.getByTestId('review-front')).toContainText('Certo ou errado?')
  await page.getByRole('button', { name: 'Mostrar resposta' }).click()
  await expect(page.getByTestId('review-origin')).toContainText('Origem: questão colada')
  await page.keyboard.press('o')
  const view = page.getByRole('dialog', { name: 'A questão que você errou' })
  await expect(view.getByTestId('question-view-answer')).toHaveText('Gabarito: Certo')
  await page.keyboard.press('Escape')
  await expect(view).toBeHidden()
  // The session is where it was: the answer still shown, ready to rate
  await expect(page.getByTestId('rate-3')).toBeVisible()

  expect(aiGuard).toEqual([])
})

test('?add=question (atalho do PWA) cola várias questões e o hub mostra "Questões coladas"', async ({ page, aiGuard }) => {
  await gotoApp(page, '/hoje')
  const topicId = await newTopic(page, `Penal ${uid()}`)
  await gotoApp(page, `/cadernos/${topicId}?add=question`)
  await expect(page).not.toHaveURL(/add=question/)
  const sheet = page.getByRole('dialog', { name: 'Questão que errei' })
  await expect(sheet.getByTestId('question-topic')).toHaveValue(topicId)
  await sheet.getByTestId('question-text').fill(CEBRASPE)
  await sheet.getByTestId('question-separate').click()

  const check = page.getByRole('dialog', { name: 'Confira antes de criar' })
  await expect(check.getByTestId('question-found')).toContainText('Achamos 2 questões.')
  await expect(check.getByTestId('question-row-0')).toContainText('1. Certo ou errado · Gabarito: Errado')
  await expect(check.getByTestId('question-row-1')).toContainText('2. Certo ou errado · Gabarito: Certo')
  await expect(check.getByTestId('question-row-0')).toHaveAttribute('aria-expanded', 'true')
  await check.getByTestId('question-row-1').click()
  await expect(check.getByTestId('question-row-1')).toHaveAttribute('aria-expanded', 'true')
  await check.getByTestId('question-create').click()
  await expect(page.getByText(/2 cards criados em Penal/)).toBeVisible()

  // The hub on screen refreshes: the special line with its own session
  await expect(page.getByTestId('special-question')).toContainText('Questões coladas')
  await expect(page.getByTestId('special-question')).toContainText('2 cards · questões que você errou')
  await page.getByTestId('special-question').getByRole('link', { name: 'Revisar 2' }).click()
  await expect(page).toHaveURL(/origin=question/)
  await expect(page.getByTestId('review-front')).toContainText('Julgue o item.')

  expect(aiGuard).toEqual([])
})

test('celular: "+ Adicionar" → "Questão que errei", e o gabarito que falta é pedido antes de enviar', async ({ page, aiGuard }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoApp(page, '/hoje')
  const topicId = await newTopic(page, `ENEM ${uid()}`)
  await gotoApp(page, `/cadernos/${topicId}`)
  await page.getByRole('button', { name: 'Adicionar' }).first().click()
  await page.getByRole('dialog', { name: 'Adicionar' }).getByRole('button', { name: /Questão que errei/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Questão que errei' })
  await sheet.getByTestId('question-text').fill(`QUESTÃO 45
A crescente urbanização trouxe desafios.
A principal consequência é o(a)
A aumento da mobilidade urbana.
B redução das desigualdades.
C expansão das periferias.
D queda da poluição.
E fim do êxodo rural.`)
  await sheet.getByTestId('question-separate').click()
  const check = page.getByRole('dialog', { name: 'Confira antes de criar' })
  await expect(check.getByTestId('question-warning')).toContainText('Não achamos o gabarito')
  const posts: string[] = []
  page.on('request', r => { if (r.url().endsWith('/api/pasted-questions')) posts.push(r.method()) })
  await check.getByTestId('question-create').click()
  await expect(check.getByText('Marque o gabarito.')).toBeVisible()
  expect(posts).toEqual([])
  await check.getByRole('radio', { name: 'expansão das periferias.' }).check()
  await check.getByTestId('question-create').click()
  await expect(page.getByText(/Card criado em ENEM/)).toBeVisible()
  // No horizontal scroll on the phone
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  expect(aiGuard).toEqual([])
})
