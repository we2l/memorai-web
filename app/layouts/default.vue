<template>
  <div class="min-h-screen bg-surface">
    <UiSidebar />
    <UiBottomNav />

    <main class="lg:ml-[220px] pb-20 lg:pb-0">
      <div class="flex justify-center px-6 pt-4">
        <button
          class="p-2 rounded-lg text-base-secondary hover:text-accent-primary hover:bg-surface-tertiary transition-colors"
          :title="colorMode === 'dark' ? 'Modo claro' : 'Modo escuro'"
          aria-label="Alternar tema"
          @click="toggle"
        >
          <Sun v-if="colorMode === 'dark'" :size="20" :stroke-width="1.5" />
          <Moon v-else :size="20" :stroke-width="1.5" />
        </button>
      </div>
      <slot />
    </main>

    <UiToast
      :message="toast.state.message"
      :type="toast.state.type"
      :visible="toast.state.visible"
    />

    <UiUpgradeModal
      v-model="showUpgrade"
      :feature="upgradeFeature"
      :plan-required="upgradePlan"
    />
  </div>
</template>

<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'

const toast = useToast()
const { colorMode, toggle } = useColorMode()

const showUpgrade = ref(false)
const upgradeFeature = ref('')
const upgradePlan = ref('pro')

onMounted(() => {
  window.addEventListener('feature-limit-reached', ((e: CustomEvent) => {
    upgradeFeature.value = e.detail?.feature || ''
    upgradePlan.value = e.detail?.planRequired || 'pro'
    showUpgrade.value = true
  }) as EventListener)
})
</script>
