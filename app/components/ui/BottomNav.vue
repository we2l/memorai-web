<template>
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-secondary border-t border-base z-50"
    aria-label="Navegação mobile"
  >
    <div class="flex items-center justify-around h-16">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-0.5 px-3 py-1.5 text-small transition-all duration-150"
        :class="isActive(item.to) ? 'text-accent-primary' : 'text-base-muted'"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <component :is="getIcon(item.icon)" :size="22" :stroke-width="1.5" />
        {{ item.label }}
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import {
  Home,
  BookOpen,
  RotateCcw,
  BarChart3,
  Headphones,
} from 'lucide-vue-next'

const route = useRoute()

const items = [
  { label: 'Hoje', to: '/today', icon: 'home' },
  { label: 'Cadernos', to: '/topics', icon: 'topics' },
  { label: 'Revisão', to: '/review', icon: 'review' },
  { label: 'Podcasts', to: '/podcasts', icon: 'podcasts' },
  { label: 'Progresso', to: '/progress', icon: 'progress' },
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
