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

/**
 * Assemblage SANS VUES du schéma de l'éditeur — importable hors navigateur
 * (harnais de conservation D9, tests, CI). Les node views s'attachent dans
 * `index.ts`, seul point d'entrée du code navigateur.
 */

/**
 * Configuration StarterKit pour l'UEditor (:starter-kit) — parité stricte
 * avec l'assemblage de @poulpus/prose (refonte-admin-ui, tâche 2.2) :
 *
 * - `strike`, `underline`, `code`, `codeBlock` : DÉSACTIVÉS — prose ne les
 *   offrait pas, aucune marque en base, et les thèmes publics ne sauraient
 *   pas les rendre avant la phase 5.
 * - `trailingNode` : DÉSACTIVÉ — il AJOUTE un paragraphe vide en fin de
 *   document quand il se termine par un bloc non textuel (un `file` : le cas
 *   grigny) — une mutation à l'ouverture que le harnais D9 interdit.
 * - `link` et `orderedList` : DÉSACTIVÉS ici et REMPLACÉS par nos variantes
 *   (corpus du 05/08, 1 109 documents) — Link v3 déclare un attr `title` et
 *   OrderedList v3 un attr `type` que la v2 n'avait pas : chaque
 *   ré-enregistrement aurait ajouté ces clés à `null` sur des centaines de
 *   marques et listes.
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

/**
 * Link iso v2 : les 4 attrs du legacy (href, target, rel, class — l'attr
 * `title` de la v3 est retiré), défauts identiques à l'assemblage prose
 * (merge profond de configure : rel garde son défaut `noopener noreferrer
 * nofollow`, vérifié sur les marques en base).
 */
export const CommunLink = Link.extend({
  addAttributes() {
    const { title: _title, ...parent } = (this as any).parent?.() ?? {}
    return parent
  },
}).configure({
  openOnClick: false,
  HTMLAttributes: { class: 'underline text-primary', target: '_blank' },
})

/** OrderedList iso v2 : attrs { start } seul — l'attr `type` v3 est retiré. */
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
 * Répare un document ProseMirror invalide hérité de la migration : 31
 * documents (grigny) contiennent des nœuds `{"type":"text"}` SANS champ
 * `text` — rejetés par ProseMirror v2 comme v3 (documents inéditables dans
 * l'admin actuel aussi), rendus comme du vide par les thèmes. Les écarter ne
 * change donc RIEN au rendu. Renvoie le document intact (même référence) si
 * rien à réparer. Une réparation en base une fois pour toutes est proposée à
 * part — ceci est le filet à l'ouverture.
 */
export function sanitizeDoc<T extends { type?: string; content?: any[] }>(doc: T): T {
  let repaired = false
  const clean = (node: any): any | null => {
    if (!node || typeof node !== 'object') return node
    if (node.type === 'text' && !node.text) {
      repaired = true
      return null
    }
    if (Array.isArray(node.content)) {
      const content = node.content.map(clean).filter(Boolean)
      if (content.length !== node.content.length) return { ...node, content }
      // Réutilise les fils nettoyés (certains ont pu changer en profondeur).
      return content.some((c: any, i: number) => c !== node.content[i])
        ? { ...node, content }
        : node
    }
    return node
  }
  const out = clean(doc)
  if (repaired && typeof console !== 'undefined') {
    console.warn('[editor] document réparé : nœud(s) texte vide(s) écarté(s) (reliquat de migration)')
  }
  return out
}

/**
 * Le seul service d'intégration réellement utilisé (47/48 embeds en base) :
 * la vidéo YouTube, stockée `service: "video"`. Les presets iso prose.
 */
export const EMBED_VIDEO = {
  service: 'video',
  icon: 'iconoir:youtube',
  placeholder: "Collez l'url https://www.youtube.com/watch…",
  title: 'YouTube video player',
  height: 315,
} as const

/** `https://www.youtube.com/watch?v=ID` → URL d'embed. Sinon, l'URL telle quelle. */
export function toVideoEmbedSrc(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : url
}

/**
 * Le jeu d'extensions de parité avec @poulpus/prose, SANS node views.
 * L'UEditor doit AUSSI recevoir `:image="false"` et `:mention="false"` :
 * ses nœuds par défaut portent les mêmes noms que les nôtres (`image`) ou
 * n'existent pas dans nos données (`mention`).
 */
/**
 * Glisser-déposer et collage de fichiers (D4) — l'extension FileHandler
 * OFFICIELLE (ex-Pro, MIT avec TipTap 3), branchée sur le MÊME chemin
 * d'upload que la barre d'outils : téléversement puis insertion d'un nœud
 * `image` ou `file` selon le mime. Sans handler d'upload (laboratoire,
 * harnais), l'extension n'est pas montée.
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

export function communSchemaExtensions(media: Partial<CommunEditorMedia> = {}) {
  const handlers = { upload: media.upload ?? null, fetch: media.fetch ?? null }
  return [
    Uid,
    ...(media.upload ? [communFileHandler(media.upload)] : []),
    CommunLink,
    CommunOrderedList,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    // 2 721 marques textStyle en base, TOUTES sans attrs (le Color de prose
    // était commenté) : TextStyle nu, pas de TextStyleKit. Priorité ramenée
    // à 100 (la v3 met 101) : sinon la marque prend rang AVANT bold/italic
    // et ProseMirror réordonne les marks de tout le contenu existant.
    TextStyle.extend({ priority: 100 }),
    Highlight.configure({ multicolor: true }),
    Typography,
    Callout,
    FileNode.configure(handlers as any),
    ImageNode.configure(handlers as any),
    Embed,
    Details,
    DetailsSummary,
    DetailsContent,
  ]
}
