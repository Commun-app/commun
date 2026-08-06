import UniqueID from '@tiptap/extension-unique-id'

/**
 * Stable block ids matching stored content: attribute `uid`, UUID v4.
 * Existing ids are never regenerated; missing ones are filled on open.
 * The type list is CLOSED — adding a type would rewrite every document on
 * save, since none of the other nodes carry a uid.
 */
export const UID_TYPES = [
  'paragraph',
  'heading',
  'listItem',
  'bulletList',
  'orderedList',
  'blockquote',
  'callout',
  'file',
  'image',
] as const

export const Uid = UniqueID.configure({
  attributeName: 'uid',
  types: [...UID_TYPES],
})
