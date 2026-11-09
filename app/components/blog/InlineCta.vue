<template>
  <aside class="rounded-row border-l-4 border-action bg-raised px-5 py-4 shadow-1" aria-label="Teste no Baigi">
    <p class="mb-2 text-body text-fg-strong">{{ text }}</p>
    <UiLink :href="href" variant="action" standalone class="font-semibold" @click="onClick">
      Testar com 6 cards de {{ AREA_LABEL[area] }}, sem criar conta
    </UiLink>
  </aside>
</template>

<script setup lang="ts">
// The call in the step where the Baigi solves it (RF-B7: 1 of the 3 calls of an article, inline, never fixed)
import type { BlogArea } from '~~/modules/blog/types'
import { AREA_LABEL, blogStartPath } from '~/utils/blog'

const props = defineProps<{ slug: string, area: BlogArea, text: string }>()
const href = computed(() => blogStartPath(props.area, props.slug, 'inline'))
const { track } = useAnalytics()
function onClick() {
  track('blog_cta_clicked', { slug: props.slug, position: 'inline', area: props.area })
}
</script>
