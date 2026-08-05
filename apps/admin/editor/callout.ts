import { Node } from '@tiptap/core'

/**
 * Encart d'information — portage iso du nœud `callout` de @poulpus/prose.
 * Contrat JSON (314 nœuds en base) : attrs { icon, uid }, contenu `text*`
 * (du texte directement, PAS de paragraphes — vérifié sur les 4 bases :
 * 426 enfants, tous `text`).
 */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'text*',
  draggable: true,
  selectable: true,
  inline: false,
  defining: false,

  addAttributes() {
    return {
      icon: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-icon'),
        renderHTML: (attributes) => ({ 'data-icon': attributes.icon }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'aside' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['aside', HTMLAttributes, 0]
  },

  addCommands() {
    return {
      setCallout:
        (options: { icon?: string | null } = {}) =>
        ({ commands }: any) =>
          commands.setNode(this.name, options),
    } as any
  },
})
