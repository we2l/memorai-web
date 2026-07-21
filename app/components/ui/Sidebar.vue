<template>
  <aside class="hidden lg:flex flex-col bg-[var(--bg-card)] border-r border-base h-screen fixed left-0 top-0 w-[240px] p-5">
    <NuxtLink to="/hoje" class="mb-8 group">
      <UiLogo :icon-size="28" text-class="text-xl font-semibold text-accent-primary" />
    </NuxtLink>

    <nav class="flex flex-col gap-1 flex-1" aria-label="Navegação principal" data-tour="sidebar-notebooks">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-small transition-all duration-150"
        :class="isActive(item.to) ? 'bg-accent-primary-subtle text-[var(--color-accent-soft)] font-medium border-l-3 border-l-[var(--color-accent-soft)]' : 'text-base-secondary hover:text-[var(--color-accent-soft)] hover:bg-accent-primary-subtle'"
        :aria-current="isActive(item.to) ? 'page' : undefined"
        :data-tour="item.to === '/revisar' ? 'review-link' : undefined"
      >
        <component :is="getIcon(item.icon)" :size="20" :stroke-width="1.5" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="border-t border-base pt-4 mt-4">
      <UiPlanBadge :plan="auth.user?.plan" />
      <button
        @click="toggleMode"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-small text-base-muted hover:text-[var(--color-accent-soft)] hover:bg-accent-primary-subtle transition-all duration-150 w-full"
      >
        <Moon v-if="colorMode === 'light'" :size="20" :stroke-width="1.5" />
        <Sun v-else :size="20" :stroke-width="1.5" />
        {{ colorMode === 'light' ? 'Modo escuro' : 'Modo claro' }}
      </button>
      <NuxtLink
        to="/configuracoes"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-small text-base-muted hover:text-[var(--color-accent-soft)] hover:bg-accent-primary-subtle transition-all duration-150"
      >
        <Settings :size="20" :stroke-width="1.5" />
        Configurações
      </NuxtLink>
      <button
        @click="handleLogout"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-small text-danger hover:bg-danger/5 transition-all duration-150 w-full mt-1"
      >
        <LogOut :size="20" :stroke-width="1.5" />
        Sair
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
} from 'lucide-vue-next'

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
  { label: 'Podcasts', to: '/podcasts', icon: 'podcasts' },
  { label: 'Progresso', to: '/progresso', icon: 'progress' },
]

const iconMap: Record<string, any> = {
  home: Home,
  topics: BookOpen,
  review: RotateCcw,
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
