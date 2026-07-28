// Fixtures dérivées de vraies réponses APIDAE d'ot-pertuis (structure réelle
// de l'objet touristique + extrait du mapping de production) — aucune donnée
// personnelle, valeurs re-rédigées.
import type { MappingDictionary } from '../../src/index.ts';

/** Extrait fidèle du mapping du pipeline APIDAE 0 d'ot-pertuis. */
export const OT_PERTUIS_MAPPING: MappingDictionary = {
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

export const OBJET_FESTIVAL = {
  id: 5211547,
  nom: { libelleFr: 'Festival des Lavandes' },
  presentation: {
    descriptifCourt: { libelleFr: 'Un festival en plein air.' },
    descriptifDetaille: { libelleFr: 'Long texte\nsur deux lignes\nvoire trois' },
  },
  localisation: {
    adresse: {
      adresse1: 'Place du Marché',
      adresse2: '',
      commune: { codePostal: '84120', nom: 'Pertuis' },
    },
    geolocalisation: { geoJson: { coordinates: [5.5029, 43.6949] } },
  },
  informations: {
    moyensCommunication: [
      { type: { id: 201 }, coordonnees: { fr: '04 90 00 00 00' } },
      { type: { id: 204 }, coordonnees: { fr: 'contact@festival.example' } },
      { type: { id: 205 }, coordonnees: { fr: 'https://festival.example' } },
    ],
  },
  prestations: {
    services: [
      { id: 1234, libelleFr: 'Parking', autreChose: 'ignoré' },
      { id: 999, libelleFr: 'Accès PMR' },
    ],
  },
  ouverture: {
    periodeEnClair: { libelleFr: 'Tous les jours du 1er juillet au 31 août' },
    periodesOuvertures: [
      {
        dateDebut: '2026-07-01',
        dateFin: '2026-08-31',
        type: 'OUVERTURE_TOUS_LES_JOURS',
        horaireOuverture: '10:00',
        horaireFermeture: '19:00',
      },
    ],
  },
  illustrations: [
    {
      identifiant: 111,
      legende: { libelleFr: 'Header du festival' },
      traductionFichiers: [
        {
          locale: 'fr',
          url: 'https://media.apidae.example/111.jpg',
          extension: 'jpg',
          fileName: 'festival',
        },
      ],
    },
    {
      // Sans traduction fr : ignorée (le legacy levait une TypeError).
      identifiant: 222,
      traductionFichiers: [
        {
          locale: 'en',
          url: 'https://media.apidae.example/222.jpg',
          extension: 'jpg',
          fileName: 'en-only',
        },
      ],
    },
  ],
};

export const OBJET_MARCHE = {
  id: 5211999,
  nom: { libelleFr: 'Marché provençal' },
  presentation: {
    descriptifCourt: { libelleFr: 'Le marché du premier mardi du mois.' },
    descriptifDetaille: { libelleFr: 'Producteurs locaux.' },
  },
  localisation: {
    adresse: {
      adresse1: 'Cours de la République',
      commune: { codePostal: '84120', nom: 'Pertuis' },
    },
    geolocalisation: { geoJson: { coordinates: [5.5, 43.69] } },
  },
  informations: { moyensCommunication: [] },
  prestations: { services: [{ id: 1234, libelleFr: 'Parking' }] },
  ouverture: {
    periodeEnClair: { libelleFr: 'Le premier mardi du mois' },
    periodesOuvertures: [
      {
        dateDebut: '2026-01-01',
        dateFin: '2026-12-31',
        type: 'OUVERTURE_MOIS',
        ouverturesJourDuMois: [{ jourDuMois: 'D_1ER', jour: 'MARDI' }],
      },
    ],
  },
  illustrations: [],
};

/** Objet dont TOUTES les périodes sont finies depuis plus d'un mois. */
export const OBJET_EXPIRE = {
  id: 5210000,
  nom: { libelleFr: 'Fête votive 2024' },
  ouverture: {
    periodeEnClair: { libelleFr: 'Été 2024' },
    periodesOuvertures: [
      { dateDebut: '2024-07-01', dateFin: '2024-07-03', type: 'OUVERTURE_TOUS_LES_JOURS' },
    ],
  },
  illustrations: [],
};
