import type { Note } from '~/types'

export type NoteBadge = {
  label: string
  color: 'green' | 'gray' | 'amber' | 'purple'
}

/**
 * Determines the status badge for a note based on its card coverage.
 */
export function useNoteBadge(note: Note): NoteBadge | null {
  const wordCount = note.plain_preview ? Math.ceil((note.plain_preview.length / 150) * estimateWords(note)) : 0

  if (note.flashcards_count > 0) {
    // Has cards — check if outdated
    if (note.cards_generated_at && note.updated_at > note.cards_generated_at && wordCount >= 200) {
      return { label: 'Atualizar', color: 'amber' }
    }
    return { label: `${note.flashcards_count} card${note.flashcards_count !== 1 ? 's' : ''}`, color: 'green' }
  }

  // No cards
  if (wordCount >= 200) {
    return { label: 'IA disponível', color: 'purple' }
  }

  if (wordCount >= 50) {
    return { label: 'Sem cards', color: 'gray' }
  }

  return null
}

function estimateWords(note: Note): number {
  // plain_preview is max 150 chars. Estimate total word count from content.
  // Average: ~5 chars per word in Portuguese
  if (note.plain_preview) {
    // If preview is exactly 150 chars, note is likely longer
    const previewWords = note.plain_preview.split(/\s+/).length
    if (note.plain_preview.length >= 148) {
      // Estimate based on typical note length (preview is truncated)
      return previewWords * 3 // rough heuristic
    }
    return previewWords
  }
  return 0
}
