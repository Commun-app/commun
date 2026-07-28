/**
 * Données statiques de la suite E2E (revue PR #1, 28/07) — définitions de
 * collections, payloads nommés des steps génériques, valeurs d'initialisation.
 */

export const ORGANIZATION_INIT = {
  name: 'Commune E2E',
  slug: 'commune-e2e',
  type: 'commune',
} as const;

/** Définition « news » créée par le seed (plus de collections seedées en base). */
export const NEWS_DEFINITION = {
  name: 'Actualités',
  slug: 'news',
  fields: [{ name: 'body', label: 'Corps', type: 'text', required: false, hidden: false }],
} as const;

/** Collection exerçant CHAQUE type de champ (cms.feature). */
export const EVERY_FIELD_TYPE = [
  { name: 'txt', label: 'Texte', type: 'text' },
  { name: 'rich', label: 'Riche', type: 'rich-text' },
  { name: 'num', label: 'Nombre', type: 'number' },
  { name: 'flag', label: 'Booléen', type: 'boolean' },
  { name: 'day', label: 'Date', type: 'date' },
  { name: 'cover', label: 'Média', type: 'media' },
  { name: 'linked', label: 'Relation', type: 'relation', target: 'news' },
  { name: 'choice', label: 'Choix', type: 'select', options: ['a', 'b'] },
  { name: 'etapes', label: 'Étapes', type: 'steps' },
  { name: 'extra', label: 'JSON', type: 'json' },
];

export const VALID_EVERY_TYPE = {
  txt: 'bonjour',
  rich: { type: 'doc', content: [] },
  num: 42,
  flag: true,
  day: '2026-08-01',
  cover: 'media-id-quelconque',
  linked: [],
  choice: 'a',
  etapes: [{ titre: 'Étape 1', content: { type: 'doc' } }],
  extra: { clef: 1 },
};

/** Évolution de schéma (retrait/retour d'un champ). */
export const FICHES_FIELDS = {
  both: [
    { name: 'corps', label: 'Corps', type: 'text' },
    { name: 'note', label: 'Note', type: 'text' },
  ],
  corpsOnly: [{ name: 'corps', label: 'Corps', type: 'text' }],
};

/**
 * Payloads NOMMÉS des steps génériques (api.steps.ts) :
 *   Then calling procedure "collections.create" with payload "collection-interdite" fails with "FORBIDDEN"
 */
export const PAYLOADS: Record<string, unknown> = {
  'collection-interdite': {
    name: 'Interdit',
    slug: 'interdit',
    fields: [{ name: 'body', label: 'Corps', type: 'text' }],
  },
};
