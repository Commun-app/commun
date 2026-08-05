import { mergeAttributes, Node, nodeInputRule } from '@tiptap/core'

/** Syntaxe markdown `![titre](src)` — comportement conservé de prose. */
export const fileInputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/

export interface FileNodeOptions {
  /** Téléverse un File du navigateur, renvoie { id, src, title }. */
  upload: ((file: File) => Promise<{ id: string; src: string; title: string }>) | null
  /** Résout un média par id, renvoie { src, title } (cache + concurrence bornée). */
  fetch: ((attrs: { id: string }) => Promise<{ src?: string; title?: string }>) | null
}

/**
 * Fichier joint (PDF d'arrêté municipal, document…) — portage iso du nœud
 * `file` de @poulpus/prose. Contrat JSON (1 937 nœuds en base) :
 * attrs { src, id, alt, title, uid }.
 *
 * L'attr legacy `data` (33 nœuds, objets média des buckets S3 legacy) est
 * SCIEMMENT non déclaré : le prose actuel ne le déclare plus non plus et le
 * perd à l'édition — exception documentée du harnais de conservation (D9).
 */
export const FileNode = Node.create<FileNodeOptions>({
  name: 'file',
  group: 'block',
  draggable: true,
  inline: false,

  addOptions() {
    return {
      upload: null,
      fetch: null,
      HTMLAttributes: { type: 'file' },
    } as any
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          if (element.getAttribute('type') === 'file') {
            return element.getAttribute('src')
          }
        },
      },
      id: { default: null },
      alt: { default: null },
      title: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'input', attrs: { type: 'file' } }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['input', mergeAttributes((this.options as any).HTMLAttributes, HTMLAttributes)]
  },

  addCommands() {
    return {
      setFile:
        (options: Record<string, unknown>) =>
        ({ commands }: any) =>
          commands.insertContent({ type: this.name, attrs: options }),
    } as any
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: fileInputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src, title] = match
          return { src, alt, title }
        },
      }),
    ]
  },
})
