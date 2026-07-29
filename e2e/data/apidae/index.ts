import { AGENDA_MAPPING, LIEUX_MAPPING } from './mappings.ts';

/**
 * Configuration ot-pertuis de jobs.feature — ISO PRODUCTION : les deux
 * pipelines APIDAE réels avec leurs mappings extraits du dump (mappings.ts,
 * généré) et leurs ObjectId legacy. Seuls les credentials sont factices.
 *
 * Le jeu de données servi par le mock (`objets.json`, clé = selectionId) est
 * une CAPTURE RÉELLE de `list-objets-touristiques` (curl ot-pertuis 29/07),
 * curée pour rester stable dans le temps : objets `tousLesAns` (rebasés
 * chaque année, jamais expirés) + un événement 2018 expiré à jamais — aucun
 * objet à dates fixes récentes dont l'expiration ferait dériver les compteurs.
 */

export const LIEUX_LEGACY_ID = '6477737e1548ddf04ff95042';
export const AGENDA_LEGACY_ID = '64eb2461ff06e858d5404d16';

const BASE_FIELDS = [
  { name: 'apidaeId', label: 'apidaeId', type: 'text', required: false, hidden: true },
  { name: 'apidaeData', label: 'Objet APIDAE', type: 'json', required: false, hidden: true },
  { name: 'description', label: 'Description', type: 'text', required: false, hidden: false },
  { name: 'content', label: 'Contenu', type: 'rich-text', required: false, hidden: false },
  { name: 'location', label: 'Localisation', type: 'json', required: false, hidden: false },
  { name: 'email', label: 'Email', type: 'text', required: false, hidden: false },
  { name: 'phone', label: 'Téléphone', type: 'text', required: false, hidden: false },
  { name: 'website', label: 'Site web', type: 'text', required: false, hidden: false },
  { name: 'socials', label: 'Réseaux sociaux', type: 'json', required: false, hidden: false },
  { name: 'services', label: 'Services', type: 'json', required: false, hidden: false },
  { name: 'equipments', label: 'Équipements', type: 'json', required: false, hidden: false },
  {
    name: 'paymentMethods',
    label: 'Moyens de paiement',
    type: 'json',
    required: false,
    hidden: false,
  },
  { name: 'languages', label: 'Langues parlées', type: 'json', required: false, hidden: false },
  { name: 'schedules', label: 'Horaires', type: 'json', required: false, hidden: false },
  { name: 'cover', label: 'Couverture', type: 'media', required: false, hidden: false },
];

/** Définitions migrées correspondantes (types produits par la CLI de migration). */
export const APIDAE_DEFINITIONS = [
  {
    name: 'Lieux APIDAE',
    slug: 'lieux-apidae',
    legacyId: LIEUX_LEGACY_ID,
    fields: BASE_FIELDS,
  },
  {
    name: 'Agenda APIDAE',
    slug: 'agenda-apidae',
    legacyId: AGENDA_LEGACY_ID,
    fields: [
      ...BASE_FIELDS,
      { name: 'city', label: 'Commune', type: 'text', required: false, hidden: false },
    ],
  },
];

/** Config `organization.legacyExtra.injector` iso production (+ pipeline airtable ignoré). */
export const APIDAE_INJECTOR = {
  enable: true,
  pipelines: [
    {
      sort: 'apidae',
      unlink: true,
      credentials: { projectId: 'projet-e2e', apiKey: 'cle-e2e' },
      collection: LIEUX_LEGACY_ID,
      mapping: LIEUX_MAPPING,
      selectionIds: [148923],
    },
    { sort: 'airtable', unlink: false },
    {
      sort: 'apidae',
      unlink: true,
      credentials: { projectId: 'projet-e2e', apiKey: 'cle-e2e' },
      collection: AGENDA_LEGACY_ID,
      mapping: AGENDA_MAPPING,
      selectionIds: [146701],
    },
  ],
};
