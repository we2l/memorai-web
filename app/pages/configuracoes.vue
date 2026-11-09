<template>
  <div class="mx-auto w-full max-w-page px-gutter py-6">
    <h1 class="mb-5 text-page-title text-fg-strong">Configurações</h1>

    <div class="flex flex-col gap-5 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <!-- The side of the desktop is the list on top of the phone: the sections of the account menu -->
      <nav aria-label="Configurações" class="lg:sticky lg:top-topnav lg:pt-4">
        <ul class="flex flex-col max-lg:divide-y max-lg:divide-line max-lg:rounded-card max-lg:bg-raised max-lg:shadow-1">
          <li v-for="s in SETTINGS_SECTIONS" :key="s.id">
            <UiListRow :href="`#${s.id}`" :title="s.label" :active="isDesktop && active === s.id" data-testid="settings-nav" @click="onNav(s.id)" />
          </li>
        </ul>
      </nav>

      <div class="flex min-w-0 flex-col gap-section">
        <UiSection id="conta" title="Conta e segurança" data-settings-section>
          <SettingsAccountSection />
        </UiSection>
        <UiSection id="plano" title="Plano e uso de IA" data-settings-section>
          <SettingsPlanUsageSection />
        </UiSection>
        <UiSection id="estudo" title="Estudo e lembretes" data-settings-section>
          <SettingsStudySection :settings="settings" :loading="loading" :load-error="loadError" @retry="load" />
        </UiSection>
        <UiSection id="aparencia" title="Aparência" data-settings-section>
          <SettingsAppearanceSection />
        </UiSection>
        <UiSection id="dados" title="Seus dados" data-settings-section>
          <SettingsDataSection />
        </UiSection>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Settings v4 (prd-4g-conta-onboarding-v3 RF-F1..F3): 5 sections, one per item of the account menu, with the
// same names. Each field saves itself (no global "Salvar"); no primary on the page except "Conhecer o Pro".
// Old anchors (#lembretes, #uso...) land on the new sections. The item of the side follows the scroll.
import type { UserSettings } from '~/types'
import { SETTINGS_SECTIONS, settingsSectionOf, type SettingsSectionId } from '~/utils/settingsSections'

useHead({ title: 'Configurações · Baigi' })

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const isDesktop = useMediaQuery('(min-width: 1024px)')
const { track } = useAnalytics()

const settings = reactive<UserSettings>({
  daily_new_cards_limit: null,
  daily_review_limit: null,
  session_time_limit: null,
  survival_mode: false,
})
const loading = ref(true)
const loadError = ref(false)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    Object.assign(settings, (await $api<{ data: UserSettings }>('/settings')).data)
  } catch (e) {
    // Only "Estudo e lembretes" depends on /settings: the error stays there
    loadError.value = true
    reportApiError(e, { silent: true })
  } finally {
    loading.value = false
  }
}

const active = ref<SettingsSectionId>('conta')
function onNav(id: SettingsSectionId) {
  active.value = id
  track('settings_section_open', { section: id })
}

/** Goes to the section of the URL's anchor, translating the old names. */
async function followHash() {
  const section = settingsSectionOf(route.hash)
  if (!section) return
  if (route.hash !== `#${section}`) await router.replace({ hash: `#${section}` })
  active.value = section
  await nextTick()
  document.getElementById(section)?.scrollIntoView()
}
watch(() => route.hash, () => { void followHash() })

let observer: IntersectionObserver | null = null
onMounted(async () => {
  if ('IntersectionObserver' in window) {
    // The section crossing the upper part of the screen is the current one
    observer = new IntersectionObserver((entries) => {
      const hit = entries.find(e => e.isIntersecting)
      if (hit) active.value = hit.target.id as SettingsSectionId
    }, { rootMargin: '-15% 0px -75% 0px' })
    document.querySelectorAll('[data-settings-section]').forEach(el => observer!.observe(el))
  }
  if (!auth.user) await auth.fetchMe()
  void followHash()
  await load()
  // The study section grew when it loaded: land on the anchor again
  void followHash()
})
onBeforeUnmount(() => observer?.disconnect())
</script>
