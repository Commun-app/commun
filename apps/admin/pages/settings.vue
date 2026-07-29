<template>
  <forms-layout
    v-bind="{ record, ...ORGANIZATION_FORM }"
    class="mt-4"
  />
</template>

<script setup>
import { useWorkspaceStore } from '~/store/layout/workspace'
import formsLayout from '~/components/forms/layouts/layout'

definePageMeta({
  permissions: ['manage:all'],
  preFetch: ['Organization'],
  headings: {
    title: 'Paramètres',
    description: 'Retrouvez ici tous les paramètres de l\'organisation.'
  }
})

const $workspaceStore = useWorkspaceStore()
const ORGANIZATION_FORM = ref({
  layout: [
    {
      icon: '',
      sections: [
        {
          componentOptions: {
            title: 'Logo de l\'organization',
            description: 'Cliquez sur votre logo pour ajouter une image depuis vos fichiers.',
            hint: 'Le logo est optionnel mais fortement recommandé.',
            attributes: [
              {
                property: 'logo',
                componentOptions: {
                  name: 'cover',
                  limit: 1,
                  label: 'Logo de l\'organization'
                },
                component: 'input-files-media'
              }
            ]
          },
          component: 'form-section-default'
        },
        {
          componentOptions: {
            title: 'Nom de l\'organization',
            description: 'Ces informations seront visibles publiquement, soyez donc attentif avec ce que vous partagerez.',
            hint: 'Merci de ne pas dépasser 128 charactères.',
            attributes: [
              {
                property: 'name',
                componentOptions: {
                  previewSlug: false,
                  editableSlug: false,
                  trim: true,
                  placeHolder: 'Nom de l\'organisation',
                  required: true
                },
                component: 'input-text'
              }
            ]
          },
          component: 'form-section-default'
        }
        // {
        //   componentOptions: {
        //     title: 'Localisation de l\'organization',
        //     description: 'Ces informations seront visibles publiquement, soyez donc attentif avec ce que vous partagerez.',
        //     attributes: [
        //       {
        //         property: 'location',
        //         componentOptions: {
        //           placeHolder: 'Localisation de l\'organisation',
        //           name: 'organization'
        //         },
        //         component: 'input-location'
        //       }
        //     ]
        //   },
        //   component: 'form-section-default'
        // }
      ],
      title: 'General'
    },
    {
      icon: '',
      sections: [
        {
          componentOptions: {
            title: 'Collections',
            description: 'Ces collections permettent de définir les différents jeux de données de l\'organisation.',
            hint: '🚦 Soyez vigilant lorsque vous modifiez ce champs.',
            attributes: [
              {
                property: 'collections',
                componentOptions: {},
                component: 'handler-collections'
              }
            ],
            noAction: true
          },
          component: 'form-section-default'
        }
      ],
      title: 'Collections'
    },
    {
      icon: '',
      sections: [
        {
          componentOptions: {
            title: 'Les thématiques',
            description: 'Vous pouvez modifier ici les thématiques de cette organisation.',
            attributes: [
              {
                componentOptions: {
                  collection: 'labels',
                  alwaysPublish: true
                },
                component: 'handler-records'
              }
            ],
            noAction: true
          },
          component: 'form-section-default'
        }
      ],
      title: 'Thématiques'
    },
    {
      icon: '',
      sections: [
        {
          componentOptions: {
            title: 'Deployment settings',
            description: 'Renseignez la définition du déploiement.',
            attributes: [
              {
                property: 'deployment',
                componentOptions: {
                  label: 'Paramètres de déploiement',
                  name: 'deployment'
                },
                component: 'input-json'
              }
            ]
          },
          component: 'form-section-default'
        },
        {
          componentOptions: {
            title: 'Tokens de déploiement',
            description: 'Ces tokens permettent d\'autres applications à accéder à un contenu restreint de cette organisation.Soyez attentif!',
            attributes: [
              {
                componentOptions: {},
                component: 'handler-tokens'
              }
            ],
            noAction: true
          },
          component: 'form-section-default'
        }
      ],
      title: 'Déploiement'
    },
    {
      icon: '',
      sections: [
        {
          componentOptions: {
            title: 'Configuration de l\'injecteur',
            description: 'Définissez les différentes pipelines de données ici',
            attributes: [
              {
                property: 'injector',
                componentOptions: {
                  label: 'Définition de l\'injecteur',
                  name: 'injector'
                },
                component: 'input-json'
              }
            ]
          },
          component: 'form-section-default'
        },
      ],
      title: 'Synchronisation des données'
    }
  ]
})

// Prepare computed
const record = computed(() => $workspaceStore.workspace)
</script>
