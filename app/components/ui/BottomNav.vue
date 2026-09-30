<template>
  <div>
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-base z-50"
    style="padding-bottom: env(safe-area-inset-bottom);"
    aria-label="Navegação mobile"
  >
    <div class="flex items-stretch justify-around h-16">
      <NuxtLink
        v-for="item in primaryNav"
        :key="item.to"
        :to="item.to"
        class="flex-1 min-w-[44px] flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] min-[360px]:text-small transition-all duration-150"
        :class="isNavActive(route.path, item.to) ? activeClass : 'text-base-muted'"
        :aria-current="isNavActive(route.path, item.to) ? 'page' : undefined"
      >
        <component :is="item.icon" :size="20" :stroke-width="1.5" aria-hidden="true" />
        {{ item.label }}
      </NuxtLink>
      <button
        ref="moreButton"
        type="button"
        class="flex-1 min-w-[44px] flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] min-[360px]:text-small transition-all duration-150"
        :class="moreActive ? activeClass : 'text-base-muted'"
        aria-haspopup="dialog"
        :aria-expanded="moreOpen"
        :aria-current="moreActive ? 'page' : undefined"
        @click="moreOpen = true"
      >
        <Menu :size="20" :stroke-width="1.5" aria-hidden="true" />
        Mais
      </button>
    </div>
  </nav>
  <LazyUiMoreSheet v-if="moreLoaded" v-model="moreOpen" />
  </div>
</template>

<script setup lang="ts">
import { Menu } from 'lucide-vue-next'
import { primaryNav, secondaryNav, accountNav, isNavActive } from '~/utils/navigation'

const route = useRoute()
const moreOpen = ref(false)
const moreLoaded = useLoadedOnce(() => moreOpen.value)
const activeClass = 'text-[var(--badge-primary-text)] font-medium'

// "Mais" is active when the current route lives inside the sheet
const moreActive = computed(() => [...secondaryNav, ...accountNav].some(i => isNavActive(route.path, i.to)))
</script>
