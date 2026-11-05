import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import PasswordInput from '~/components/auth/PasswordInput.vue'
import DailyGoalPicker from '~/components/settings/DailyGoalPicker.vue'
import PlanUsageSection from '~/components/settings/PlanUsageSection.vue'
import NotebookRow from '~/components/caderno/NotebookRow.vue'
import ConsentBanner from '~/components/ui/ConsentBanner.vue'
import ContentStep from '~/components/onboarding/ContentStep.vue'
import ReviewOnboardingEnd from '~/components/review/ReviewOnboardingEnd.vue'
import ErrorScreen from '~/components/ui/ErrorScreen.vue'
import { CONSENT_COOKIE } from '~/composables/useConsent'
import type { UserSettings } from '~/types'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const SUMMARY = { size: 8, remembered: 6, percent: 75, minutes: 2, inDay: 6, weak: null, errorIds: [] }

function stubApi(routes: Record<string, unknown>) {
  const calls: { url: string; opts: any }[] = []
  apiMock.mockImplementation(async (url: string, opts: any = {}) => {
    calls.push({ url, opts })
    if (url in routes) return routes[url]
    throw Object.assign(new Error('not mocked'), { statusCode: 500 })
  })
  return calls
}

describe('AuthPasswordInput (RF-F12)', () => {
  it('mostrar/ocultar com aria-pressed, nome fixo e o clique não tira o foco do campo', async () => {
    const w = await mountSuspended(PasswordInput, {
      props: { id: 'password', label: 'Senha', autocomplete: 'current-password', modelValue: 'segredo' },
      attachTo: document.body,
    })
    const input = w.get('input')
    const toggle = w.get('[data-testid="password-toggle"]')
    expect(input.attributes('type')).toBe('password')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(toggle.attributes('aria-label')).toBe('Mostrar senha')
    ;(input.element as HTMLInputElement).focus()
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    toggle.element.dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)
    await toggle.trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(document.activeElement).toBe(input.element)
    w.unmount()
  })
})

describe('SettingsDailyGoalPicker (RF-F2)', () => {
  it('6 cartões em lotes, com o padrão no 3; escolher grava daily_goal_batches', async () => {
    const calls = stubApi({ '/settings': { data: { daily_goal_batches: 2 } } })
    const settings = reactive<UserSettings>({ daily_new_cards_limit: null, daily_review_limit: null, session_time_limit: null, survival_mode: false, daily_goal_batches: 3 })
    const w = await mountSuspended(DailyGoalPicker, { props: { settings } })
    const radios = w.findAll('input[type="radio"]')
    expect(radios).toHaveLength(6)
    expect((radios[2]!.element as HTMLInputElement).checked).toBe(true)
    expect(w.text()).toContain('1 lote')
    expect(w.text()).toContain('~15 min · padrão')
    expect(w.text()).toContain('Um lote = 20 cards.')
    await radios[1]!.setValue(true)
    await flushPromises()
    expect(calls.at(-1)).toMatchObject({ url: '/settings', opts: { method: 'PUT', body: { daily_goal_batches: 2 } } })
    expect(settings.daily_goal_batches).toBe(2)
  })

  it('falha: volta ao valor anterior', async () => {
    stubApi({})
    const settings = reactive<UserSettings>({ daily_new_cards_limit: null, daily_review_limit: null, session_time_limit: null, survival_mode: false, daily_goal_batches: 3 })
    const w = await mountSuspended(DailyGoalPicker, { props: { settings } })
    await w.findAll('input[type="radio"]')[0]!.setValue(true)
    await flushPromises()
    expect(settings.daily_goal_batches).toBe(3)
  })
})

describe('SettingsPlanUsageSection (RF-F1, RN 5)', () => {
  beforeEach(() => clearNuxtState('plans'))

  it('rótulos exatamente os do catálogo, na ordem dele; só o Free tem primário; renova no dia seguinte ao fim do período', async () => {
    useAuthStore().user = { plan: 'free' } as never
    stubApi({
      '/plans': { data: { plans: [], features: {
        cards_ai: { label: 'gerações de cards com IA', unit: 'por mês', pro_benefit: 'x' },
        podcast: { label: 'podcasts', unit: 'por mês', pro_benefit: 'x' },
        mindmap_ai: { label: 'mapas mentais com IA', unit: 'por mês', pro_benefit: 'x' },
      } } },
      '/usage': { data: { plan: 'free', period_start: '2026-11-01', period_end: '2026-11-30', features: {
        cards_ai: { used: 3, limit: 10, remaining: 7 },
        podcast: { used: 1, limit: null, remaining: null },
        mindmap_ai: { used: 0, limit: 0, remaining: 0 },
        fora_do_catalogo: { used: 9, limit: 9, remaining: 0 },
      } } },
      '/subscription': { data: {} },
    })
    const w = await mountSuspended(PlanUsageSection)
    await flushPromises()
    const rows = w.findAll('[data-testid="usage-row"]')
    expect(rows.map(r => r.findAll('span')[0]!.text())).toEqual(['Gerações de cards com IA', 'Podcasts', 'Mapas mentais com IA'])
    expect(rows[0]!.text()).toContain('3 de 10')
    expect(rows[1]!.text()).toContain('ilimitado')
    expect(rows[2]!.text()).toContain('no Pro')
    expect(w.get('[data-testid="usage-renews"]').text()).toBe('renova em 01/12')
    expect(w.findAll('[data-testid="plan-upgrade"]')).toHaveLength(1)
  })

  it('Pro: nenhum primário', async () => {
    useAuthStore().user = { plan: 'pro' } as never
    stubApi({ '/plans': { data: { plans: [], features: {} } }, '/usage': { data: { plan: 'pro', period_end: '2026-11-30', features: {} } }, '/subscription': { data: {} } })
    const w = await mountSuspended(PlanUsageSection)
    await flushPromises()
    expect(w.findAll('[data-testid="plan-upgrade"]')).toHaveLength(0)
  })
})

describe('caderno de exemplo (RF-F9)', () => {
  it('selo "Exemplo" só no caderno is_sample', async () => {
    const base = { id: 't1', name: 'Exemplo · Inglês', color: null, session_count: 8, flashcards_count: 8, progress: 0 }
    const sample = await mountSuspended(NotebookRow, { props: { topic: { ...base, is_sample: true } } })
    expect(sample.get('[data-testid="sample-tag"]').text()).toBe('Exemplo')
    const normal = await mountSuspended(NotebookRow, { props: { topic: base } })
    expect(normal.find('[data-testid="sample-tag"]').exists()).toBe(false)
  })
})

describe('UiConsentBanner inline (RF-F11)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`
    clearNuxtState('consent')
  })

  it('fica no fluxo da página, sem fixed, com as mesmas ações', async () => {
    const w = await mountSuspended(ConsentBanner, { props: { inline: true } })
    const bar = w.get('[data-testid="consent-banner"]')
    expect(bar.classes()).not.toContain('fixed')
    for (const id of ['consent-reject', 'consent-accept', 'consent-customize']) expect(w.find(`[data-testid="${id}"]`).exists()).toBe(true)
  })
})

describe('OnboardingContentStep (RF-F5, F6)', () => {
  const props = (over: Record<string, unknown> = {}) => ({ mode: 'exam', verified: false, path: 'sample' as const, text: '', name: '', nameTouched: false, ...over })

  beforeEach(() => {
    useAuthStore().user = { email: 'a@b.c', email_verified: false } as never
  })

  it('exemplo é o padrão, com o título do modo, e não pede o e-mail para seguir', async () => {
    const w = await mountSuspended(ContentStep, { props: props() })
    expect((w.get('input[value="sample"]').element as HTMLInputElement).checked).toBe(true)
    expect(w.text()).toContain('Princípios fundamentais da Constituição · 3 páginas')
    const primary = w.get('[data-testid="content-primary"]')
    expect(primary.text()).toBe('Criar 8 cards e revisar')
    expect(primary.attributes('disabled')).toBeUndefined()
    expect(w.get('[data-testid="verify-email-line"]').text()).toContain('Confirme seu e-mail quando puder')
    expect(w.find('#verify-email-notice').exists()).toBe(false)
  })

  it('texto sem verificar: mostra o aviso com Reenviar e Já confirmei e bloqueia só esse caminho', async () => {
    const w = await mountSuspended(ContentStep, { props: props({ path: 'text', text: 'um texto' }) })
    expect(w.get('#verify-email-notice').text()).toContain('Confirme seu e-mail para usar a IA')
    expect(w.text()).toContain('Já confirmei')
    const primary = w.get('[data-testid="content-primary"]')
    expect(primary.text()).toBe('Gerar cards do texto')
    expect(primary.attributes('disabled')).toBeDefined()
    expect(w.find('[data-testid="verify-email-line"]').exists()).toBe(false)
  })

  it('Anki sem verificar segue liberado; o caminho "tema" não existe', async () => {
    const w = await mountSuspended(ContentStep, { props: props({ path: 'anki' }) })
    const primary = w.get('[data-testid="content-primary"]')
    expect(primary.text()).toBe('Importar do Anki')
    expect(primary.attributes('disabled')).toBeUndefined()
    expect(w.text()).not.toMatch(/tema/i)
    expect(w.findAll('input[type="radio"]')).toHaveLength(4)
  })

  it('um único primário', async () => {
    const w = await mountSuspended(ContentStep, { props: props({ verified: true, path: 'text', text: 'x' }) })
    expect(w.findAll('.bg-action.text-on-action')).toHaveLength(1)
  })
})

describe('ReviewOnboardingEnd (RF-F8)', () => {
  const forecast = { date: '2026-11-05', due_count: 5, review_count: 5, new_count: 0, estimated_minutes: 2, streak: { current: 1, reviewed_today: true, at_risk: false, next_milestone: 7 }, reminder: { enabled: true, hour: 19, suppressed: false } }

  it('celebra, conta o que lembrou, amanhã, lembrete das 19h e 1 primário', async () => {
    const w = await mountSuspended(ReviewOnboardingEnd, { props: { summary: SUMMARY, forecast } })
    expect(w.get('h1').text()).toBe('Primeiro lote concluído!')
    expect(w.get('[data-testid="onboarding-remembered"]').text()).toBe('Você lembrou 6 de 8.')
    expect(w.get('[data-testid="onboarding-tomorrow"]').text()).toContain('5 cards')
    expect(w.get('[data-testid="onboarding-reminder"]').text()).toContain('19h')
    expect(w.findAll('.bg-action.text-on-action')).toHaveLength(1)
    expect(w.get('[data-testid="onboarding-home"]').attributes('href')).toBe('/hoje')
  })

  it('"Mudar horário" grava o novo horário', async () => {
    const calls = stubApi({ '/settings': { data: {} } })
    const w = await mountSuspended(ReviewOnboardingEnd, { props: { summary: SUMMARY, forecast } })
    await w.get('[data-testid="onboarding-reminder-change"]').trigger('click')
    await w.get('select').setValue('8')
    await flushPromises()
    expect(calls.at(-1)).toMatchObject({ url: '/settings', opts: { method: 'PUT', body: { reminder_hour: 8 } } })
    expect(w.get('[data-testid="onboarding-reminder"]').text()).toContain('8h')
  })

  it('/review/tomorrow falhou: não fica em esqueleto para sempre', async () => {
    const w = await mountSuspended(ReviewOnboardingEnd, { props: { summary: SUMMARY, forecast: null, failed: true } })
    expect(w.find('[data-testid="onboarding-tomorrow"]').exists()).toBe(false)
    expect(w.get('[data-testid="onboarding-home"]').exists()).toBe(true)
  })

  it('sem lembrete ligado, não finge que tem', async () => {
    const w = await mountSuspended(ReviewOnboardingEnd, { props: { summary: SUMMARY, forecast: { ...forecast, reminder: { enabled: false, hour: 19, suppressed: false } } } })
    expect(w.find('[data-testid="onboarding-reminder"]').exists()).toBe(false)
  })
})

describe('UiErrorScreen (RF-F15)', () => {
  it('404 de quem está logado: título, endereço, Ir para o Hoje e Buscar; 1 primário e 1 h1', async () => {
    useAuthStore().user = { plan: 'free' } as never
    const w = await mountSuspended(ErrorScreen, { props: { error: { statusCode: 404 } as never } })
    expect(w.findAll('h1')).toHaveLength(1)
    expect(w.get('h1').text()).toBe('Página não encontrada')
    expect(w.get('[data-testid="error-home"]').text()).toBe('Ir para o Hoje')
    expect(w.get('[data-testid="error-search"]').text()).toContain('Buscar')
    expect(w.findAll('.bg-action.text-on-action')).toHaveLength(1)
  })

  it('404 de anônimo: Ir para o início, sem busca', async () => {
    useAuthStore().user = null
    const w = await mountSuspended(ErrorScreen, { props: { error: { statusCode: 404 } as never } })
    expect(w.get('[data-testid="error-home"]').text()).toBe('Ir para o início')
    expect(w.find('[data-testid="error-search"]').exists()).toBe(false)
  })

  it('outros erros: Algo deu errado + Tentar de novo', async () => {
    const w = await mountSuspended(ErrorScreen, { props: { error: { statusCode: 500 } as never } })
    expect(w.get('h1').text()).toBe('Algo deu errado')
    expect(w.get('[data-testid="error-retry"]').text()).toBe('Tentar de novo')
  })
})
