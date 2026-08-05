import { Node } from '@tiptap/core'

/**
 * Accordéon — réimplémentation SANS TipTap Pro du trio
 * details/detailsSummary/detailsContent (D3). C'était la dernière dépendance
 * Pro structurelle : 523 accordéons en base, grigny seul, dont 246 IMBRIQUÉS
 * et 1 587 nœuds `file` à l'intérieur (les arrêtés municipaux).
 *
 * Contrat JSON vérifié sur les données :
 * - details       : attrs { toggle } (booléen, défaut true) — l'attr `open`
 *                   du Pro n'existe pas dans nos données, prose l'écrasait
 * - detailsSummary: contenu `text*`, aucun attr
 * - detailsContent: contenu `block+` (paragraphes, listes, files, images,
 *                   embeds, callouts… et details imbriqués), aucun attr
 */
export const Details = Node.create({
  name: 'details',
  group: 'block',
  content: 'detailsSummary detailsContent',
  draggable: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      toggle: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'details' }]
  },

  renderHTML() {
    return ['details', { open: '' }, 0]
  },

  addCommands() {
    return {
      setDetails:
        () =>
        ({ commands, state }: any) => {
          const { schema } = state
          return commands.insertContent({
            type: this.name,
            content: [
              { type: 'detailsSummary' },
              { type: 'detailsContent', content: [{ type: 'paragraph' }] },
            ],
          })
        },
    } as any
  },
})

export const DetailsSummary = Node.create({
  name: 'detailsSummary',
  content: 'text*',
  defining: true,
  selectable: false,
  isolating: true,

  parseHTML() {
    return [{ tag: 'summary' }]
  },

  renderHTML() {
    return ['summary', 0]
  },
})

export const DetailsContent = Node.create({
  name: 'detailsContent',
  content: 'block+',
  defining: true,
  selectable: false,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="detailsContent"]' }]
  },

  renderHTML() {
    return ['div', { 'data-type': 'detailsContent' }, 0]
  },
})
