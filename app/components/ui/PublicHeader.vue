<template>
  <header class="border-b border-line-strong bg-[var(--bg-card)]">
    <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
      <UiLogo :icon-size="24" text-class="text-body font-semibold text-action-fg" />
      <nav aria-label="Conta" class="flex items-center gap-2 text-meta">
        <NuxtLink to="/entrar" class="min-h-touch inline-flex items-center px-3 text-fg hover:text-fg-strong">Entrar</NuxtLink>
        <UiButton variant="primary" size="sm" to="/criar-conta">Criar conta grátis</UiButton>
      </nav>
    </div>
  </header>
</template>
