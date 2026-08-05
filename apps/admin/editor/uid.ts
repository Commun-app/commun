import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * Identifiants de bloc stables — réimplémentation maison de
 * @tiptap-pro/extension-unique-id (refonte-admin-ui, D2).
 *
 * Trois invariants, dans cet ordre :
 * 1. l'attribut s'appelle `uid` ;
 * 2. le format est l'UUID v4 minuscule (relevé du 05/08 : 16 450 uid en base,
 *    100 % v4) — `crypto.randomUUID()` ;
 * 3. un `uid` existant n'est JAMAIS régénéré : ouvrir puis enregistrer un
 *    document ancien ne change pas un seul id (harnais de conservation D9).
 *
 * Périmètre : la liste FERMÉE des 9 types relevés dans les données. Ni
 * `embed`, ni `details*`, ni `hardBreak`/`horizontalRule` n'en portent —
 * en ajouter ailleurs ferait diverger le ré-enregistrement de l'original.
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

const uidPluginKey = new PluginKey('commun-uid')

/**
 * Attribue un uid aux nœuds ciblés qui n'en ont pas ; dédoublonne le
 * copier-coller (premier arrivé garde le sien). Renvoie null si le document
 * n'appelle aucun changement — cas nominal d'un document existant complet.
 * Exportée pure : le harnais D9 et les tests l'exercent sans DOM.
 */
export function assignMissingUids(state: {
  doc: any
  tr: any
}): any | null {
  const types = new Set<string>(UID_TYPES)
  const seen = new Set<string>()
  let tr = null as any
  state.doc.descendants((node: any, pos: number) => {
    if (!types.has(node.type.name)) return
    const current = node.attrs.uid
    if (typeof current === 'string' && current && !seen.has(current)) {
      seen.add(current)
      return
    }
    tr = tr ?? state.tr
    const uid = crypto.randomUUID()
    seen.add(uid)
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, uid })
  })
  return tr
}

export const Uid = Extension.create({
  name: 'uid',

  addGlobalAttributes() {
    return [
      {
        types: [...UID_TYPES],
        attributes: {
          uid: {
            default: null,
            // À la coupure d'un bloc (Entrée), le nouveau nœud repart sans
            // uid — le plugin lui en attribue un neuf. L'original garde le sien.
            keepOnSplit: false,
            parseHTML: (element) => element.getAttribute('data-uid'),
            renderHTML: (attributes) =>
              attributes.uid ? { 'data-uid': attributes.uid } : {},
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: uidPluginKey,
        // Un document existant dont tous les blocs portent un uid unique ne
        // produit AUCUNE transaction ici — c'est l'invariant 3. Et AUCUN
        // remplissage à l'ouverture (contrairement au unique-id Pro) : un
        // bloc sans uid n'en gagne un qu'à la première édition, sinon un
        // simple ouvrir/enregistrer muterait le document (harnais D9).
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null
          return assignMissingUids(newState)
        },
      }),
    ]
  },
})
