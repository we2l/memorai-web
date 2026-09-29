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
          isNavActive(route.path, item.to) ? 'bg-accent-primary-subtle text-[var(--color-accent-soft)] font-medium' + (collapsed ? '' : ' border-l-3 border-l-[var(--color-accent-soft)]') : 'text-base-secondary hover:text-[var(--color-accent-soft)] hover:bg-accent-primary-subtle',
        ]"
        :aria-current="isNavActive(route.path, item.to) ? 'page' : undefined"
        :title="collapsed ? item.label : undefined"
        :aria-label="collapsed ? item.label : undefined"
        :data-tour="item.to === '/revisar' ? 'review-link' : undefined"
      >
        <component :is="item.icon" :size="20" :stroke-width="1.5" aria-hidden="true" />
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
        :aria-label="collapsed ? (colorMode === 'light' ? 'Modo escuro' : 'Modo claro') : undefined"
      >
        <Moon v-if="colorMode === 'light'" :size="20" :stroke-width="1.5" aria-hidden="true" />
        <Sun v-else :size="20" :stroke-width="1.5" aria-hidden="true" />
        <span v-if="!collapsed">{{ colorMode === 'light' ? 'Modo escuro' : 'Modo claro' }}</span>
      </button>
      <NuxtLink
        v-for="item in accountNavOrdered"
        :key="item.to"
        :to="item.to"
        class="flex items-center rounded-xl text-small text-base-muted hover:text-[var(--color-accent-soft)] hover:bg-accent-primary-subtle transition-all duration-150"
        :class="collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'"
        :title="collapsed ? item.label : undefined"
        :aria-label="collapsed ? item.label : undefined"
        :aria-current="isNavActive(route.path, item.to) ? 'page' : undefined"
      >
        <component :is="item.icon" :size="20" :stroke-width="1.5" aria-hidden="true" />
        <span v-if="!collapsed">{{ item.label }}</span>
      </NuxtLink>
      <button
        @click="handleLogout"
        class="flex items-center rounded-xl text-small text-danger hover:bg-danger/5 transition-all duration-150 w-full mt-1"
        :class="collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'"
        :title="collapsed ? 'Sair' : undefined"
        :aria-label="collapsed ? 'Sair' : undefined"
      >
        <LogOut :size="20" :stroke-width="1.5" aria-hidden="true" />
        <span v-if="!collapsed">Sair</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { LogOut, Moon, Sun } from 'lucide-vue-next'
import { primaryNav, secondaryNav, accountNav, isNavActive } from '~/utils/navigation'

defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()
const auth = useAuthStore()
const { colorMode, toggle: toggleMode } = useColorMode()
const { logout } = useLogout()

function handleLogout() {
  return logout()
}

const items = [...primaryNav, ...secondaryNav]
// Sidebar footer historically lists Ajuda before Configurações
const accountNavOrdered = [...accountNav].reverse()
</script>
