<template>
  <div>
    <!-- Trigger button -->
    <button
      class="fixed z-40 bg-surface-secondary border border-base rounded-full p-3 shadow-lg hover:border-accent-primary hover:scale-105 transition-all right-4 hidden sm:block"
      :class="isOpen ? '!hidden' : ''"
      style="bottom: 80px;"
      title="Anotar rapidamente (Ctrl+N)"
      @click="open"
    >
      <PenLine :size="20" class="text-accent-primary" />
    </button>

    <!-- Quick capture modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isOpen" class="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" @click.self="close">
          <div class="w-full max-w-lg mx-4 rounded-2xl bg-surface-secondary border border-base shadow-2xl overflow-hidden" style="box-shadow: 0 16px 64px rgba(0,0,0,0.5);">
            <div class="p-5">
              <div class="flex items-center justify-between mb-3">
                <p class="text-body font-medium text-base-primary">Anotação rápida</p>
                <button class="text-base-muted hover:text-base-primary p-1" @click="close">
                  <X :size="18" />
                </button>
              </div>
              <textarea
                ref="inputRef"
                v-model="content"
                class="textarea-base w-full min-h-[100px] resize-none"
                placeholder="Escreva uma ideia, conceito ou anotação..."
                @keydown.meta.enter="save"
                @keydown.ctrl.enter="save"
              />
              <div class="flex items-center justify-between mt-3">
                <select v-model="selectedTopicId" class="input-base !py-2 text-small flex-1 sm:w-48 sm:flex-none">
                  <option value="">Escolher caderno...</option>
                  <option v-for="t in rootTopics" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
                <div class="flex items-center gap-2">
                  <span class="text-micro text-base-muted">Ctrl+Enter</span>
                  <button class="btn-primary !py-2 !px-4 !min-h-[2.75rem] text-small" :disabled="!content.trim() || !selectedTopicId || saving" @click="save">
                    {{ saving ? 'Salvando...' : 'Salvar' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { PenLine, X } from 'lucide-vue-next'
import type { Topic } from '~/types'

const { $api } = useNuxtApp()
const toast = useToast()

const isOpen = ref(false)
const content = ref('')
const selectedTopicId = ref('')
const saving = ref(false)
const inputRef = ref<HTMLTextAreaElement>()
const rootTopics = ref<Topic[]>([])

async function fetchTopics() {
  try {
    const res = await $api<{ data: any[] }>('/topics')
    // API returns tree — root topics are the top level items
    rootTopics.value = (res.data ?? []).map((t: any) => ({ id: t.id, name: t.name, parent_id: t.parent_id }))
    if (rootTopics.value.length === 1) selectedTopicId.value = rootTopics.value[0].id
  } catch {}
}

function open() {
  isOpen.value = true
  if (!rootTopics.value.length) fetchTopics()
  nextTick(() => inputRef.value?.focus())
}

function close() {
  isOpen.value = false
  content.value = ''
}

async function save() {
  if (!content.value.trim() || !selectedTopicId.value) return
  saving.value = true
  try {
    const title = content.value.slice(0, 50).split('\n')[0] || 'Anotação rápida'
    const tiptapContent = {
      type: 'doc',
      content: content.value.split('\n').filter(Boolean).map(p => ({
        type: 'paragraph',
        content: [{ type: 'text', text: p }],
      })),
    }
    await $api(`/topics/${selectedTopicId.value}/notes`, {
      method: 'POST',
      body: { title, content: tiptapContent },
    })
    toast.show('Anotação salva!', 'success')
    close()
  } catch (e: any) {
    console.error('QuickCapture save error:', e)
    toast.show('Erro ao salvar anotação.', 'error')
  } finally {
    saving.value = false
  }
}

// Global shortcut Ctrl+N
if (import.meta.client) {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
      e.preventDefault()
      isOpen.value ? close() : open()
    }
  }
  onMounted(() => document.addEventListener('keydown', handler))
  onUnmounted(() => document.removeEventListener('keydown', handler))
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 150ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
