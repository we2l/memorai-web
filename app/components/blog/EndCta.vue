<template>
  <aside class="rounded-card bg-tinted p-6 sm:p-8" aria-labelledby="blog-end-cta">
    <h2 id="blog-end-cta" class="mb-2 text-section text-fg-strong">Comece pelo que você já estudou</h2>
    <p class="mb-5 text-body text-fg">
      No Baigi você revisa no dia certo, vê quanto domina de cada assunto e quanto deve lembrar no dia da prova.
      Para testar, são 6 cards prontos de {{ AREA_LABEL[area] }}, sem conta.
    </p>
    <UiButton variant="primary" :href="href" data-testid="blog-end-cta" @click="onClick">Testar com 6 cards</UiButton>
  </aside>
</template>

<script setup lang="ts">
// The last of the 3 calls of an article (RF-B7): the one lilac block of the page (ADR-027)
import type { BlogArea } from '~~/modules/blog/types'
import { AREA_LABEL, blogStartPath } from '~/utils/blog'

const props = defineProps<{ slug: string, area: BlogArea }>()
const href = computed(() => blogStartPath(props.area, props.slug, 'end'))
const { track } = useAnalytics()
function onClick() {
  track('blog_cta_clicked', { slug: props.slug, position: 'end', area: props.area })
}
</script>
