<template>
  <section class="w-full">
    <button-secondary label="Inviter un membre" class="mb-6" @click="_openModalForm('create')" />
    <default-table
      v-if="!$route.params.event"
      :headers="TABLE_HEADERS"
      :filters="filters"
      :items="records"
      :actions="abilities"
      :pagination-size="limit"
      display-search-bar
      paginated-content
      @fetch-more="_fetchMore"
      @update="_openModalForm('update', $event)"
      @remove="_handle('remove', $event)"
    />
  </section>
</template>

<script setup>
import buttonSecondary from '~/components/elements/buttons/secondary'
import defaultTable from '~/components/data/lists/data-lists-table'
import { useModalStore } from '~/store/layout/modal'
import { useNotificationsStore } from '~/store/layout/notifications'


definePageMeta({
  permissions: ['manage:all'],
  preFetch: ['User'],
  headings: {
    title: 'Membres',
    description: 'Retrouvez & managez ici toutes les membres de la plateforme.'
  }
})

const { User } = useModels()
const $route = useRoute()
const $modalStore = useModalStore()
const notificationsStore = useNotificationsStore()
const { public: { baseURL } } = useRuntimeConfig()

// Prepare constants
const TABLE_HEADERS = [
  {
    nestedValue: false,
    componentOptions: {
      titleKey: 'fullName',
      descriptionKey: 'emailAddress',
    },
    component: 'data-summary'
  },
  {
    title: 'Rôle',
    property: 'role',
    component: 'data-text'
  },
  {
    component: "data-spacer",
    grow: true
  },
  {
    component: 'actions',
    componentOptions: {
      options: [{ label: 'Voir', action: 'read' }, { label: 'Modifier', action: 'update' }, { label: 'Supprimer', action: 'remove' }]
    }
  },
]

// Prepare reactive data
const limit = ref(25)

// Prepare computed
const records = computed(() => User.repo.all())
const filters = computed(() => [])
const abilities = computed(() => ['update', 'remove'])

// Prepare methods
const _fetchMore = async (skip = 0) => {
  await User.list(undefined, undefined, { skip, limit: limit.value })
}

// Prepare methods
const _handle = async (action, data = {}) => {
  const { _id } = data
  switch (action) {
    case 'create': {
      // Flux Commun : une INVITATION est émise ; tant que l'envoi de mails
      // n'est pas porté (tâche 9.9), le lien est copié au presse-papier.
      const { token } = await User.create(data)
      const link = `${baseURL}/welcome/${token}`
      try {
        await navigator.clipboard.writeText(link)
        notificationsStore.add({
          icon: 'iconoir:mail-out',
          type: 'success',
          title: 'Lien d\'invitation copié dans le presse-papier (valable 7 jours).'
        })
      } catch {
        console.log('Lien d\'invitation :', link)
        notificationsStore.add({
          icon: 'iconoir:mail-out',
          type: 'success',
          title: 'Invitation créée — lien affiché dans la console (valable 7 jours).'
        })
      }
      await User.list()
      break
    }
    case 'update':
      await User.update(_id, data)
      break
    case 'remove':
      await User.remove(data._id)
      break
    default:
      throw new Error('E_UNHANDLED')
  }
}

const _openModalForm = (action, record) => {
  $modalStore.open({
    onSubmit: async (data) => _handle(action, data),
    details: {
      title: `${action === 'create' ? 'Inviter' : 'Modifier'} un membre`,
      subTitle: action === 'create'
        ? 'Un lien d\'invitation sera généré pour ce nouveau membre.'
        : 'Modifiez les informations du membre.',
      acceptButton: `${action === 'create' ? 'Inviter' : 'Modifier'}`,
      closeButton: 'Annuler'
    },
    attributes: action === 'create'
      ? [
          {
            property: 'emailAddress',
            componentOptions: {
              label: 'Adresse mail',
              name: 'emailAddress'
            },
            component: 'input-text'
          },
          {
            property: 'role',
            componentOptions: {
              label: 'Rôle',
              name: 'role',
              items: ['admin', 'redacteur'],
              object: false
            },
            component: 'select-enum'
          }
        ]
      : [
          {
            property: 'firstName',
            componentOptions: {
              label: 'Nom d\'affichage',
              name: 'firstName'
            },
            component: 'input-text'
          },
          {
            property: 'role',
            componentOptions: {
              label: 'Rôle',
              name: 'role',
              items: ['admin', 'redacteur'],
              object: false
            },
            component: 'select-enum'
          }
        ],
    record
  })
}
</script>
