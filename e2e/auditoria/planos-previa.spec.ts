import { test, expect, gotoApp, apiCall, uid, tinker } from './support/fixtures'

/**
 * Prévia grátis da IA no lugar do teste de 7 dias (prd-uso-justo §9). Conta Grátis com e-mail confirmado e a prévia
 * em uso (provision quota_exhausted na linha vitalícia: 1 de 10 gerações de cards, o mapa da prévia gasto). Sem IA:
 * nenhum POST de IA é feito, a tela lê o /usage e o catálogo.
 */
test.describe('Prévia grátis da IA', () => {
  test.use({ auditUser: 'preview' })

  test('a contagem da prévia onde a IA acontece e, gasta, o convite a /planos sem botão de pagar', async ({ page }) => {
    const catalog = (await apiCall(page, 'GET', '/plans')).data
    test.skip(!catalog.preview, 'API sem a prévia (prd-uso-justo §9)')
    const usage = (await apiCall(page, 'GET', '/usage')).data
    expect(usage.period).toBe('lifetime')

    const t = await apiCall(page, 'POST', '/topics', { name: `Prévia ${uid()}` })
    await gotoApp(page, `/cadernos/${t.data.id}/cards`)
    await expect(page.getByTestId('usage-notice')).toHaveText(`Prévia grátis: 1 de ${catalog.preview.limits.cards_ai} ${catalog.features.cards_ai.label}.`)

    // The map asks for 3 notes; written through tinker without events (no embedding job, no AI)
    tinker(`$t = App\\Domain\\Topic\\Models\\Topic::find('${t.data.id}'); App\\Domain\\Topic\\Models\\Note::withoutEvents(function () use ($t) { foreach ([1, 2, 3] as $i) { App\\Domain\\Topic\\Models\\Note::create(['user_id' => $t->user_id, 'topic_id' => $t->id, 'title' => "Nota $i", 'content' => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => str_repeat("Controle de constitucionalidade $i. ", 20)]]]]], 'plain_content' => str_repeat("Controle de constitucionalidade $i. ", 20)]); } });`)
    await gotoApp(page, `/cadernos/${t.data.id}/mapa`)
    const ai = page.getByRole('tab', { name: /Detalhado/ })
    if (await ai.count()) await ai.click()
    const spent = page.getByTestId('usage-notice')
    await expect(spent).toContainText(`Você usou a prévia grátis de ${catalog.features.mindmap_ai.label}.`)
    const invite = spent.getByRole('link', { name: /^Conhecer o / })
    await invite.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/planos$/)
    if (catalog.checkout?.available === false) {
      await expect(page.getByText('Assinatura em breve').first()).toBeVisible()
      await expect(page.getByRole('button', { name: /^Assinar/ })).toHaveCount(0)
    }
    await expect(page.getByTestId('plan-faq')).toContainText('Como funciona a prévia grátis?')
  })
})
