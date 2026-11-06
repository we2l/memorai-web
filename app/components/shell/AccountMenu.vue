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

/**
 * "Intensivo · renova em 28/11", "Intensivo mensal", "Intensivo grátis até 12/11" (the trial, prd-planos-lancamento
 * RF-F1) or "Plano Grátis": the menu item of the plan, with the plan's name from the catalog.
 */
const proName = useProName()
const planItem = computed<MenuItem>(() => {
  const name = proName.value
  if (auth.onTrial) return { label: trialEndsLine(name, auth.user?.trial?.ends_at), meta: 'Ver planos', to: '/planos' }
  if ((auth.user?.plan ?? 'free') === 'free') return { label: 'Plano Grátis', meta: `Ver o ${name}`, to: '/planos' }
  const info = subscription.info
  let label = `Plano ${name}`
  const renewsAt = auth.user?.subscription_renews_at
  if (renewsAt) label = `${name} · renova em ${formatBillingDayMonth(renewsAt)}`
  else if (info?.subscription_ends_at) label = `${name} · termina em ${formatBillingDayMonth(info.subscription_ends_at)}`
  else if (info?.billing === 'annual' && info.plan_expires_at) label = `${name} · renova em ${formatBillingDayMonth(info.plan_expires_at)}`
  else if (info?.billing === 'monthly') label = `${name} mensal`
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
