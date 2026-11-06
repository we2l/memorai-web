/**
 * The sections of /configuracoes (prd-4g-conta-onboarding-v3 RF-F1): one per item of the account menu, with
 * the same name. The old anchors keep working (links in e-mails, favorites, the privacy policy).
 */
export const SETTINGS_SECTIONS = [
  { id: 'conta', label: 'Conta e segurança' },
  { id: 'plano', label: 'Plano e uso de IA' },
  { id: 'estudo', label: 'Estudo e lembretes' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'dados', label: 'Seus dados' },
] as const

export type SettingsSectionId = typeof SETTINGS_SECTIONS[number]['id']

const OLD_ANCHORS: Record<string, SettingsSectionId> = {
  perfil: 'conta',
  seguranca: 'conta',
  senha: 'conta',
  uso: 'plano',
  lembretes: 'estudo',
  privacidade: 'dados',
  'seus-dados': 'dados',
}

/** The section of an anchor ("#lembretes" → estudo), or null when it is not one of them. */
export function settingsSectionOf(hash: string): SettingsSectionId | null {
  const id = hash.replace(/^#/, '')
  if (SETTINGS_SECTIONS.some(s => s.id === id)) return id as SettingsSectionId
  return OLD_ANCHORS[id] ?? null
}
