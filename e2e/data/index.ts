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
  'collection-select-sans-options': {
    name: 'Sans options',
    slug: 'sans-options',
    fields: [{ name: 'choix', label: 'Choix', type: 'select' }],
  },
  'organization-doublon': { name: 'Doublon', slug: 'doublon', type: 'commune' },
  // Valeurs INVALIDES par type de champ ($collectionId interpolé du scénario).
  'entree-booleen-invalide': {
    collectionId: '$collectionId',
    data: { title: 'Invalide', data: { flag: 'oui' } },
  },
  'entree-select-hors-options': {
    collectionId: '$collectionId',
    data: { title: 'Invalide', data: { choice: 'z' } },
  },
  'entree-champ-inconnu': {
    collectionId: '$collectionId',
    data: { title: 'Invalide', data: { inconnu: 'x' } },
  },

  // ── Cycle de vie complet (collection « dossiers ») ─────────────────────────
  'collection-dossiers': {
    name: 'Dossiers',
    slug: 'dossiers',
    fields: [{ name: 'body', label: 'Corps', type: 'text' }],
  },
  'entree-premier-dossier': {
    collectionId: 'dossiers',
    data: { title: 'Premier dossier', slug: 'premier-dossier', data: { body: 'Bonjour' } },
  },
  'entree-maj-body': { id: '$entryId', data: { data: { body: 'Texte corrigé' } } },
  'entree-suppression': { id: '$entryId' },
  'collection-suppression': { id: '$collectionId' },

  // ── Tous les types de champs (slugs distincts par scénario) ────────────────
  'collection-types-valides': {
    name: 'Types démo',
    slug: 'types-valides',
    fields: EVERY_FIELD_TYPE,
  },
  'collection-types-invalides': {
    name: 'Types démo',
    slug: 'types-invalides',
    fields: EVERY_FIELD_TYPE,
  },
  'entree-tous-types': {
    collectionId: '$collectionId',
    data: { title: 'Entrée typée', data: VALID_EVERY_TYPE },
  },

  // ── Slugs incrémentaux ─────────────────────────────────────────────────────
  'collection-notes': {
    name: 'Notes',
    slug: 'notes',
    fields: [{ name: 'body', label: 'Corps', type: 'text' }],
  },
  'entree-reunion': { collectionId: 'notes', data: { title: 'Réunion publique', data: {} } },

  // ── Liens libres entre entrées (onglet Relations, iso legacy `records[]`) ──
  'collection-liens': {
    name: 'Liens',
    slug: 'liens',
    fields: [{ name: 'body', label: 'Corps', type: 'text' }],
  },
  'entree-lien-source': { collectionId: 'liens', data: { title: 'Entrée source', data: {} } },
  'entree-lien-cible': { collectionId: 'liens', data: { title: 'Entrée cible', data: {} } },
  'entree-liaison-libre': { id: '$firstEntryId', data: { related: ['$secondEntryId'] } },

  // ── Évolution de schéma (collection « fiches ») ────────────────────────────
  'collection-fiches': { name: 'Fiches', slug: 'fiches', fields: FICHES_FIELDS.both },
  'entree-fiche-complete': {
    collectionId: 'fiches',
    data: {
      title: 'Fiche complète',
      status: 'published',
      data: { corps: 'le corps', note: 'la note' },
    },
  },
  'collection-fiches-sans-note': { id: '$collectionId', data: { fields: FICHES_FIELDS.corpsOnly } },
  'collection-fiches-avec-note': { id: '$collectionId', data: { fields: FICHES_FIELDS.both } },
  'entree-fiche-corps-corrige': { id: '$entryId', data: { data: { corps: 'corps corrigé' } } },

  // ── Pagination ─────────────────────────────────────────────────────────────
  'collection-annonces': {
    name: 'Annonces',
    slug: 'annonces',
    fields: [{ name: 'body', label: 'Corps', type: 'text' }],
  },

  // ── Cycle de vie éditorial (collection « arretes ») ────────────────────────
  'collection-arretes': {
    name: 'Arrêtés',
    slug: 'arretes',
    fields: [{ name: 'body', label: 'Corps', type: 'text' }],
  },
  'entree-premier-arrete': {
    collectionId: 'arretes',
    data: { title: 'Premier arrêté', slug: 'premier-arrete', data: { body: 'Bonjour' } },
  },
  'entree-statut-waiting': { id: '$entryId', data: { status: 'waiting' } },
  'entree-statut-ready': { id: '$entryId', data: { status: 'ready' } },
  'entree-publication': { id: '$entryId', data: { status: 'published' } },

  // ── Plan de déploiement (collection « communiques ») ───────────────────────
  'collection-communiques': {
    name: 'Communiqués',
    slug: 'communiques',
    fields: [{ name: 'body', label: 'Corps', type: 'text' }],
  },
  'entree-premier-communique': {
    collectionId: 'communiques',
    data: { title: 'Premier communiqué', slug: 'premier-communique', data: { body: 'Bonjour' } },
  },
};
