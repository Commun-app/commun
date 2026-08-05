import { VueNodeViewRenderer } from '@tiptap/vue-3'
import {
  communStarterKit,
  communSchemaExtensions,
  type CommunEditorMedia,
} from './schema.ts'
import { UID_TYPES } from './uid.ts'
import CalloutView from './views/CalloutView.vue'
import FileView from './views/FileView.vue'
import ImageView from './views/ImageView.vue'
import EmbedView from './views/EmbedView.vue'
import DetailsView from './views/DetailsView.vue'
import DetailsSummaryView from './views/DetailsSummaryView.vue'
import DetailsContentView from './views/DetailsContentView.vue'

export { communStarterKit, UID_TYPES }
export type { CommunEditorMedia }

/** Vues Vue par nom de nœud — attachées par-dessus l'assemblage de schema.ts. */
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
 * Point d'entrée NAVIGATEUR de l'éditeur : le jeu d'extensions de parité
 * (schema.ts) avec les node views Vue attachées. Le harnais et les tests
 * importent `schema.ts` directement — jamais ce fichier.
 */
export function communExtensions(media: Partial<CommunEditorMedia> = {}) {
  return communSchemaExtensions(media).map((extension: any) => {
    const view = VIEWS[extension.name]
    return view
      ? extension.extend({ addNodeView: () => VueNodeViewRenderer(view) })
      : extension
  })
}
