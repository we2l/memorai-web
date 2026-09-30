<template>
  <div class="py-8 px-4 flex flex-col items-center">
    <picture class="contents"><source srcset="~/assets/mascots/mascot-baigi-thinking.avif" type="image/avif"><img src="~/assets/mascots/mascot-baigi-thinking.webp" alt="Baigi pensando" class="w-24 h-24 object-contain mb-4" width="96" height="96" loading="lazy" decoding="async" /></picture>
    <h3 class="text-headline text-base-primary mb-2">{{ mode === 'no-notebooks' ? 'Crie seu primeiro caderno' : 'Como você quer começar?' }}</h3>
    <p class="text-small text-base-muted mb-6 text-center max-w-xs">
      {{ mode === 'no-notebooks' ? 'Um caderno para cada assunto que você estuda. Comece do zero, por um PDF ou pelo Anki.' : 'Escolha uma forma de adicionar material — a IA cuida do resto.' }}
    </p>

    <div class="w-full max-w-sm space-y-2">
      <button
        v-if="mode === 'no-notebooks'"
        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--bg-card)] border border-base shadow-sm hover:border-[var(--color-accent-primary)]/30 hover:shadow-md transition-all text-left"
        @click="$emit('create')"
      >
        <span class="text-xl" aria-hidden="true">📒</span>
        <div>
          <p class="text-body font-medium text-base-primary">Novo caderno</p>
          <p class="text-micro text-base-muted">Crie e escreva suas notas</p>
        </div>
      </button>
      <button
        v-else
        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--bg-card)] border border-base shadow-sm hover:border-[var(--color-accent-primary)]/30 hover:shadow-md transition-all text-left"
        @click="$emit('paste')"
      >
        <span class="text-xl">📄</span>
        <div>
          <p class="text-body font-medium text-base-primary">Colar resumo</p>
          <p class="text-micro text-base-muted">Cole texto de aula, livro ou anotação</p>
        </div>
      </button>

      <button
        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--bg-card)] border border-base shadow-sm hover:border-[var(--color-accent-primary)]/30 hover:shadow-md transition-all text-left"
        @click="$emit('upload-pdf')"
      >
        <span class="text-xl">📚</span>
        <div>
          <p class="text-body font-medium text-base-primary">Enviar PDF</p>
          <p class="text-micro text-base-muted">A IA gera resumo e flashcards pra você</p>
        </div>
      </button>

      <button
        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--bg-card)] border border-base shadow-sm hover:border-[var(--color-accent-primary)]/30 hover:shadow-md transition-all text-left"
        @click="$emit('import-anki')"
      >
        <span class="text-xl">📥</span>
        <div>
          <p class="text-body font-medium text-base-primary">Importar Anki</p>
          <p class="text-micro text-base-muted">Traga seus baralhos do Anki</p>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ mode?: 'no-notebooks' | 'empty-notebook' }>(), { mode: 'empty-notebook' })

defineEmits<{
  (e: 'create'): void
  (e: 'paste'): void
  (e: 'upload-pdf'): void
  (e: 'import-anki'): void
}>()
</script>
