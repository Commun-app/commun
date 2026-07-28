/**
 * Configuration ot-pertuis de jobs.feature — extrait FIDÈLE du mapping du
 * pipeline APIDAE 0 de production (dump `.dump`). Le jeu de données servi par
 * le mock vit dans `objets.json` : PLACEHOLDER réaliste à remplacer par une
 * capture réelle de `list-objets-touristiques` (curl ot-pertuis, à fournir).
 */

/** ObjectId Mongo de la collection legacy — la config injector référence ça. */
export const APIDAE_LEGACY_COLLECTION_ID = '6477737e1548ddf04ff95042';

/** Définition migrée correspondante (types produits par la CLI de migration). */
export const APIDAE_DEFINITION = {
  name: 'Agenda APIDAE',
  slug: 'agenda-apidae',
  fields: [
    { name: 'apidaeId', label: 'apidaeId', type: 'text', required: false, hidden: true },
    { name: 'description', label: 'Description', type: 'text', required: false, hidden: false },
    { name: 'content', label: 'Contenu', type: 'rich-text', required: false, hidden: false },
    { name: 'location', label: 'Localisation', type: 'json', required: false, hidden: false },
    { name: 'email', label: 'Email', type: 'text', required: false, hidden: false },
    { name: 'phone', label: 'Téléphone', type: 'text', required: false, hidden: false },
    { name: 'services', label: 'Services', type: 'json', required: false, hidden: false },
    { name: 'schedules', label: 'Horaires', type: 'json', required: false, hidden: false },
    { name: 'cover', label: 'Couverture', type: 'media', required: false, hidden: false },
  ],
} as const;

const OT_PERTUIS_MAPPING = {
  apidaeId: { source: 'id' },
  title: { source: 'nom.libelleFr' },
  description: { source: 'presentation.descriptifCourt.libelleFr' },
  content: { source: 'presentation.descriptifDetaille.libelleFr' },
  'location.address': {
    transform: {
      $concat: [
        { source: 'localisation.adresse.adresse1' },
        { source: 'localisation.adresse.adresse2' },
        { source: 'localisation.adresse.commune.codePostal' },
        { source: 'localisation.adresse.commune.nom' },
      ],
    },
  },
  'location.coordinates': { source: 'localisation.geolocalisation.geoJson.coordinates' },
  email: {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: { $arrayFilters: [{ '$communication.type.id': { $eq: 204 } }] },
  },
  phone: {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: { $arrayFilters: [{ '$communication.type.id': { $eq: 201 } }] },
  },
  services: {
    source: 'prestations.services.$[service]',
    transform: { $mapping: [{ '$service.id': true, '$service.libelleFr': true }] },
  },
  schedules: { source: 'ouverture', transform: { '@apidaeSchedules': true } },
  cover: { source: 'illustrations', transform: { '@apidaeMedia': true } },
};

/** Config `organization.legacyExtra.injector` iso production (+ pipeline airtable ignoré). */
export const APIDAE_INJECTOR = {
  enable: true,
  pipelines: [
    {
      sort: 'apidae',
      unlink: true,
      credentials: { projectId: 'projet-e2e', apiKey: 'cle-e2e' },
      collection: APIDAE_LEGACY_COLLECTION_ID,
      mapping: OT_PERTUIS_MAPPING,
      selectionIds: [148923],
    },
    { sort: 'airtable', unlink: false },
  ],
};
