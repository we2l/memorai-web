<template>
  <aside class="rounded-card bg-soft p-5 sm:p-6" :aria-label="label" data-testid="blog-cover">
    <p v-if="cover" class="flex items-end gap-3">
      <UiNumber :value="cover.value" size="l" class="shrink-0" />
      <span class="max-w-40 pb-1 text-meta font-semibold text-fg-muted">{{ cover.label }}</span>
    </p>
    <ul v-if="facts.length" class="flex flex-col gap-4" :class="cover && 'mt-5 border-t border-line-strong pt-5'">
      <li v-for="f in facts" :key="f.value" class="flex items-start gap-3">
        <UiIconTile :icon="ICONS[f.icon].icon" :tone="ICONS[f.icon].tone" size="sm" />
        <p class="min-w-0 pt-1 text-meta text-fg-muted"><strong class="font-semibold text-fg-strong">{{ f.value }}</strong> {{ f.label }}</p>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
// The "cover" of an article (prd-blog-v2 RF-V2): the big number in Fraunces and up to 3 facts, all written in the text
// (the build checks it). Right of the header on the desktop, after the short answer on the phone. Gray surface: the
// only color is the small icon tile of each fact.
import { BarChart3, CalendarDays, ListChecks, Target } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { IconTileTone } from '~/components/ui/IconTile.vue'
import type { BlogCover, BlogFact, BlogFactIcon } from '~~/modules/blog/types'

withDefaults(defineProps<{ cover: BlogCover | null, facts?: BlogFact[], label?: string }>(), { facts: () => [], label: 'O artigo em números' })

const ICONS: Record<BlogFactIcon, { icon: Component, tone: IconTileTone }> = {
  calendar: { icon: CalendarDays, tone: 'accuracy' },
  questions: { icon: ListChecks, tone: 'goal' },
  target: { icon: Target, tone: 'quiz' },
  chart: { icon: BarChart3, tone: 'accuracy' },
}
</script>
