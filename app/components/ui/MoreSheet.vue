<template>
  <UiModal v-model="open" variant="sheet" aria-label="Mais opções">
    <div class="flex items-center justify-between gap-3 pr-12 pb-3 border-b border-line-strong">
      <p class="font-semibold text-fg-strong truncate">{{ auth.user?.name || 'Sua conta' }}</p>
      <UiPlanBadge :plan="auth.user?.plan" />
    </div>

    <nav aria-label="Mais destinos" class="py-2">
      <ul class="flex flex-col">
        <li v-for="item in items" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex items-center gap-3 px-3 min-h-[48px] rounded-xl text-body transition-colors"
            :class="isNavActive(route.path, item.to) ? 'bg-action-subtle text-action-fg font-medium' : 'text-fg hover:bg-line'"
            :aria-current="isNavActive(route.path, item.to) ? 'page' : undefined"
            @click="open = false"
          >
            <component :is="item.icon" :size="20" :stroke-width="1.5" aria-hidden="true" />
            {{ item.label }}
          </NuxtLink>
        </li>
        <li>
          <div class="flex items-center gap-3 px-3">
            <Moon :size="20" :stroke-width="1.5" class="shrink-0 text-fg" aria-hidden="true" />
            <UiSwitch :model-value="colorMode === 'dark'" label="Modo escuro" class="flex-1" @update:model-value="toggleMode" />
          </div>
        </li>
      </ul>
    </nav>

    <div class="border-t border-line-strong pt-2">
      <button
        type="button"
        class="w-full flex items-center gap-3 px-3 min-h-[48px] rounded-xl text-body text-danger hover:bg-danger-subtle"
        @click="handleLogout"
      >
        <LogOut :size="20" :stroke-width="1.5" aria-hidden="true" />
        Sair
      </button>
      <p class="flex gap-4 px-3 pt-3 text-label text-fg-muted">
        <NuxtLink to="/termos" class="underline min-h-[24px]" @click="open = false">Termos</NuxtLink>
        <NuxtLink to="/privacidade" class="underline min-h-[24px]" @click="open = false">Privacidade</NuxtLink>
      </p>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { LogOut, Moon } from 'lucide-vue-next'
import { secondaryNav, accountNav, isNavActive } from '~/utils/navigation'

const open = defineModel<boolean>({ required: true })

const route = useRoute()
const auth = useAuthStore()
const { colorMode, toggle: toggleMode } = useColorMode()
const { logout } = useLogout()

const items = [...secondaryNav, ...accountNav]

async function handleLogout() {
  open.value = false
  await logout()
}

// Any navigation closes the sheet (also back/forward)
watch(() => route.fullPath, () => { open.value = false })
</script>
