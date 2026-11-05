<template>
  <UiMenu :items="items" label="Menu da conta" align="end">
    <template #trigger="{ props: trigger }">
      <button
        v-bind="trigger as Record<string, unknown>"
        type="button"
        aria-label="Menu da conta"
        class="inline-flex size-touch shrink-0 items-center justify-center rounded-full"
      >
        <span class="flex size-8 items-center justify-center rounded-full bg-action-subtle text-label font-semibold text-action-fg" aria-hidden="true">{{ initials }}</span>
      </button>
    </template>
    <template #header>
      <div class="mb-1 flex items-center gap-3 border-b border-line px-3 pt-2 pb-3">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-action-subtle text-meta font-semibold text-action-fg" aria-hidden="true">{{ initials }}</span>
        <div class="min-w-0">
          <p class="truncate font-semibold text-fg-strong">{{ auth.user?.name || 'Sua conta' }}</p>
          <p v-if="auth.user?.email" class="truncate text-meta text-fg-muted">{{ auth.user.email }}</p>
        </div>
      </div>
    </template>
  </UiMenu>
</template>

<script setup lang="ts">
// Account menu of the shell (prd-navegacao-v3 RF-3, canvas MenuContaV2): the avatar of the TopNav and of
// the page header on the phone. Name and e-mail on top; the plan with its renewal; the items of
// utils/navigation.ts (anchors of /configuracoes); Aparência is the theme composable of the Fase 1
// (Sistema/Claro/Escuro, radio items); Sair runs the single logout flow. Replaces the sidebar footer,
// the "Mais" sheet and their theme toggles.
import type { MenuItem } from '~/components/ui/Menu.vue'
import { accountItems } from '~/utils/navigation'
import { formatBillingDayMonth } from '~/utils/billing'

const auth = useAuthStore()
const subscription = useSubscriptionStore()
const { preference, set } = useColorMode()
const { logout } = useLogout()

const initials = computed(() => {
  const parts = (auth.user?.name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return ((parts[0]![0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase()
})

/** "Pro · renova em 28/11", "Pro mensal" or "Plano Free" (the menu item of the plan). */
const planItem = computed<MenuItem>(() => {
  if ((auth.user?.plan ?? 'free') === 'free') return { label: 'Plano Free', meta: 'Ver o Pro', to: '/planos' }
  const info = subscription.info
  let label = 'Plano Pro'
  if (info?.subscription_ends_at) label = `Pro · termina em ${formatBillingDayMonth(info.subscription_ends_at)}`
  else if (info?.billing === 'annual' && info.plan_expires_at) label = `Pro · renova em ${formatBillingDayMonth(info.plan_expires_at)}`
  else if (info?.billing === 'monthly') label = 'Pro mensal'
  return { label, meta: 'Gerenciar', to: '/configuracoes#plano' }
})

const THEMES = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
] as const

const items = computed<MenuItem[]>(() => {
  const out: MenuItem[] = [planItem.value]
  for (const item of accountItems) {
    if (item.key === 'aparencia') {
      for (const t of THEMES) {
        out.push({ label: t.label, group: item.label, checked: preference.value === t.value, onSelect: () => set(t.value) })
      }
    } else if (item.key === 'sair') {
      out.push({ label: item.label, tone: 'danger', onSelect: () => { void logout() } })
    } else {
      out.push({
        label: item.label,
        to: item.to,
        meta: item.key === 'ajuda' ? '?' : undefined,
        separator: item.key === 'ajuda',
      })
    }
  }
  return out
})
</script>
