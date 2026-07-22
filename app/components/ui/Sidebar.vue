<template>
  <aside
    class="hidden lg:flex flex-col bg-[var(--bg-card)] border-r border-base h-screen fixed left-0 top-0 transition-all duration-200 overflow-hidden"
    :class="collapsed ? 'w-16' : 'w-[240px]'"
    :style="{ padding: collapsed ? '1.25rem 0.5rem' : '1.25rem' }"
  >
    <NuxtLink to="/hoje" class="mb-8" :class="collapsed ? 'flex justify-center' : ''">
      <UiLogo v-if="!collapsed" :icon-size="28" text-class="text-xl font-semibold text-accent-primary" />
      <UiLogo v-else :icon-size="24" :show-text="false" />
    </NuxtLink>

    <nav class="flex flex-col gap-1 flex-1" aria-label="Navegação principal" data-tour="sidebar-notebooks">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center rounded-xl text-small transition-all duration-150"
        :class="[
          collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
          isActive(item.to) ? 'bg-accent-primary-subtle text-[var(--color-accent-soft)] font-medium' + (collapsed ? '' : ' border-l-3 border-l-[var(--color-accent-soft)]') : 'text-base-secondary hover:text-[var(--color-accent-soft)] hover:bg-accent-primary-subtle',
        ]"
        :aria-current="isActive(item.to) ? 'page' : undefined"
        :title="collapsed ? item.label : undefined"
        :data-tour="item.to === '/revisar' ? 'review-link' : undefined"
      >
        <component :is="getIcon(item.icon)" :size="20" :stroke-width="1.5" />
        <span v-if="!collapsed">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="border-t border-base pt-4 mt-4" :class="collapsed ? 'flex flex-col items-center gap-1' : ''">
      <UiPlanBadge v-if="!collapsed" :plan="auth.user?.plan" />
      <button
        @click="toggleMode"
        class="flex items-center rounded-xl text-small transition-all duration-150 w-full"
        :class="collapsed ? 'justify-center px-0 py-2.5 text-base-muted hover:text-[var(--color-accent-soft)] hover:bg-accent-primary-subtle' : 'gap-3 px-3 py-2.5 text-base-muted hover:text-[var(--color-accent-soft)] hover:bg-accent-primary-subtle'"
        :title="collapsed ? (colorMode === 'light' ? 'Modo escuro' : 'Modo claro') : undefined"
      >
        <Moon v-if="colorMode === 'light'" :size="20" :stroke-width="1.5" />
        <Sun v-else :size="20" :stroke-width="1.5" />
        <span v-if="!collapsed">{{ colorMode === 'light' ? 'Modo escuro' : 'Modo claro' }}</span>
      </button>
      <NuxtLink
        to="/ajuda"
        class="flex items-center rounded-xl text-small text-base-muted hover:text-[var(--color-accent-soft)] hover:bg-accent-primary-subtle transition-all duration-150"
        :class="collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'"
        :title="collapsed ? 'Ajuda' : undefined"
      >
        <HelpCircle :size="20" :stroke-width="1.5" />
        <span v-if="!collapsed">Ajuda</span>
      </NuxtLink>
      <NuxtLink
        to="/configuracoes"
        class="flex items-center rounded-xl text-small text-base-muted hover:text-[var(--color-accent-soft)] hover:bg-accent-primary-subtle transition-all duration-150"
        :class="collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'"
        :title="collapsed ? 'Configurações' : undefined"
      >
        <Settings :size="20" :stroke-width="1.5" />
        <span v-if="!collapsed">Configurações</span>
      </NuxtLink>
      <button
        @click="handleLogout"
        class="flex items-center rounded-xl text-small text-danger hover:bg-danger/5 transition-all duration-150 w-full mt-1"
        :class="collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'"
        :title="collapsed ? 'Sair' : undefined"
      >
        <LogOut :size="20" :stroke-width="1.5" />
        <span v-if="!collapsed">Sair</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  Home,
  BookOpen,
  RotateCcw,
  Headphones,
  BarChart3,
  Settings,
  LogOut,
  Moon,
  Sun,
  HelpCircle,
  ClipboardCheck,
} from 'lucide-vue-next'

defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()
const auth = useAuthStore()
const { $api } = useNuxtApp()
const { colorMode, toggle: toggleMode } = useColorMode()

async function handleLogout() {
  try {
    await $api('/logout', { method: 'POST' })
  } catch {}
  auth.clearAuth()
  await navigateTo('/entrar')
}

const items = [
  { label: 'Hoje', to: '/hoje', icon: 'home' },
  { label: 'Cadernos', to: '/cadernos', icon: 'topics' },
  { label: 'Revisão', to: '/revisar', icon: 'review' },
  { label: 'Simulados', to: '/simulados', icon: 'quiz' },
  { label: 'Podcasts', to: '/podcasts', icon: 'podcasts' },
  { label: 'Progresso', to: '/progresso', icon: 'progress' },
]

const iconMap: Record<string, any> = {
  home: Home,
  topics: BookOpen,
  review: RotateCcw,
  quiz: ClipboardCheck,
  podcasts: Headphones,
  progress: BarChart3,
}

function getIcon(name: string) {
  return iconMap[name]
}

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>
