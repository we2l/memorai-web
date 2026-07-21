<template>
  <aside class="hidden lg:flex flex-col bg-[var(--bg-card)] border-r border-base h-screen fixed left-0 top-0 w-[240px] p-5">
    <NuxtLink to="/hoje" class="mb-8 group">
      <UiLogo :icon-size="28" text-class="text-xl font-semibold text-base-primary" />
    </NuxtLink>

    <nav class="flex flex-col gap-1 flex-1" aria-label="Navegação principal" data-tour="sidebar-notebooks">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-small transition-all duration-150"
        :class="isActive(item.to) ? 'bg-primary-50 text-primary-500 font-medium border-l-3 border-l-primary-500' : 'text-base-secondary hover:text-base-primary hover:bg-[var(--border-base)]'"
        :aria-current="isActive(item.to) ? 'page' : undefined"
        :data-tour="item.to === '/revisar' ? 'review-link' : undefined"
      >
        <component :is="getIcon(item.icon)" :size="20" :stroke-width="1.5" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="border-t border-base pt-4 mt-4">
      <UiPlanBadge :plan="auth.user?.plan" />
      <NuxtLink
        to="/configuracoes"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-small text-base-muted hover:text-base-primary hover:bg-[var(--border-base)] transition-all duration-150"
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
} from 'lucide-vue-next'

const route = useRoute()
const auth = useAuthStore()
const { $api } = useNuxtApp()

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
