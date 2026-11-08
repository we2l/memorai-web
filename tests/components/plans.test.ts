import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import PlanCards from '~/components/plans/PlanCards.vue'
import PlanCompareTable from '~/components/plans/PlanCompareTable.vue'
import BillingToggle from '~/components/plans/BillingToggle.vue'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const extras = { pdf_pages_per_note: 100, rag_max_pages: 300, upload_max_mb: 50, pdf_pages_monthly_cap: 4000, quiz_max_questions: 10, quiz_short_answer: false, podcast_format: 'teaser', podcast_max_minutes: 0.5 }

function catalog(installments = 1) {
  return {
    currency: 'BRL',
    period: 'calendar_month',
    period_timezone: 'America/Sao_Paulo',
    plans: [
      { key: 'free', name: 'Grátis', prices: { monthly: null, annual: null }, highlights: ['Cadernos sem limite'], limits: { cards_ai: 10 }, extras },
      {
        key: 'pro',
        name: 'Pro',
        prices: {
          monthly: { amount_cents: 2990, label: 'R$ 29,90/mês' },
          annual: { amount_cents: 23990, label: 'R$ 239,90/ano', monthly_equivalent_cents: 1999, installments_max: installments, savings_cents: 11890 },
        },
        highlights: ['Tudo do Grátis'],
        limits: { cards_ai: 400 },
        extras: { ...extras, podcast_format: 'full', podcast_max_minutes: 15 },
      },
    ],
    features: { cards_ai: { label: 'gerações de cards com IA', unit: 'por mês', pro_benefit: '400 gerações por mês' } },
  }
}

async function mountCards(period: 'monthly' | 'annual' = 'annual') {
  const wrapper = await mountSuspended(PlanCards, { props: { period }, slots: { 'pro-action': () => 'AÇÃO DO PRO' } })
  await flushPromises()
  return wrapper
}

describe('PlanCards', () => {
  beforeEach(() => {
    useState('plans').value = null
    useState('plans-failed').value = false
    apiMock.mockReset()
  })

  it('sem o catálogo: esqueleto, nenhum número e a ação escondida', async () => {
    const wrapper = await mountSuspended(PlanCards, { props: { period: 'annual' }, slots: { 'pro-action': () => 'AÇÃO DO PRO' } })
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="skeleton"]').length).toBeGreaterThan(0)
    expect(wrapper.text()).not.toMatch(/R\$/)
    expect(wrapper.text()).not.toContain('AÇÃO DO PRO')
  })

  it('anual: o total do ano, "Equivale a R$ 19,99 por mês" (nunca como cobrança), destaques + linhas do catálogo e "Recomendado" escrito', async () => {
    useState('plans').value = catalog()
    const wrapper = await mountCards()
    const pro = wrapper.find('[data-testid="plan-pro"]')
    expect(pro.text()).toContain('Recomendado')
    expect(wrapper.find('[data-testid="plan-pro-price"]').text().replace(/\s/g, ' ')).toBe('R$ 239,90/ano')
    expect(wrapper.find('[data-testid="plan-pro-note"]').text().replace(/\s/g, ' ')).toBe('Equivale a R$ 19,99 por mês · à vista no cartão')
    expect(pro.text()).toContain('Tudo do Grátis')
    expect(pro.text()).toContain('Gerações de cards com IA: 400 por mês')
    expect(pro.text()).not.toMatch(/ilimitad/i)
    expect(pro.text()).toContain('AÇÃO DO PRO')
    expect(wrapper.find('[data-testid="billing-savings"]').text().replace(/\s/g, ' ')).toContain('R$ 118,90')
  })

  it('Free só com os destaques do catálogo (sem IA, prd-planos-lancamento RF-F4); sem destaques, as linhas dos limites', async () => {
    useState('plans').value = catalog()
    const wrapper = await mountCards()
    const free = wrapper.find('[data-testid="plan-free"]')
    expect(free.text()).toContain('Cadernos sem limite')
    expect(free.text()).not.toContain('Gerações de cards com IA')
    const noHighlights = catalog()
    noHighlights.plans[0]!.highlights = []
    useState('plans').value = noHighlights
    await flushPromises()
    expect(wrapper.find('[data-testid="plan-free"]').text()).toContain('Gerações de cards com IA: 10 por mês')
  })

  it('o nome do plano pago vem do catálogo', async () => {
    const renamed = catalog()
    renamed.plans[1]!.name = 'Intensivo'
    useState('plans').value = renamed
    const wrapper = await mountCards()
    expect(wrapper.find('[data-testid="plan-pro"] h2').text()).toBe('Intensivo')
  })

  it('parcelamento só com installments_max > 1, com os juros de quem compra', async () => {
    useState('plans').value = catalog(12)
    const wrapper = await mountCards()
    const note = wrapper.find('[data-testid="plan-pro-note"]').text().replace(/\s/g, ' ')
    expect(note).toBe('Equivale a R$ 19,99 por mês · 12× com juros')
    expect(note).not.toContain('cobrado')
  })

  it('anual: o desconto do Pix aparece como desconto (Lei 13.455/2017)', async () => {
    const c = catalog(12)
    c.plans[1]!.prices.annual!.pix = { amount_cents: 22790, label: 'R$ 227,90/ano', discount_percent: 5, savings_cents: 1200 }
    useState('plans').value = c
    const wrapper = await mountCards()
    expect(wrapper.find('[data-testid="plan-pro-pix"]').text().replace(/\s/g, ' ')).toBe('Pix R$ 227,90 (5% de desconto)')
  })

  it('anual: até 3× sem juros e 12× com juros, do catálogo', async () => {
    const c = catalog(12)
    c.plans[1]!.prices.annual!.installments_interest_free = 3
    useState('plans').value = c
    const wrapper = await mountCards()
    expect(wrapper.find('[data-testid="plan-pro-note"]').text().replace(/\s/g, ' ')).toBe('Equivale a R$ 19,99 por mês · até 3× sem juros · ou 12× com juros')
  })

  it('mensal: preço do mês e cancelamento em dois cliques, sem o total do ano', async () => {
    const c = catalog()
    c.plans[1]!.prices.monthly!.pix_days = 30
    useState('plans').value = c
    const wrapper = await mountCards('monthly')
    expect(wrapper.find('[data-testid="plan-pro-price"]').text().replace(/\s/g, ' ')).toBe('R$ 29,90/mês')
    expect(wrapper.find('[data-testid="plan-pro-note"]').text()).toBe('No cartão, renova todo mês e cancela em dois cliques. Ou 30 dias no Pix, sem renovação')
  })

  it('erro do catálogo: "Tentar de novo" busca de novo e mostra os planos', async () => {
    useState('plans-failed').value = true
    apiMock.mockResolvedValue({ data: catalog() })
    const wrapper = await mountSuspended(PlanCards, { props: { period: 'annual' } })
    expect(wrapper.text()).toContain('Não conseguimos carregar os planos agora')
    expect(wrapper.text()).not.toMatch(/R\$/)
    await wrapper.findAll('button').find(b => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/plans')
    expect(wrapper.find('[data-testid="plan-pro-price"]').exists()).toBe(true)
  })
})

describe('PlanCompareTable', () => {
  beforeEach(() => { useState('plans').value = null })

  it('sem catálogo não renderiza; com catálogo, tabela com cabeçalhos de plano e de linha', async () => {
    const empty = await mountSuspended(PlanCompareTable)
    expect(empty.find('table').exists()).toBe(false)

    useState('plans').value = catalog()
    const wrapper = await mountSuspended(PlanCompareTable)
    expect(wrapper.findAll('th[scope="col"]').map(th => th.text())).toEqual(['Recurso', 'Grátis', 'Pro'])
    const row = wrapper.find('[data-testid="compare-cards_ai"]')
    expect(row.find('th[scope="row"]').text()).toBe('Gerações de cards com IA')
    expect(row.findAll('td').map(td => td.text())).toEqual(['10 por mês', '400 por mês'])
  })
})

describe('BillingToggle', () => {
  it('rádios nativos num grupo com nome, marcando o período e emitindo a troca', async () => {
    const wrapper = await mountSuspended(BillingToggle, { props: { modelValue: 'annual', savings: 'R$ 70,90' } })
    expect(wrapper.find('legend').text()).toBe('Período de cobrança')
    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios).toHaveLength(2)
    expect((radios[1]!.element as HTMLInputElement).checked).toBe(true)
    await radios[0]!.setValue(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['monthly'])
    expect(wrapper.text()).toContain('R$ 70,90')
  })

  it('sem economia no catálogo, a linha fica vazia (sem salto de layout)', async () => {
    const wrapper = await mountSuspended(BillingToggle, { props: { modelValue: 'monthly' } })
    expect(wrapper.find('[data-testid="billing-savings"]').text()).toBe('')
  })
})
