/**
 * Iso legacy `PoulpusRecordClient.transformWYSIWYG` : enveloppe un texte brut
 * dans un document TipTap minimal. Le legacy stringifiait le doc (stockage
 * Mongo) ; le modèle Commun stocke le rich-text en JSON — on retourne l'objet.
 */
export function transformWysiwyg(text: unknown): Record<string, unknown> {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { textAlign: 'left' },
        content: [{ type: 'text', text }],
      },
    ],
  };
}
