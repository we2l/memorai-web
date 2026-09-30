import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPosthogHandle, sanitizeEvent } from '~/plugins/posthog.client'

const { fake, importSpy } = vi.hoisted(() => {
  const fake = {
    init: vi.fn(),
    register: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    has_opted_out_capturing: vi.fn(() => false),
  }
  return { fake, importSpy: vi.fn() }
})

vi.mock('posthog-js', () => {
  importSpy()
  return { default: fake }
})

function setup(consent: boolean | null, user: { id: string, plan: string } | null = null) {
  const analytics = ref<boolean | null>(consent)
  const ph = createPosthogHandle({
    key: 'phc_test',
    apiHost: '/ingest',
    uiHost: 'https://eu.posthog.com',
    appVersion: 'test',
    analytics,
    user: () => user,
    routeName: () => 'provas-resultado',
    loader: () => import('posthog-js') as any,
  })
  return { analytics, ph }
}

describe('plugin PostHog', () => {
  beforeEach(() => {
    Object.values(fake).forEach(f => (f as any).mockClear())
    importSpy.mockClear()
  })

  it('não importa o posthog-js sem consentimento', async () => {
    const { ph } = setup(null)
    await ph.onConsent(null)
    const refused = setup(false)
    await refused.ph.onConsent(false)
    ph.handle.run(p => p.capture('x'))
    expect(importSpy).not.toHaveBeenCalled()
    expect(fake.init).not.toHaveBeenCalled()
  })

  it('init com autocapture/replay desligados, pageview manual e identify só com plan', async () => {
    const { ph } = setup(true, { id: 'uuid-1', plan: 'free' })
    await ph.onConsent(true)

    const [key, opts] = fake.init.mock.calls[0]
    expect(key).toBe('phc_test')
    expect(opts).toMatchObject({
      api_host: '/ingest',
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      person_profiles: 'identified_only',
      persistence: 'localStorage+cookie',
    })
    expect(fake.identify).toHaveBeenCalledWith('uuid-1', { plan: 'free' })
    expect(fake.capture).toHaveBeenCalledWith('$pageview', expect.objectContaining({ route_name: 'provas-resultado' }))
  })

  it('pageview com URL sanitizada (sem token t, mantém utm)', async () => {
    window.history.replaceState({}, '', '/provas/resultado?t=abc&utm_source=email&exam=1')
    const { ph } = setup(true)
    await ph.onConsent(true)

    const props = fake.capture.mock.calls.find(c => c[0] === '$pageview')![1]
    expect(props.$current_url).toBe(`${window.location.origin}/provas/resultado?utm_source=email`)
  })

  it('before_send limpa URLs que o SDK adiciona sozinho', () => {
    const event = sanitizeEvent({ event: 'x', properties: { $current_url: 'https://baigi.com.br/lembretes/desativado?u=1&signature=s&expires=2', $referrer: 'https://mail.google.com/?token=z' } } as any)
    expect(event!.properties.$current_url).toBe('https://baigi.com.br/lembretes/desativado')
    expect(event!.properties.$referrer).toBe('https://mail.google.com/')
  })

  it('eventos anteriores ao carregamento são reenviados após o init', async () => {
    const { ph } = setup(true)
    ph.handle.run(p => p.capture('onboarding_step_viewed', { step: 0 }))
    expect(fake.capture).not.toHaveBeenCalledWith('onboarding_step_viewed', expect.anything())
    await ph.onConsent(true)
    expect(fake.capture).toHaveBeenCalledWith('onboarding_step_viewed', { step: 0 })
  })

  it('revogar chama opt_out_capturing + reset e para de enviar', async () => {
    const { ph, analytics } = setup(true)
    await ph.onConsent(true)
    analytics.value = false
    await ph.onConsent(false)
    expect(fake.opt_out_capturing).toHaveBeenCalled()
    expect(fake.reset).toHaveBeenCalled()

    fake.capture.mockClear()
    ph.handle.run(p => p.capture('x'))
    ph.onNavigate('/hoje', '/revisar')
    expect(fake.capture).not.toHaveBeenCalled()
  })

  it('reaceitar faz opt_in', async () => {
    const { ph } = setup(true)
    fake.has_opted_out_capturing.mockReturnValueOnce(true)
    await ph.onConsent(true)
    expect(fake.opt_in_capturing).toHaveBeenCalled()
  })

  it('pageview a cada troca de rota, não em troca só de query', async () => {
    const { ph } = setup(true)
    await ph.onConsent(true)
    fake.capture.mockClear()
    ph.onNavigate('/revisar', '/hoje')
    ph.onNavigate('/revisar', '/revisar')
    expect(fake.capture).toHaveBeenCalledTimes(1)
  })
})
