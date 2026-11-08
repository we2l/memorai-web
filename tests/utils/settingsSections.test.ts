import { describe, expect, it } from 'vitest'
import { SETTINGS_SECTIONS, settingsSectionOf } from '~/utils/settingsSections'
import { accountItems, SETTINGS_ANCHORS } from '~/utils/navigation'

describe('settingsSections (prd-4g-conta-onboarding-v3 RF-F1)', () => {
  it('as 5 seções são as âncoras do menu da conta', () => {
    expect(SETTINGS_SECTIONS.map(s => s.id)).toEqual([...SETTINGS_ANCHORS])
    const anchors = accountItems.filter(i => i.to?.startsWith('/configuracoes#')).map(i => i.to!.split('#')[1])
    for (const a of anchors) expect(SETTINGS_ANCHORS as readonly (string | undefined)[]).toContain(a)
  })

  it('âncoras antigas (e-mails, favoritos, política) caem na seção nova', () => {
    expect(settingsSectionOf('#lembretes')).toBe('estudo')
    expect(settingsSectionOf('#seguranca')).toBe('conta')
    expect(settingsSectionOf('#senha')).toBe('conta')
    expect(settingsSectionOf('#perfil')).toBe('conta')
    expect(settingsSectionOf('#uso')).toBe('plano')
    expect(settingsSectionOf('#privacidade')).toBe('dados')
    expect(settingsSectionOf('#seus-dados')).toBe('dados')
  })

  it('âncora nova é ela mesma, e o resto é nada', () => {
    expect(settingsSectionOf('#conta')).toBe('conta')
    expect(settingsSectionOf('')).toBeNull()
    expect(settingsSectionOf('#outra')).toBeNull()
  })
})
