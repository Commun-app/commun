import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { Uid, UID_TYPES, assignMissingUids } from './uid.ts'
import { Callout } from './callout.ts'
import { FileNode, type FileNodeOptions } from './file.ts'
import { ImageNode } from './image.ts'
import { Embed } from './embed.ts'
import { Details, DetailsSummary, DetailsContent } from './details.ts'
import { communStarterKit, type CommunEditorMedia } from './schema.ts'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import CalloutView from './views/CalloutView.vue'
import FileView from './views/FileView.vue'
import ImageView from './views/ImageView.vue'
import EmbedView from './views/EmbedView.vue'
import DetailsView from './views/DetailsView.vue'
import DetailsSummaryView from './views/DetailsSummaryView.vue'
import DetailsContentView from './views/DetailsContentView.vue'

export { communStarterKit, Uid, UID_TYPES, assignMissingUids }
export type { CommunEditorMedia }

/**
 * Point d'entrée NAVIGATEUR de l'éditeur : le jeu d'extensions de parité
 * (schema.ts) avec les node views Vue attachées. Le harnais et les tests
 * importent `schema.ts` directement — jamais ce fichier.
 */
export function communExtensions(media: Partial<CommunEditorMedia> = {}) {
  const handlers = { upload: media.upload ?? null, fetch: media.fetch ?? null }
  return [
    Uid,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Highlight.configure({ multicolor: true }),
    Typography,
    Callout.extend({
      addNodeView: () => VueNodeViewRenderer(CalloutView),
    }),
    FileNode.extend({
      addNodeView: () => VueNodeViewRenderer(FileView),
    }).configure(handlers as any),
    ImageNode.extend({
      addNodeView: () => VueNodeViewRenderer(ImageView),
    }).configure(handlers as any),
    Embed.extend({
      addNodeView: () => VueNodeViewRenderer(EmbedView),
    }),
    Details.extend({
      addNodeView: () => VueNodeViewRenderer(DetailsView),
    }),
    DetailsSummary.extend({
      addNodeView: () => VueNodeViewRenderer(DetailsSummaryView),
    }),
    DetailsContent.extend({
      addNodeView: () => VueNodeViewRenderer(DetailsContentView),
    }),
  ]
}
