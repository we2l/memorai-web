<template>
  <aside class="flex flex-col gap-5 rounded-hero bg-tinted p-6 sm:flex-row sm:items-center sm:p-8 blog-end-cta" aria-labelledby="blog-end-cta">
    <UiBaigiMascot :size="112" state="celebrating" class="shrink-0 self-center" />
    <div>
      <h2 id="blog-end-cta" class="mb-2 text-section text-fg-strong">Comece pelo que você já estudou</h2>
      <p class="mb-5 text-body text-fg">
        No Baigi você revisa no dia certo, vê quanto domina de cada assunto e quanto deve lembrar no dia da prova.
        Para testar, são 6 cards prontos de {{ AREA_LABEL[area] }}, sem conta.
      </p>
      <UiButton variant="primary" :href="href" data-testid="blog-end-cta" @click="onClick">Testar com 6 cards</UiButton>
    </div>
  </aside>
</template>

<script setup lang="ts">
// The last of the 3 calls of an article (RF-B7): the one lilac block and the one purple of the page (ADR-027), with the
// dolphin (prd-blog-v2 RF-V3: the mascot only here and in the byline)
import type { BlogArea } from '~~/modules/blog/types'
import { AREA_LABEL, blogStartPath } from '~/utils/blog'

const props = defineProps<{ slug: string, area: BlogArea }>()
const href = computed(() => blogStartPath(props.area, props.slug, 'end'))
const { track } = useAnalytics()
function onClick() {
  track('blog_cta_clicked', { slug: props.slug, position: 'end', area: props.area })
}
</script>
