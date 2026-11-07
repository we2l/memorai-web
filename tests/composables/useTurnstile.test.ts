import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useTurnstile } from '~/composables/useTurnstile'
import { CAPTCHA_MESSAGES, TURNSTILE_SCRIPT, loadTurnstile, resetTurnstileLoader, type TurnstileRenderOptions } from '~/utils/turnstile'

const { siteKey } = vi.hoisted(() => ({ siteKey: { value: '1x00000000000000000000AA' } }))

mockNuxtImport('useRuntimeConfig', original => () => {
  const config = original()
  return { ...config, public: { ...config.public, turnstileSiteKey: siteKey.value } }
})

function fakeTurnstile() {
  const widgets: TurnstileRenderOptions[] = []
  const api = {
    render: vi.fn((_el: HTMLElement, options: TurnstileRenderOptions) => {
      widgets.push(options)
      return `w${widgets.length}`
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  }
  window.turnstile = api
  return { api, widgets }
}

function withTurnstile() {
  let captcha!: ReturnType<typeof useTurnstile>
  const wrapper = mount(defineComponent({
    setup() {
      captcha = useTurnstile()
      return () => h('div')
    },
  }))
  return { captcha, wrapper }
}

/** Keeps the injected script out of happy-dom (which would try to download it). */
function interceptScripts() {
  const scripts: HTMLScriptElement[] = []
  vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
    scripts.push(node as HTMLScriptElement)
    return node
  })
  return scripts
}

describe('useTurnstile', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    siteKey.value = '1x00000000000000000000AA'
    resetTurnstileLoader()
    delete window.turnstile
    document.head.querySelectorAll('script[src*="challenges.cloudflare.com"]').forEach(s => s.remove())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is off without a site key: no script, no token', async () => {
    siteKey.value = ''
    const { captcha } = withTurnstile()

    await captcha.render(document.createElement('div'))

    expect(captcha.enabled).toBe(false)
    await expect(captcha.getToken()).resolves.toBeUndefined()
    expect(document.head.querySelector(`script[src="${TURNSTILE_SCRIPT}"]`)).toBeNull()
  })

  it('renders a managed, interaction-only widget in pt-br and hands the token', async () => {
    const { api, widgets } = fakeTurnstile()
    const { captcha } = withTurnstile()
    const el = document.createElement('div')

    await captcha.render(el)
    expect(api.render).toHaveBeenCalledWith(el, expect.objectContaining({
      sitekey: '1x00000000000000000000AA',
      appearance: 'interaction-only',
      language: 'pt-br',
    }))

    const pending = captcha.getToken()
    widgets[0]!.callback('XXXX.DUMMY.TOKEN.XXXX')
    await expect(pending).resolves.toBe('XXXX.DUMMY.TOKEN.XXXX')
    // Already solved: no wait
    await expect(captcha.getToken()).resolves.toBe('XXXX.DUMMY.TOKEN.XXXX')
  })

  it('reset() asks Cloudflare for a new token (single use)', async () => {
    const { api, widgets } = fakeTurnstile()
    const { captcha } = withTurnstile()
    await captcha.render(document.createElement('div'))
    widgets[0]!.callback('t1')

    captcha.reset()

    expect(api.reset).toHaveBeenCalledWith('w1')
    const next = captcha.getToken()
    widgets[0]!.callback('t2')
    await expect(next).resolves.toBe('t2')
  })

  it('a widget error rejects with the PT-BR message', async () => {
    const { widgets } = fakeTurnstile()
    const { captcha } = withTurnstile()
    await captcha.render(document.createElement('div'))

    const pending = captcha.getToken()
    await flushPromises()
    expect(widgets[0]!['error-callback']('300030')).toBe(true)

    await expect(pending).rejects.toThrow(CAPTCHA_MESSAGES.failed)
    expect(captcha.error.value).toBe(CAPTCHA_MESSAGES.failed)
  })

  it('a script that does not load gives the load message and is tried again', async () => {
    const scripts = interceptScripts()
    const { captcha } = withTurnstile()

    const rendering = captcha.render(document.createElement('div'))
    expect(scripts[0]!.src).toBe(TURNSTILE_SCRIPT)
    scripts[0]!.onerror!(new Event('error'))
    await rendering
    expect(captcha.error.value).toBe(CAPTCHA_MESSAGES.load)

    // The next submit tries the script again on the same element
    const retry = captcha.getToken()
    await flushPromises()
    expect(scripts).toHaveLength(2)
    scripts[1]!.onerror!(new Event('error'))
    await expect(retry).rejects.toThrow(CAPTCHA_MESSAGES.load)
  })

  it('removes the widget when the screen leaves', async () => {
    const { api } = fakeTurnstile()
    const { captcha, wrapper } = withTurnstile()
    await captcha.render(document.createElement('div'))

    wrapper.unmount()

    expect(api.remove).toHaveBeenCalledWith('w1')
  })

  it('loads the script once', async () => {
    const scripts = interceptScripts()
    const first = loadTurnstile()
    const second = loadTurnstile()
    expect(scripts).toHaveLength(1)
    const { api } = fakeTurnstile()
    scripts[0]!.onload!(new Event('load'))
    await expect(first).resolves.toBe(api)
    await expect(second).resolves.toBe(api)
  })
})
