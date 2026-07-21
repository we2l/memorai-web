<script setup lang="ts">
definePageMeta({
  middleware: ['dev-only'],
  layout: false,
})

const buttons = ['primary', 'secondary', 'ghost', 'danger'] as const
const sizes = ['sm', 'md', 'lg'] as const
</script>

<template>
  <div class="min-h-screen bg-baigi-gradient p-8">
    <div class="mx-auto max-w-4xl space-y-12">
      <!-- Header -->
      <header>
        <h1 class="text-display text-base-primary">BAIGI Design System</h1>
        <p class="text-body text-base-primary/60 mt-2">Living styleguide — dev only</p>
      </header>

      <!-- Colors -->
      <section>
        <h2 class="text-headline text-base-primary mb-4">Cores</h2>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div class="space-y-2">
            <div class="h-16 rounded-xl bg-baigi-bg border border-white/10" />
            <p class="text-micro text-base-primary/60">bg #2B0057</p>
          </div>
          <div class="space-y-2">
            <div class="h-16 rounded-xl bg-baigi-bg-secondary" />
            <p class="text-micro text-base-primary/60">secondary #4B007D</p>
          </div>
          <div class="space-y-2">
            <div class="h-16 rounded-xl bg-primary-500" />
            <p class="text-micro text-base-primary/60">primary #F4C84A</p>
          </div>
          <div class="space-y-2">
            <div class="h-16 rounded-xl bg-baigi-glow" />
            <p class="text-micro text-base-primary/60">glow #B96A3D</p>
          </div>
          <div class="space-y-2">
            <div class="h-16 rounded-xl bg-baigi-dark-glow" />
            <p class="text-micro text-base-primary/60">dark-glow #5E2D46</p>
          </div>
        </div>
      </section>

      <!-- Typography -->
      <section>
        <h2 class="text-headline text-base-primary mb-4">Tipografia</h2>
        <div class="space-y-3">
          <p class="text-display text-base-primary">Display — Plus Jakarta Sans 800</p>
          <p class="text-headline text-base-primary">Headline — Plus Jakarta Sans 700</p>
          <p class="text-title text-base-primary">Title — Inter 600</p>
          <p class="text-body text-base-primary">Body — Inter 400</p>
          <p class="text-small text-base-primary-muted">Small — Inter 400</p>
          <p class="text-micro text-base-primary-muted">Micro — Inter 400</p>
          <p class="text-label">LABEL — INTER 600 UPPERCASE</p>
        </div>
      </section>

      <!-- Buttons -->
      <section>
        <h2 class="text-headline text-base-primary mb-4">Botões</h2>
        <div class="space-y-6">
          <div v-for="intent in buttons" :key="intent">
            <p class="text-label mb-2">{{ intent }}</p>
            <div class="flex items-center gap-3">
              <button v-for="size in sizes" :key="size" :class="useButton(intent, size)">
                {{ intent }} {{ size }}
              </button>
              <button :class="useButton(intent, 'md')" disabled>
                disabled
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Cards -->
      <section>
        <h2 class="text-headline text-base-primary mb-4">Cards</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="card">
            <p class="text-title text-base-primary">Card padrão</p>
            <p class="text-small text-base-primary-muted mt-1">Superfície secundária com borda sutil</p>
          </div>
          <div class="card-interactive">
            <p class="text-title text-base-primary">Card interativo</p>
            <p class="text-small text-base-primary-muted mt-1">Hover com glow roxo</p>
          </div>
          <div class="card-glow">
            <p class="text-title text-base-primary">Card glow</p>
            <p class="text-small text-base-primary-muted mt-1">Borda accent com sombra</p>
          </div>
        </div>
      </section>

      <!-- Inputs -->
      <section>
        <h2 class="text-headline text-base-primary mb-4">Inputs</h2>
        <div class="max-w-md space-y-4">
          <input class="input-base" placeholder="Input padrão..." />
          <textarea class="textarea-base" rows="3" placeholder="Textarea..." />
        </div>
      </section>

      <!-- Badges -->
      <section>
        <h2 class="text-headline text-base-primary mb-4">Badges</h2>
        <div class="flex flex-wrap gap-2">
          <span class="badge badge-primary">Primary</span>
          <span class="badge badge-accent">Accent</span>
          <span class="badge badge-success">Success</span>
          <span class="badge badge-danger">Danger</span>
          <span class="badge badge-warning">Warning</span>
          <span class="badge badge-muted">Muted</span>
        </div>
      </section>

      <!-- Review Buttons -->
      <section>
        <h2 class="text-headline text-base-primary mb-4">Botões de Revisão</h2>
        <div class="grid grid-cols-4 gap-3 max-w-lg">
          <button class="btn-again">
            <span class="text-micro">Não lembrei</span>
          </button>
          <button class="btn-hard">
            <span class="text-micro">Difícil</span>
          </button>
          <button class="btn-good">
            <span class="text-micro">Bom</span>
          </button>
          <button class="btn-easy">
            <span class="text-micro">Fácil</span>
          </button>
        </div>
      </section>

      <!-- Glow Effects -->
      <section>
        <h2 class="text-headline text-base-primary mb-4">Efeitos</h2>
        <div class="flex gap-4">
          <div class="h-16 w-16 rounded-full bg-primary-500 glow-primary" />
          <div class="h-16 w-16 rounded-full bg-baigi-accent glow-accent" />
          <div class="h-4 w-32 rounded-full skeleton mt-6" />
        </div>
      </section>
    </div>
  </div>
</template>
