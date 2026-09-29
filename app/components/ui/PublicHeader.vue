<template>
  <header class="border-b border-base bg-[var(--bg-card)]">
    <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
      <UiLogo :icon-size="24" text-class="text-lg font-semibold text-accent-primary" />
      <nav aria-label="Conta" class="flex items-center gap-2 text-small">
        <NuxtLink to="/entrar" class="min-h-[44px] inline-flex items-center px-3 text-base-secondary hover:text-base-primary">Entrar</NuxtLink>
        <NuxtLink to="/criar-conta" class="btn-primary !min-h-[40px] !py-2 !px-4">Criar conta grátis</NuxtLink>
      </nav>
    </div>
  </header>
</template>
