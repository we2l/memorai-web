import type { Component } from 'vue'
import { BarChart3, BookOpen, Dumbbell, Home } from 'lucide-vue-next'

/**
 * Single source of the app navigation (prd-navegacao-v3 RF-1/RF-2, Module Design §4.1): the 4 places of
 * the TopNav and the BottomNav, in a fixed order, and the account menu items. A place is active when the
 * route lives in one of its sections (/revisar, /simulados and /podcasts count as Praticar; /provas as
 * Progresso): the highlight follows the section, not the exact path.
 */
export type PlaceKey = 'hoje' | 'cadernos' | 'praticar' | 'progresso'

export interface Place {
  key: PlaceKey
  label: string
  to: string
  icon: Component
  /** Path prefixes that belong to the place */
  sections: readonly string[]
}

export const places: readonly Place[] = [
  { key: 'hoje', label: 'Hoje', to: '/hoje', icon: Home, sections: ['/hoje'] },
  { key: 'cadernos', label: 'Cadernos', to: '/cadernos', icon: BookOpen, sections: ['/cadernos', '/importar'] },
  { key: 'praticar', label: 'Praticar', to: '/praticar', icon: Dumbbell, sections: ['/praticar', '/revisar', '/simulados', '/podcasts'] },
  { key: 'progresso', label: 'Progresso', to: '/progresso', icon: BarChart3, sections: ['/progresso', '/provas'] },
]

/** `to` itself or a sub-path of it (/cadernos and /cadernos/x, never /cadernosx). */
export function isNavActive(currentPath: string, to: string): boolean {
  return currentPath === to || currentPath.startsWith(to + '/')
}

/** The place the route belongs to, or null (account, help, plans: no place is highlighted). */
export function activePlace(currentPath: string): PlaceKey | null {
  return places.find(p => p.sections.some(s => isNavActive(currentPath, s)))?.key ?? null
}

/**
 * Account menu (RF-3): each item goes to its section of /configuracoes (anchors) or runs an action in the
 * menu (appearance, sign out). The anchors are the `id` of the sections of pages/configuracoes.vue.
 */
export type AccountItemKey = 'conta' | 'estudo' | 'uso' | 'aparencia' | 'dados' | 'ajuda' | 'sair'

export const SETTINGS_ANCHORS = ['conta', 'plano', 'estudo', 'aparencia', 'dados'] as const

export const accountItems: readonly { key: AccountItemKey, label: string, to?: string }[] = [
  { key: 'conta', label: 'Conta e segurança', to: '/configuracoes#conta' },
  { key: 'estudo', label: 'Estudo e lembretes', to: '/configuracoes#estudo' },
  { key: 'uso', label: 'Uso de IA no mês', to: '/configuracoes#plano' },
  { key: 'aparencia', label: 'Aparência' },
  { key: 'dados', label: 'Exportar meus dados', to: '/configuracoes#dados' },
  { key: 'ajuda', label: 'Ajuda e atalhos', to: '/ajuda?tab=atalhos' },
  { key: 'sair', label: 'Sair' },
]
