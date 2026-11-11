import type { Extensions } from '@tiptap/core'
import StarterKit, { type StarterKitOptions } from '@tiptap/starter-kit'
import Placeholder, { type PlaceholderOptions } from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import type { LinkOptions } from '@tiptap/extension-link'

export interface TiptapBaseOptions {
  starterKit?: Partial<StarterKitOptions>
  placeholder: PlaceholderOptions['placeholder']
  /** Block images (no base64) — default true */
  image?: boolean
  /** Link config; omitted = the StarterKit's Link with its defaults (as before Tiptap 3 brought it in) */
  link?: Partial<LinkOptions>
}

/**
 * Extensions shared by NoteEditor and RichInput (StarterKit, Placeholder, Image). Each editor appends its own
 * extensions (cloze, callout, subpages...). Tiptap 3's StarterKit already has Link and Underline: they are configured
 * through it, never added again (two of each warned "Duplicate extension names" and ran both Link click handlers,
 * QA 2026-11 M7).
 */
export function useTiptapBase(opts: TiptapBaseOptions): Extensions {
  return [
    StarterKit.configure({ ...(opts.starterKit ?? {}), ...(opts.link ? { link: opts.link } : {}) }),
    ...((opts.image ?? true) ? [Image.configure({ inline: false, allowBase64: false })] : []),
    Placeholder.configure({ placeholder: opts.placeholder }),
  ]
}
