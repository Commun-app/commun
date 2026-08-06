import { VueNodeViewRenderer } from '@tiptap/vue-3'
import {
  communStarterKit,
  communSchemaExtensions,
  type CommunEditorMedia,
} from './extensions.ts'
import { sanitizeDoc } from './sanitize.ts'
import { EMBED_VIDEO, toVideoEmbedSrc } from './embed.ts'
import { UID_TYPES } from './uid.ts'
import CalloutView from './views/CalloutView.vue'
import FileView from './views/FileView.vue'
import ImageView from './views/ImageView.vue'
import EmbedView from './views/EmbedView.vue'
import DetailsView from './views/DetailsView.vue'
import DetailsSummaryView from './views/DetailsSummaryView.vue'
import DetailsContentView from './views/DetailsContentView.vue'

export { communStarterKit, UID_TYPES, sanitizeDoc, EMBED_VIDEO, toVideoEmbedSrc }
export type { CommunEditorMedia }

const VIEWS: Record<string, any> = {
  callout: CalloutView,
  file: FileView,
  image: ImageView,
  embed: EmbedView,
  details: DetailsView,
  detailsSummary: DetailsSummaryView,
  detailsContent: DetailsContentView,
}

/**
 * Browser entry: the parity extension set with Vue node views attached.
 * Harness and tests import extensions.ts directly (no DOM needed).
 */
export function communExtensions(media: Partial<CommunEditorMedia> = {}) {
  return communSchemaExtensions(media).map((extension: any) => {
    const view = VIEWS[extension.name]
    return view
      ? extension.extend({ addNodeView: () => VueNodeViewRenderer(view) })
      : extension
  })
}
