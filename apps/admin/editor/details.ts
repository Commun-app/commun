import {
  Details as TiptapDetails,
  DetailsSummary as TiptapDetailsSummary,
  DetailsContent as TiptapDetailsContent,
} from '@tiptap/extension-details'

/**
 * Accordéon — les extensions Details OFFICIELLES, passées MIT avec TipTap 3
 * (elles étaient TipTap Pro à l'époque de @poulpus/prose). On reproduit le
 * geste exact de prose : `Details.extend` avec un attr `toggle` qui REMPLACE
 * l'attr `open` du composant (les 523 accordéons en base — grigny, dont 246
 * imbriqués — ne portent que `toggle`).
 *
 * Contrat JSON vérifié sur les données :
 * - details       : attrs { toggle } (booléen, défaut true)
 * - detailsSummary: contenu texte, aucun attr
 * - detailsContent: contenu `block+` (files, listes, callouts… et details
 *   imbriqués), aucun attr
 *
 * Les node views Vue s'attachent dans index.ts (l'état ouvert/replié y est
 * un état d'ÉDITION local, jamais écrit dans le document — D9).
 */
export const Details = TiptapDetails.extend({
  addAttributes() {
    // REMPLACE les attrs du parent : l'attr `open` (persistance d'état
    // d'ouverture) n'existe pas dans nos données, exactement comme prose.
    return {
      toggle: { default: true },
    }
  },
})

export const DetailsSummary = TiptapDetailsSummary
export const DetailsContent = TiptapDetailsContent
