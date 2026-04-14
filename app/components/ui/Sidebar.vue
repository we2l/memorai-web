<template>
  <aside class="hidden lg:flex flex-col bg-surface-secondary h-screen fixed left-0 top-0 w-[220px] p-4">
    <NuxtLink to="/dashboard" class="text-display text-primary-400 mb-8">
      Memorai
    </NuxtLink>

    <nav class="flex flex-col gap-1 flex-1" aria-label="Navegação principal">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-small text-base-secondary transition-all duration-150"
        :class="isActive(item.to) ? 'bg-primary-500/10 text-primary-400 font-medium' : 'hover:bg-surface-tertiary'"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <component :is="getIcon(item.icon)" :size="20" :stroke-width="1.5" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="border-t border-base pt-4 mt-4">
      <NuxtLink
        to="/settings"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-small text-base-muted hover:bg-surface-tertiary transition-all duration-150"
      >
        <Settings :size="20" :stroke-width="1.5" />
        Configurações
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  BarChart3,
  Settings,
} from 'lucide-vue-next'

const route = useRoute()

const items = [
  { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
  { label: 'Decks', to: '/decks', icon: 'decks' },
  { label: 'Revisão', to: '/review', icon: 'review' },
  { label: 'Estatísticas', to: '/stats', icon: 'stats' },
]

const iconMap: Record<string, any> = {
  dashboard: LayoutDashboard,
  decks: Layers,
  review: BookOpen,
  stats: BarChart3,
}

function getIcon(name: string) {
  return iconMap[name]
}

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>
