<template>
  <aside class="flex flex-col gap-3 rounded-card bg-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between blog-inline-cta" aria-label="Teste no Baigi">
    <p class="text-body text-fg-strong">{{ text }}</p>
    <UiButton variant="secondary" size="sm" :href="href" class="shrink-0" data-testid="blog-inline-cta" @click="onClick">
      Revisar 6 cards de {{ AREA_LABEL[area] }}
    </UiButton>
  </aside>
</template>

<script setup lang="ts">
// The call in the step where the Baigi solves it (RF-B7: 1 of the 3 calls of an article, inline, never fixed). Calm
// (prd-blog-v2 RF-V2): gray box and a secondary button; the page's one purple is the end call.
import type { BlogArea } from '~~/modules/blog/types'
import { AREA_LABEL, blogStartPath } from '~/utils/blog'

const props = defineProps<{ slug: string, area: BlogArea, text: string }>()
const href = computed(() => blogStartPath(props.area, props.slug, 'inline'))
const { track } = useAnalytics()
function onClick() {
  track('blog_cta_clicked', { slug: props.slug, position: 'inline', area: props.area })
}
</script>
