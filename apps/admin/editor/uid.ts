import UniqueID from '@tiptap/extension-unique-id'

/**
 * Identifiants de bloc stables — l'extension UniqueID OFFICIELLE, passée MIT
 * avec TipTap 3 (c'était la dépendance TipTap Pro la plus critique de
 * @poulpus/prose : l'attr `uid` vit sur presque tous les nœuds des 4 bases).
 *
 * Invariants (D2) :
 * 1. l'attribut s'appelle `uid` (option `attributeName`, iso prose) ;
 * 2. le format est l'UUID v4 (générateur par défaut — relevé du 05/08 :
 *    16 450 uid en base, 100 % v4) ;
 * 3. un `uid` existant n'est JAMAIS régénéré — garanti par l'extension
 *    (elle ne touche que les nœuds à id null et dédoublonne le collage).
 *
 * Comportement assumé, ISO PROSE (D11) : les nœuds SANS uid (209 reliquats
 * de migration) en reçoivent un à l'OUVERTURE du document (`onCreate`) —
 * c'est ce que fait l'admin actuel. Le harnais D9 documente cette famille
 * (« +uid sur nœud qui n'en avait pas ») comme normalisation attendue.
 * (L'option `updateDocument: false` couperait AUSSI le remplissage à
 * l'édition — inutilisable.)
 *
 * Périmètre : la liste FERMÉE des 9 types relevés code + données. Ni
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

export const Uid = UniqueID.configure({
  attributeName: 'uid',
  types: [...UID_TYPES],
})
