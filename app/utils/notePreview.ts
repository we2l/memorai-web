/**
 * Preview of a note card from the API's `plain_preview`: the first 150 characters of the note's
 * plain text, title first (written by the embedding job, so null on a note just created or with
 * under 50 characters). The list no longer carries the Tiptap content (prd-performance-caderno RF-F1).
 */
export function previewLines(note: { title: string; plain_preview: string | null }, maxLines = 4): string[] {
  let text = note.plain_preview ?? ''
  // The card already shows the title
  if (note.title && text.startsWith(note.title)) text = text.slice(note.title.length)
  return text.split('\n').map(line => line.trim()).filter(Boolean).slice(0, maxLines)
}
