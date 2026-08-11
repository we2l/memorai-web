<template>
  <div class="start-card">
    <div class="start-card__header">
      <h3 class="start-card__title">Como deseja começar?</h3>
      <p class="start-card__subtitle">Escolha uma forma de criar seu material de estudo.</p>
    </div>

    <div class="start-card__actions">
      <!-- Write a note -->
      <button class="start-card__action" @click="$emit('create-note')">
        <div class="start-card__icon start-card__icon--write">
          <PenLine :size="20" />
        </div>
        <div class="start-card__content">
          <span class="start-card__action-title">Escrever uma nota</span>
          <span class="start-card__action-desc">Abra o editor e organize suas ideias.</span>
        </div>
        <ArrowRight :size="16" class="start-card__arrow" />
      </button>

      <!-- Import material -->
      <label class="start-card__action">
        <div class="start-card__icon start-card__icon--import">
          <FileUp :size="20" />
        </div>
        <div class="start-card__content">
          <span class="start-card__action-title">Importar material</span>
          <span class="start-card__action-desc">PDFs, apostilas, livros e slides. A IA organiza tudo automaticamente.</span>
        </div>
        <ArrowRight :size="16" class="start-card__arrow" />
        <input type="file" accept=".pdf" class="hidden" @change="handleFileSelect" />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PenLine, FileUp, ArrowRight } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'create-note'): void
  (e: 'select-file', file: File): void
}>()

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('select-file', file)
    input.value = ''
  }
}
</script>

<style scoped>
.start-card {
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02);
}

.start-card__header {
  margin-bottom: 20px;
}

.start-card__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-heading, var(--color-text-primary));
  line-height: 1.3;
}

.start-card__subtitle {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.start-card__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (min-width: 640px) {
  .start-card__actions {
    flex-direction: row;
    gap: 14px;
  }
}

.start-card__action {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  padding: 18px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  border-radius: 14px;
  cursor: pointer;
  transition: all 150ms ease-out;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  text-align: left;
}

.start-card__action:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--color-accent-primary) 40%, var(--border-base));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.03);
}

.start-card__action:hover .start-card__arrow {
  opacity: 1;
  transform: translateX(2px);
}

.start-card__action:hover .start-card__icon {
  transform: scale(1.05);
}

.start-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 150ms ease-out;
}

.start-card__icon--write {
  background: color-mix(in srgb, var(--color-accent-primary) 8%, transparent);
  color: var(--color-accent-soft);
}

.start-card__icon--import {
  background: color-mix(in srgb, #6F3FF5 8%, transparent);
  color: #6F3FF5;
}

:root.dark .start-card__icon--import {
  background: color-mix(in srgb, #A78BFA 10%, transparent);
  color: #A78BFA;
}

.start-card__content {
  flex: 1;
  min-width: 0;
}

.start-card__action-title {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.start-card__action-desc {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 2px;
  line-height: 1.4;
}

.start-card__arrow {
  color: var(--color-text-muted);
  opacity: 0;
  transition: all 150ms ease-out;
  flex-shrink: 0;
}
</style>
