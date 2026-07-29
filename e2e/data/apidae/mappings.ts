// Mappings RÉELS des deux pipelines APIDAE d'ot-pertuis, extraits tels quels
// du dump de production (organization.injector.pipelines[0|2].mapping) — le
// portage doit produire les mêmes données que le legacy avec ces mappings.
// Fichier GÉNÉRÉ depuis le dump ; ne pas éditer à la main.
import type { MappingDictionary } from '../../../packages/apidae-sync/src/index.ts';

export const LIEUX_MAPPING: MappingDictionary = {
  apidaeData: {
    source: '.',
  },
  services: {
    source: 'prestations.services.$[service]',
    transform: {
      $mapping: [
        {
          '$service.id': true,
          '$service.libelleFr': true,
        },
      ],
    },
  },
  schedules: {
    source: 'ouverture',
    transform: {
      '@apidaeSchedules': true,
    },
  },
  content: {
    source: 'presentation.descriptifDetaille.libelleFr',
  },
  'location.address': {
    transform: {
      $concat: [
        {
          source: 'localisation.adresse.adresse1',
        },
        {
          source: 'localisation.adresse.adresse2',
        },
        {
          source: 'localisation.adresse.commune.codePostal',
        },
        {
          source: 'localisation.adresse.commune.nom',
        },
      ],
    },
  },
  equipments: {
    source: 'prestations.equipements.$[equipment]',
    transform: {
      $mapping: [
        {
          '$equipment.id': true,
          '$equipment.libelleFr': true,
        },
      ],
    },
  },
  paymentMethods: {
    source: 'descriptionTarif.modesPaiement.$[paymentMethod]',
    transform: {
      $mapping: [
        {
          '$paymentMethod.libelleFr': true,
          '$paymentMethod.id': true,
        },
      ],
    },
  },
  'location.coordinates': {
    source: 'localisation.geolocalisation.geoJson.coordinates',
  },
  'socials.twitter': {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: {
      $arrayFilters: [
        {
          '$communication.type.id': {
            $eq: 3755,
          },
        },
      ],
    },
  },
  languages: {
    source: 'prestations.languesParlees.$[language]',
    transform: {
      $mapping: [
        {
          '$language.libelleFr': true,
          '$language.id': true,
        },
      ],
    },
  },
  title: {
    source: 'nom.libelleFr',
  },
  phone: {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: {
      $arrayFilters: [
        {
          '$communication.type.id': {
            $eq: 201,
          },
        },
      ],
    },
  },
  description: {
    source: 'presentation.descriptifCourt.libelleFr',
  },
  'socials.facebook': {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: {
      $arrayFilters: [
        {
          '$communication.type.id': {
            $eq: 207,
          },
        },
      ],
    },
  },
  website: {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: {
      $arrayFilters: [
        {
          '$communication.type.id': {
            $eq: 205,
          },
        },
      ],
    },
  },
  apidaeId: {
    source: 'id',
  },
  cover: {
    source: 'illustrations',
    transform: {
      '@apidaeMedia': true,
    },
  },
  email: {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: {
      $arrayFilters: [
        {
          '$communication.type.id': {
            $eq: 204,
          },
        },
      ],
    },
  },
};

export const AGENDA_MAPPING: MappingDictionary = {
  apidaeData: {
    source: '.',
  },
  services: {
    source: 'prestations.services.$[service]',
    transform: {
      $mapping: [
        {
          '$service.libelleFr': true,
          '$service.id': true,
        },
      ],
    },
  },
  schedules: {
    source: 'ouverture',
    transform: {
      '@apidaeSchedules': true,
    },
  },
  content: {
    source: 'presentation.descriptifDetaille.libelleFr',
  },
  city: {
    source: 'localisation.adresse.commune.nom',
  },
  'location.address': {
    transform: {
      $concat: [
        {
          source: 'localisation.adresse.adresse1',
        },
        {
          source: 'localisation.adresse.adresse2',
        },
        {
          source: 'localisation.adresse.commune.codePostal',
        },
        {
          source: 'localisation.adresse.commune.nom',
        },
      ],
    },
  },
  equipments: {
    source: 'prestations.equipements.$[equipment]',
    transform: {
      $mapping: [
        {
          '$equipment.libelleFr': true,
          '$equipment.id': true,
        },
      ],
    },
  },
  paymentMethods: {
    source: 'descriptionTarif.modesPaiement.$[paymentMethod]',
    transform: {
      $mapping: [
        {
          '$paymentMethod.libelleFr': true,
          '$paymentMethod.id': true,
        },
      ],
    },
  },
  'location.coordinates': {
    source: 'localisation.geolocalisation.geoJson.coordinates',
  },
  'socials.twitter': {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: {
      $arrayFilters: [
        {
          '$communication.type.id': {
            $eq: 3755,
          },
        },
      ],
    },
  },
  languages: {
    source: 'prestations.languesParlees.$[language]',
    transform: {
      $mapping: [
        {
          '$language.libelleFr': true,
          '$language.id': true,
        },
      ],
    },
  },
  title: {
    source: 'nom.libelleFr',
  },
  phone: {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: {
      $arrayFilters: [
        {
          '$communication.type.id': {
            $eq: 201,
          },
        },
      ],
    },
  },
  description: {
    source: 'presentation.descriptifCourt.libelleFr',
  },
  'socials.facebook': {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: {
      $arrayFilters: [
        {
          '$communication.type.id': {
            $eq: 207,
          },
        },
      ],
    },
  },
  website: {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: {
      $arrayFilters: [
        {
          '$communication.type.id': {
            $eq: 205,
          },
        },
      ],
    },
  },
  apidaeId: {
    source: 'id',
  },
  cover: {
    source: 'illustrations',
    transform: {
      '@apidaeMedia': true,
    },
  },
  email: {
    source: 'informations.moyensCommunication.$[communication].[0].coordonnees.fr',
    transform: {
      $arrayFilters: [
        {
          '$communication.type.id': {
            $eq: 204,
          },
        },
      ],
    },
  },
};
