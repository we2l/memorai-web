<template>
  <div>
    <details class="rounded-card bg-soft px-5 lg:hidden" data-testid="blog-toc-collapsible">
      <summary class="flex min-h-touch cursor-pointer items-center justify-between gap-3 text-meta font-semibold text-fg-strong">
        Neste artigo <span class="font-normal text-fg-muted">{{ items.length }} seções</span>
      </summary>
      <ol class="flex list-decimal flex-col gap-1 pb-4 pl-5 text-meta text-fg">
        <li v-for="s in items" :key="s.id"><UiLink :href="`#${s.id}`" variant="muted" class="inline-flex min-h-6 items-center">{{ s.title }}</UiLink></li>
      </ol>
    </details>
    <nav aria-label="Neste artigo" class="hidden lg:block" data-testid="blog-toc">
      <p class="mb-3 text-label font-semibold text-fg-strong">Neste artigo</p>
      <ol class="flex flex-col border-l border-line-strong text-meta">
        <li v-for="s in items" :key="s.id">
          <a
            :href="`#${s.id}`"
            class="-ml-px flex min-h-6 border-l-2 py-1.5 pl-4 hover:text-fg-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            :class="active === s.id ? 'border-fg-strong font-semibold text-fg-strong' : 'border-transparent text-fg-muted'"
            :aria-current="active === s.id ? 'location' : undefined"
          >{{ s.title }}</a>
        </li>
      </ol>
    </nav>
  </div>
</template>

<script setup lang="ts">
// Table of contents of an article (prd-blog-v2 RF-L3): a collapsible box before the text below 1024 px, a sticky column
// from 1024 px (the page places it). The section being read is marked (aria-current) by an IntersectionObserver on the
// ## headings, no scroll listener: the last heading that crossed the top third of the screen wins.
const props = defineProps<{ items: { id: string, title: string }[] }>()

const active = ref<string | null>(props.items[0]?.id ?? null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  const headings = props.items.map(s => document.getElementById(s.id)).filter((h): h is HTMLElement => !!h)
  if (!headings.length || typeof IntersectionObserver === 'undefined') return
  // The root runs from far above the page down to the top third of the screen: a heading "intersects" once it has
  // crossed that line, so even a jump (a click in the contents, Home/End) changes its state and fires
  const above = new Set<string>()
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) above.add(e.target.id)
      else above.delete(e.target.id)
    }
    const reached = props.items.filter(s => above.has(s.id))
    active.value = reached.length ? reached[reached.length - 1]!.id : props.items[0]!.id
  }, { rootMargin: '100000px 0px -66% 0px' })
  for (const h of headings) observer.observe(h)
})

onBeforeUnmount(() => observer?.disconnect())
</script>
