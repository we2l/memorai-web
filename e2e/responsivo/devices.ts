import { devices } from '@playwright/test'

/**
 * Aparelhos da auditoria de responsividade (prd-responsividade). Descritores do Playwright (viewport sem as barras
 * do navegador, isMobile, hasTouch e o fator de escala), sempre no Chromium: o WebKit não está instalado na máquina
 * nem no CI, e o que se mede aqui (largura, áreas de toque, folhas) não depende do motor.
 *
 * - "Galaxy S" é o Galaxy S24 (360×780) e o Android pequeno é o Galaxy S5 (360×640).
 * - O Playwright não tem iPad Air: o iPad (gen 7) com a viewport do Air (820×1180).
 */
type Descriptor = (typeof devices)[string]

export interface AuditDevice {
  /** Nome curto, usado nos arquivos das capturas */
  key: string
  label: string
  use: Descriptor & { colorScheme?: 'light' | 'dark' }
}

const chromium = (d: Descriptor, extra: Partial<Descriptor> = {}): Descriptor => ({ ...d, ...extra, defaultBrowserType: 'chromium' })

export const AUDIT_DEVICES: AuditDevice[] = [
  { key: 'iphone-se', label: 'iPhone SE (375×667)', use: chromium(devices['iPhone SE (3rd gen)']!) },
  { key: 'iphone-se-paisagem', label: 'iPhone SE paisagem (667×375)', use: chromium(devices['iPhone SE (3rd gen) landscape']!) },
  { key: 'iphone-13', label: 'iPhone 13/14 (390×664)', use: chromium(devices['iPhone 13']!) },
  { key: 'iphone-13-paisagem', label: 'iPhone 13/14 paisagem (750×342)', use: chromium(devices['iPhone 13 landscape']!) },
  { key: 'iphone-13-escuro', label: 'iPhone 13/14 escuro', use: { ...chromium(devices['iPhone 13']!), colorScheme: 'dark' } },
  { key: 'iphone-pro-max', label: 'iPhone 14/15 Pro Max (430×740)', use: chromium(devices['iPhone 14 Pro Max']!) },
  { key: 'galaxy-s', label: 'Galaxy S24 (360×780)', use: chromium(devices['Galaxy S24']!) },
  { key: 'android-pequeno', label: 'Galaxy S5 (360×640)', use: chromium(devices['Galaxy S5']!) },
  { key: 'pixel-7', label: 'Pixel 7 (412×839)', use: chromium(devices['Pixel 7']!) },
  { key: 'pixel-7-escuro', label: 'Pixel 7 escuro', use: { ...chromium(devices['Pixel 7']!), colorScheme: 'dark' } },
  { key: 'ipad-mini', label: 'iPad Mini (768×1024)', use: chromium(devices['iPad Mini']!) },
  { key: 'ipad-air', label: 'iPad Air (820×1180)', use: chromium(devices['iPad (gen 7)']!, { viewport: { width: 820, height: 1180 } }) },
]

/** Subconjunto leve do CI (e2e/responsivo.spec.ts): o menor, o maior celular, a paisagem e o tablet. */
export const CI_DEVICES = AUDIT_DEVICES.filter(d => ['android-pequeno', 'iphone-se', 'iphone-pro-max', 'iphone-13-paisagem', 'ipad-mini'].includes(d.key))
