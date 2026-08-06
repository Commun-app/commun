import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import { OrderedList } from '@tiptap/extension-list'
import FileHandler from '@tiptap/extension-file-handler'
import { Uid } from './uid.ts'
import { Callout } from './callout.ts'
import { FileNode, type FileNodeOptions } from './file.ts'
import { ImageNode } from './image.ts'
import { Embed } from './embed.ts'
import { Details, DetailsSummary, DetailsContent } from './details.ts'
import { UploadPlaceholder } from './upload.ts'

/**
 * View-less extension assembly, importable outside the browser (conservation
 * harness, tests). Node views attach in index.ts, the only browser entry.
 */

/**
 * StarterKit options for UEditor. Marks absent from stored content are
 * disabled so saves cannot produce nodes the public themes do not render.
 * `trailingNode` appends a paragraph to documents ending on a block node —
 * a silent mutation the conservation harness forbids. `link` and
 * `orderedList` are replaced below to keep the stored attribute sets.
 */
export const communStarterKit = {
  code: false,
  codeBlock: false,
  strike: false,
  underline: false,
  trailingNode: false,
  link: false,
  orderedList: false,
}

/** Link without v3's `title` attr: declaring it would add a null key to every stored link on save. */
export const CommunLink = Link.extend({
  addAttributes() {
    const { title: _title, ...parent } = (this as any).parent?.() ?? {}
    return parent
  },
}).configure({
  openOnClick: false,
  HTMLAttributes: { class: 'underline text-primary', target: '_blank' },
})

/** OrderedList without v3's `type` attr (same rationale as CommunLink). */
export const CommunOrderedList = OrderedList.extend({
  addAttributes() {
    const { type: _type, ...parent } = (this as any).parent?.() ?? {}
    return parent
  },
})

export interface CommunEditorMedia {
  upload: FileNodeOptions['upload']
  fetch: FileNodeOptions['fetch']
}

/**
 * Drop/paste uploads through the same path as the toolbar. Not mounted
 * without an upload handler (harness, lab).
 */
function communFileHandler(upload: NonNullable<CommunEditorMedia['upload']>) {
  const insert = async (editor: any, files: File[], pos?: number) => {
    for (const file of files) {
      const { id, src, title } = await upload(file)
      const node = {
        type: file.type.startsWith('image/') ? 'image' : 'file',
        attrs: { id, src, title },
      }
      if (pos == null) editor.chain().focus().insertContent(node).run()
      else editor.chain().insertContentAt(pos, node).run()
    }
  }
  return FileHandler.configure({
    onDrop: (editor: any, files: File[], pos: number) => {
      void insert(editor, files, pos)
    },
    onPaste: (editor: any, files: File[]) => {
      void insert(editor, files)
    },
  })
}

/**
 * The parity extension set. UEditor must ALSO receive `:image="false"` and
 * `:mention="false"`: its defaults collide with our node names.
 */
export function communSchemaExtensions(media: Partial<CommunEditorMedia> = {}) {
  const handlers = { upload: media.upload ?? null, fetch: media.fetch ?? null }
  return [
    Uid,
    ...(media.upload ? [communFileHandler(media.upload)] : []),
    CommunLink,
    CommunOrderedList,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    // Priority back to 100: at v3's default (101) the mark outranks
    // bold/italic and ProseMirror reorders the marks of every stored text.
    TextStyle.extend({ priority: 100 }),
    Highlight.configure({ multicolor: true }),
    Typography,
    Callout,
    UploadPlaceholder.configure({ upload: handlers.upload } as any),
    FileNode.configure(handlers as any),
    ImageNode.configure(handlers as any),
    Embed,
    Details,
    DetailsSummary,
    DetailsContent,
  ]
}
