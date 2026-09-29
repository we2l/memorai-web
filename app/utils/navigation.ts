import type { Component } from 'vue'
import {
  Home,
  BookOpen,
  RotateCcw,
  BarChart3,
  Headphones,
  ClipboardCheck,
  CalendarClock,
  Settings,
  HelpCircle,
} from 'lucide-vue-next'

export interface NavItem {
  label: string
  to: string
  icon: Component
}

/** Single source of the app navigation (Sidebar, BottomNav and MoreSheet). */
export const primaryNav: NavItem[] = [
  { label: 'Hoje', to: '/hoje', icon: Home },
  { label: 'Cadernos', to: '/cadernos', icon: BookOpen },
  { label: 'Revisão', to: '/revisar', icon: RotateCcw },
  { label: 'Progresso', to: '/progresso', icon: BarChart3 },
]

export const secondaryNav: NavItem[] = [
  { label: 'Simulados', to: '/simulados', icon: ClipboardCheck },
  { label: 'Provas', to: '/provas', icon: CalendarClock },
  { label: 'Podcasts', to: '/podcasts', icon: Headphones },
]

export const accountNav: NavItem[] = [
  { label: 'Configurações', to: '/configuracoes', icon: Settings },
  { label: 'Ajuda', to: '/ajuda', icon: HelpCircle },
]

export function isNavActive(currentPath: string, to: string): boolean {
  return currentPath === to || currentPath.startsWith(to + '/')
}
