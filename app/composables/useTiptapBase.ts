import type { Extensions } from '@tiptap/core'
import StarterKit, { type StarterKitOptions } from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder, { type PlaceholderOptions } from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link, { type LinkOptions } from '@tiptap/extension-link'

export interface TiptapBaseOptions {
  starterKit?: Partial<StarterKitOptions>
  placeholder: PlaceholderOptions['placeholder']
  /** Block images (no base64) — default true */
  image?: boolean
  /** Link extension config; omitted = no Link */
  link?: Partial<LinkOptions>
}

/**
 * Extensions shared by NoteEditor and RichInput (StarterKit, Underline, Placeholder,
 * Image, Link). Each editor appends its own extensions (cloze, callout, subpages...).
 */
export function useTiptapBase(opts: TiptapBaseOptions): Extensions {
  return [
    StarterKit.configure(opts.starterKit ?? {}),
    Underline,
    ...((opts.image ?? true) ? [Image.configure({ inline: false, allowBase64: false })] : []),
    ...(opts.link ? [Link.configure(opts.link)] : []),
    Placeholder.configure({ placeholder: opts.placeholder }),
  ]
}
