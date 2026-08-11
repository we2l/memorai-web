<template>
  <div class="py-8 px-4 flex flex-col items-center">
    <img src="~/assets/mascot-baigi-thinking.png" alt="Baigi pensando" class="w-24 h-24 object-contain mb-4" />
    <h3 class="text-headline text-base-primary mb-2">Como você quer começar?</h3>
    <p class="text-small text-base-muted mb-6 text-center max-w-xs">Escolha uma forma de adicionar material — a IA cuida do resto.</p>

    <div class="w-full max-w-sm space-y-2">
      <button
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
          <p class="text-micro text-base-muted">Traga seus decks existentes</p>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'paste'): void
  (e: 'upload-pdf'): void
  (e: 'import-anki'): void
}>()
</script>
