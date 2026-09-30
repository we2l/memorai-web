<template>
  <div class="min-h-screen bg-surface text-base-secondary">
    <header class="border-b border-base bg-[var(--bg-card)]">
      <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <UiLogo :icon-size="24" text-class="text-lg font-semibold text-accent-primary" />
        <nav aria-label="Documentos legais" class="flex gap-4 text-small">
          <NuxtLink to="/termos" class="min-h-[44px] inline-flex items-center hover:text-base-primary" active-class="text-base-primary font-medium">Termos</NuxtLink>
          <NuxtLink to="/privacidade" class="min-h-[44px] inline-flex items-center hover:text-base-primary" active-class="text-base-primary font-medium">Privacidade</NuxtLink>
        </nav>
      </div>
    </header>

    <div class="max-w-5xl mx-auto px-4 py-8 lg:py-12 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
      <!-- Index: collapsible on mobile, sticky on desktop -->
      <aside class="mb-8 lg:mb-0">
        <details class="lg:hidden card p-4" >
          <summary class="cursor-pointer font-medium text-base-primary min-h-[44px] flex items-center">Índice</summary>
          <ol class="mt-2 space-y-1 text-small list-decimal pl-5">
            <li v-for="s in sections" :key="s.id"><a :href="`#${s.id}`" class="hover:text-base-primary underline-offset-2 hover:underline">{{ s.title }}</a></li>
          </ol>
        </details>
        <nav aria-label="Índice" class="hidden lg:block sticky top-6">
          <p class="text-label mb-3 text-base-muted">Índice</p>
          <ol class="space-y-2 text-small list-decimal pl-5">
            <li v-for="s in sections" :key="s.id"><a :href="`#${s.id}`" class="hover:text-base-primary underline-offset-2 hover:underline">{{ s.title }}</a></li>
          </ol>
        </nav>
      </aside>

      <main id="topo" class="legal-prose">
        <h1 class="text-display text-base-primary mb-2">{{ title }}</h1>
        <p class="text-small text-base-muted mb-8">Vigência a partir de {{ effectiveDate }} · Última atualização: {{ updatedAt }}</p>
        <slot />
        <p class="mt-12">
          <a href="#topo" class="text-small text-accent-primary underline underline-offset-2">Voltar ao topo</a>
        </p>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  effectiveDate: string
  updatedAt: string
  sections: { id: string; title: string }[]
}>()
</script>

<style scoped>
.legal-prose {
  max-width: 68ch;
  font-size: 1rem;
  line-height: 1.7;
}
.legal-prose :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-heading);
  margin: 2.5rem 0 0.75rem;
  scroll-margin-top: 1.5rem;
}
.legal-prose :deep(h3) {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-heading);
  margin: 1.5rem 0 0.5rem;
}
.legal-prose :deep(p),
.legal-prose :deep(ul) {
  margin-bottom: 1rem;
}
.legal-prose :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}
.legal-prose :deep(li) {
  margin-bottom: 0.35rem;
}
.legal-prose :deep(a) {
  color: var(--badge-primary-text);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.legal-prose :deep(.placeholder) {
  background: var(--badge-warning-bg);
  color: var(--badge-warning-text);
  padding: 0 0.25rem;
  border-radius: 0.25rem;
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
}
</style>
