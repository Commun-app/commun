import {
  Details as TiptapDetails,
  DetailsSummary as TiptapDetailsSummary,
  DetailsContent as TiptapDetailsContent,
} from '@tiptap/extension-details'

/**
 * Accordion trio on the official Details extensions. `toggle` REPLACES the
 * stock `open` attribute: stored documents only carry `toggle`. Node views
 * attach in index.ts; open state is editing state, never written to content.
 */
export const Details = TiptapDetails.extend({
  addAttributes() {
    return {
      toggle: { default: true },
    }
  },
})

export const DetailsSummary = TiptapDetailsSummary
export const DetailsContent = TiptapDetailsContent
