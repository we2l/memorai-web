import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import ForgettingCurve from '~/components/onboarding/ForgettingCurve.vue'
import { axeViolations } from './ui/axe'

enableAutoUnmount(afterEach)

// The shape of GET /onboarding/areas/{area}.forgetting_curve (FsrsService::forgettingCurve)
const without = Array.from({ length: 31 }, (_, d) => [d, Math.round((1 + 0.9804 * d / 2.3065) ** -0.1542 * 100) / 100] as [number, number])
const CURVE = { days: 30, without, with: [[0, 1], [1, 0.95], [2, 0.9], [2, 1], [13, 0.9], [13, 1], [30, 0.94]] as [number, number][], reviews: [2, 13] }

describe('curva do esquecimento do resultado (prd-revisao-v5-fase-a RF-F8)', () => {
  it('duas linhas, as revisões marcadas, "Estimativa" e o texto alternativo com os números', async () => {
    const w = await mountSuspended(ForgettingCurve, { attachTo: document.body, props: { curve: CURVE } })
    expect(w.get('[data-testid=guest-curve-estimate]').text()).toBe('Estimativa')
    expect(w.get('[data-testid=guest-curve-without]').attributes('points')!.split(' ')).toHaveLength(31)
    expect(w.findAll('circle')).toHaveLength(2)
    const alt = w.get('[data-testid=guest-curve-svg]').attributes('aria-label')!
    expect(alt).toContain('uns 67% em 30 dias')
    expect(alt).toContain('acima de 90%')
    expect(w.text()).toContain('FSRS-6')
    expect(await axeViolations(document.body)).toEqual([])
  })
})
