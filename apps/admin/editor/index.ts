import { VueNodeViewRenderer } from '@tiptap/vue-3'
import {
  communStarterKit,
  communSchemaExtensions,
  sanitizeDoc,
  EMBED_SERVICES,
  UID_TYPES,
  type CommunEditorMedia,
} from '@commun/editor'
import CalloutView from './views/CalloutView.vue'
import FileView from './views/FileView.vue'
import ImageView from './views/ImageView.vue'
import EmbedView from './views/EmbedView.vue'
import DetailsView from './views/DetailsView.vue'
import DetailsSummaryView from './views/DetailsSummaryView.vue'
import DetailsContentView from './views/DetailsContentView.vue'
import UploadView from './views/UploadView.vue'

export { communStarterKit, UID_TYPES, sanitizeDoc, EMBED_SERVICES }
export type { CommunEditorMedia }

const VIEWS: Record<string, any> = {
  callout: CalloutView,
  file: FileView,
  image: ImageView,
  embed: EmbedView,
  details: DetailsView,
  detailsSummary: DetailsSummaryView,
  detailsContent: DetailsContentView,
  imageUpload: UploadView,
}

/**
 * Browser entry: the shared extension set (@commun/editor) with the admin's
 * Vue node views attached.
 */
export function communExtensions(media: Partial<CommunEditorMedia> = {}) {
  return communSchemaExtensions(media).map((extension: any) => {
    const view = VIEWS[extension.name]
    return view
      ? extension.extend({ addNodeView: () => VueNodeViewRenderer(view) })
      : extension
  })
}
